"""
MolGraphIQ Backend — main.py
FastAPI app with all endpoints: /predict, /explain, /datasets, /health
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .predictor import ModelRegistry, DATASET_CONFIGS
from .explainer import explain

# ──────────────────────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────────────────────

# Models live in FYP/molgraphiq_models (sibling of this package)
_THIS_DIR = Path(__file__).parent
MODELS_DIR = _THIS_DIR.parent / "molgraphiq_models"

# ──────────────────────────────────────────────────────────────
# Global registry (loaded once at startup)
# ──────────────────────────────────────────────────────────────

registry = ModelRegistry(models_dir=str(MODELS_DIR), device="cpu")


def get_registry() -> ModelRegistry:
    """Lazily load all models on the first call."""
    if not registry.models:
        registry.load_all()
    return registry


# ──────────────────────────────────────────────────────────────
# FastAPI app
# ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="MolGraphIQ API",
    description="Knowledge-Augmented GNN inference for molecular property prediction.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────
# Request / Response schemas
# ──────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    smiles: str
    dataset: str


class PredictResponse(BaseModel):
    prediction: float
    task_type: str
    confidence: float | None
    unit: str
    label: str | None


class ExplainRequest(BaseModel):
    smiles: str
    dataset: str


class ExplainResponse(BaseModel):
    prediction: float
    svg: str
    atom_importance: list[float]
    atom_symbols: list[str]


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _validate_inputs(smiles: str, dataset: str):
    """Raise 422 if inputs are invalid."""
    if not smiles or not smiles.strip():
        raise HTTPException(status_code=422, detail="SMILES string cannot be empty.")

    if dataset not in DATASET_CONFIGS:
        valid = list(DATASET_CONFIGS.keys())
        raise HTTPException(
            status_code=422,
            detail=f"Unknown dataset '{dataset}'. Valid options: {valid}",
        )

    if dataset not in get_registry().models:
        raise HTTPException(
            status_code=503,
            detail=f"Model for dataset '{dataset}' is not loaded. Check server logs.",
        )

    # Validate SMILES via RDKit
    try:
        from rdkit import Chem
        mol = Chem.MolFromSmiles(smiles.strip())
        if mol is None:
            raise HTTPException(status_code=422, detail=f"Invalid SMILES string: '{smiles}'")
    except ImportError:
        pass  # RDKit not available — let featurizer handle it


# ──────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Server health check."""
    return {"status": "ok", "models_loaded": len(registry.models)}


@app.on_event("startup")
async def startup_event():
    pass  # Models are loaded lazily on first request


@app.post("/debug-explain")
def debug_explain(req: ExplainRequest):
    smiles = req.smiles.strip()
    dataset = req.dataset.strip().lower()

    try:
        from rdkit import Chem
        from deepchem.feat import MolGraphConvFeaturizer
        import torch

        # Step 1 - featurize
        feat = MolGraphConvFeaturizer(use_edges=True)
        mol = Chem.MolFromSmiles(smiles)
        g = feat._featurize(mol)
        x = torch.tensor(g.node_features, dtype=torch.float)
        ei = torch.tensor(g.edge_index, dtype=torch.long)
        ea = torch.tensor(g.edge_features, dtype=torch.float)
        batch = torch.zeros(x.size(0), dtype=torch.long)

        # Step 2 - get model
        model = registry.models[dataset]
        model.eval()

        # Step 3 - gradient importance
        x_grad = x.clone().detach().requires_grad_(True)
        out, _, _ = model(x_grad, ei, ea, batch)
        score = out[0, 0] if out.dim() > 1 else out[0]
        score.backward()

        importance = x_grad.grad.abs().sum(dim=-1).detach().cpu().numpy()
        mn, mx = importance.min(), importance.max()
        if mx > mn:
            importance = (importance - mn) / (mx - mn)

        return {
            "status": "ok",
            "n_atoms": int(x.shape[0]),
            "importance_sample": importance[:5].tolist(),
        }
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e),
                "traceback": traceback.format_exc()}




@app.get("/datasets")
def datasets():
    """Return metadata for all supported datasets."""
    result = []
    for name, cfg in DATASET_CONFIGS.items():
        result.append({
            "name": name,
            "label": cfg["label"],
            "description": cfg["description"],
            "task_type": cfg["task_type"],
            "unit": cfg["unit"],
            "hint": cfg["hint"],
        })
    return result


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """Run GNN forward pass and return molecular property prediction."""
    smiles = req.smiles.strip()
    dataset = req.dataset.strip().lower()
    _validate_inputs(smiles, dataset)

    try:
        result = get_registry().predict(smiles, dataset)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {e}")

    return PredictResponse(**result)


@app.post("/explain", response_model=ExplainResponse)
def explain_endpoint(req: ExplainRequest):
    """
    Run GNNExplainer and return:
    - prediction value
    - SVG molecule with atom importance highlighting
    - normalised atom importance list
    """
    smiles = req.smiles.strip()
    dataset = req.dataset.strip().lower()
    _validate_inputs(smiles, dataset)

    try:
        model, data = get_registry().get_model_and_data(smiles, dataset)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    task_type = DATASET_CONFIGS[dataset]["task_type"]

    try:
        result = explain(model, data, smiles, registry.device, task_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation error: {e}")

    # Also compute the prediction value
    try:
        pred_result = get_registry().predict(smiles, dataset)
    except Exception:
        pred_result = {"prediction": 0.0}

    return ExplainResponse(
        prediction=pred_result["prediction"],
        svg=result["svg"],
        atom_importance=result["atom_importance"],
        atom_symbols=result["atom_symbols"],
    )


# ──────────────────────────────────────────────────────────────
# Serve React frontend (only when dist/ exists after npm run build)
# ──────────────────────────────────────────────────────────────

dist_path = os.path.join(os.path.dirname(__file__), "..", "dist")
if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """SPA fallback — serve index.html for all non-API routes."""
        file_path = os.path.join(dist_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_path, "index.html"))


# ──────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "molgraphiq_api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
