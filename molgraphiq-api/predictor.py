"""
MolGraphIQ Backend — predictor.py
Loads all 7 trained models from .pt checkpoint files and provides inference.
"""

import torch
import numpy as np
from pathlib import Path
from typing import Optional
from torch_geometric.data import Data
from .model import MolGraphIQ

# ──────────────────────────────────────────────────────────────
# Dataset configuration
# ──────────────────────────────────────────────────────────────

DATASET_CONFIGS = {
    "esol": {
        "label": "ESOL — Solubility",
        "description": "Water solubility (log mol/L)",
        "task_type": "regression",
        "n_tasks": 1,
        "unit": "log mol/L",
        "hint": "Predicts aqueous solubility — critical for drug absorption.",
        "use_set_transformer": True,
    },
    "lipophilicity": {
        "label": "Lipophilicity",
        "description": "Octanol-water distribution (log D)",
        "task_type": "regression",
        "n_tasks": 1,
        "unit": "log D",
        "hint": "Measures lipophilicity — impacts membrane permeability.",
        "use_set_transformer": True,
    },
    "bace": {
        "label": "BACE — Enzyme Inhibition",
        "description": "Beta-secretase 1 inhibitor (binary)",
        "task_type": "classification",
        "n_tasks": 1,
        "unit": "probability",
        "hint": "Predicts inhibition of BACE-1, a target in Alzheimer's research.",
        "use_set_transformer": False,
    },
    "bbbp": {
        "label": "BBBP — Blood-Brain Barrier",
        "description": "BBB permeability (binary)",
        "task_type": "classification",
        "n_tasks": 1,
        "unit": "probability",
        "hint": "Predicts blood-brain barrier permeability — key for CNS drug design.",
        "use_set_transformer": False,
    },
    "clintox": {
        "label": "ClinTox — Clinical Toxicity",
        "description": "FDA clinical trial failure (binary, 2 tasks)",
        "task_type": "classification",
        "n_tasks": 2,
        "unit": "probability",
        "hint": "Predicts clinical trial failure for toxicity reasons (task 1 of 2).",
        "use_set_transformer": False,
    },
    "hiv": {
        "label": "HIV — Antiviral Activity",
        "description": "HIV replication inhibition (binary)",
        "task_type": "classification",
        "n_tasks": 1,
        "unit": "probability",
        "hint": "Predicts ability to inhibit HIV replication — antiviral drug screening.",
        "use_set_transformer": False,
    },
    "tox21": {
        "label": "Tox21 — Toxicity Screening",
        "description": "12 toxicity assays (multi-label)",
        "task_type": "classification",
        "n_tasks": 12,
        "unit": "probability",
        "hint": "Screens against 12 toxicity pathways from the Tox21 challenge (task 1 returned).",
        "use_set_transformer": False,
    },
}


def _get_deepchem_featurizer():
    """Lazy-import DeepChem featurizer."""
    try:
        from deepchem.feat import MolGraphConvFeaturizer
        return MolGraphConvFeaturizer(use_edges=True)
    except ImportError:
        return None


def smiles_to_pyg(smiles: str, featurizer=None) -> Data:
    """
    Convert a SMILES string to a PyTorch Geometric Data object.
    Uses DeepChem MolGraphConvFeaturizer (30 node features, 11 edge features).
    Falls back to manual RDKit featurization if DeepChem is unavailable.
    """
    if featurizer is not None:
        from rdkit import Chem
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            raise ValueError(f"Invalid SMILES: {smiles}")
        g = featurizer._featurize(mol)
        if g is None or g.node_features.shape[0] == 0:
            raise ValueError(f"Featurization failed for SMILES: {smiles}")
        x = torch.tensor(g.node_features, dtype=torch.float)
        edge_index = torch.tensor(g.edge_index, dtype=torch.long)
        edge_attr = torch.tensor(g.edge_features, dtype=torch.float)
        batch = torch.zeros(x.size(0), dtype=torch.long)
        return Data(x=x, edge_index=edge_index,
                    edge_attr=edge_attr, batch=batch)

    # Fallback: manual RDKit featurization (30-dim nodes, 11-dim edges)
    from rdkit import Chem
    from rdkit.Chem import rdchem
    HYBRIDIZATIONS = [
        rdchem.HybridizationType.S,
        rdchem.HybridizationType.SP,
        rdchem.HybridizationType.SP2,
        rdchem.HybridizationType.SP3,
        rdchem.HybridizationType.SP3D,
        rdchem.HybridizationType.SP3D2,
        rdchem.HybridizationType.OTHER,
    ]
    CHIRALTAGS = [rdchem.ChiralType.CHI_UNSPECIFIED,
                  rdchem.ChiralType.CHI_TETRAHEDRAL_CW,
                  rdchem.ChiralType.CHI_TETRAHEDRAL_CCW,
                  rdchem.ChiralType.CHI_OTHER]

    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError(f"Invalid SMILES: {smiles}")

    atom_feats = []
    for atom in mol.GetAtoms():
        h = [0.0] * len(HYBRIDIZATIONS)
        hyb_idx = HYBRIDIZATIONS.index(atom.GetHybridization()) if atom.GetHybridization() in HYBRIDIZATIONS else len(HYBRIDIZATIONS) - 1
        h[hyb_idx] = 1.0
        chiral = [0.0] * len(CHIRALTAGS)
        ct = atom.GetChiralTag()
        if ct in CHIRALTAGS:
            chiral[CHIRALTAGS.index(ct)] = 1.0
        feat = [
            float(atom.GetAtomicNum()),
            float(atom.GetTotalDegree()),
            float(atom.GetFormalCharge()),
            float(atom.GetTotalNumHs()),
            float(atom.GetNumImplicitHs()),
            float(atom.IsInRing()),
            float(atom.GetIsAromatic()),
        ] + h + chiral  # 7 + 7 + 4 = 18 ;  pad to 30
        feat = feat + [0.0] * (30 - len(feat))
        atom_feats.append(feat[:30])

    x = torch.tensor(atom_feats, dtype=torch.float)

    BOND_TYPES = [Chem.rdchem.BondType.SINGLE, Chem.rdchem.BondType.DOUBLE,
                  Chem.rdchem.BondType.TRIPLE, Chem.rdchem.BondType.AROMATIC]
    edge_list, edge_feats = [], []
    for bond in mol.GetBonds():
        bt_onehot = [float(bond.GetBondType() == bt) for bt in BOND_TYPES]
        ef = bt_onehot + [
            float(bond.GetIsConjugated()),
            float(bond.IsInRing()),
            float(bond.GetStereo() != Chem.rdchem.BondStereo.STEREONONE),
            0.0, 0.0, 0.0, 0.0,  # pad to 11
        ]
        ef = ef[:11]
        i, j = bond.GetBeginAtomIdx(), bond.GetEndAtomIdx()
        edge_list += [[i, j], [j, i]]
        edge_feats += [ef, ef]

    if not edge_list:
        edge_index = torch.zeros((2, 0), dtype=torch.long)
        edge_attr = torch.zeros((0, 11), dtype=torch.float)
    else:
        edge_index = torch.tensor(edge_list, dtype=torch.long).t().contiguous()
        edge_attr = torch.tensor(edge_feats, dtype=torch.float)

    batch = torch.zeros(x.size(0), dtype=torch.long)
    return Data(x=x, edge_index=edge_index, edge_attr=edge_attr, batch=batch)


# ──────────────────────────────────────────────────────────────
# ModelRegistry — loads and caches all 7 models
# ──────────────────────────────────────────────────────────────

class ModelRegistry:
    """Loads all MolGraphIQ models at startup and holds them in memory."""

    def __init__(self, models_dir: str, device: str = "cpu"):
        self.device = torch.device(device)
        self.models_dir = Path(models_dir)
        self.models: dict[str, MolGraphIQ] = {}
        self._featurizer = None

    def _build_model(self, name: str) -> MolGraphIQ:
        cfg = DATASET_CONFIGS[name]
        return MolGraphIQ(
            node_feat_dim=30,
            edge_feat_dim=11,
            hidden_dim=300,
            num_layers=5,
            n_tasks=cfg["n_tasks"],
            use_set_transformer=cfg["use_set_transformer"],
            use_auxiliary=True,
            num_fg=82,
            num_seeds=1,
            num_enc_blocks=2,
            num_dec_blocks=1,
            st_heads=4,
        )

    def load_all(self):
        """Load all 7 models. Called once at app startup."""
        print("[MolGraphIQ] Loading DeepChem featurizer…")
        self._featurizer = _get_deepchem_featurizer()
        if self._featurizer is None:
            print("[MolGraphIQ] ⚠  DeepChem not available — using fallback featurizer")

        for name in DATASET_CONFIGS:
            ckpt_path = self.models_dir / f"{name}_best.pt"
            if not ckpt_path.exists():
                print(f"[MolGraphIQ] ⚠  {ckpt_path} not found — skipping")
                continue
            try:
                model = self._build_model(name)
                state_dict = torch.load(ckpt_path, map_location=self.device, weights_only=True)
                model.load_state_dict(state_dict)
                model.to(self.device)
                model.eval()
                self.models[name] = model
                print(f"[MolGraphIQ] ✓  Loaded {name} ({DATASET_CONFIGS[name]['task_type']})")
            except Exception as e:
                print(f"[MolGraphIQ] ✗  Failed to load {name}: {e}")

    def predict(self, smiles: str, dataset: str) -> dict:
        """Run forward pass and return structured prediction result."""
        if dataset not in self.models:
            raise ValueError(f"Model for dataset '{dataset}' is not loaded.")

        model = self.models[dataset]
        cfg = DATASET_CONFIGS[dataset]

        data = smiles_to_pyg(smiles, self._featurizer).to(self.device)

        with torch.no_grad():
            logits, _aux, _repr = model(data.x, data.edge_index, data.edge_attr, data.batch)

        task_type = cfg["task_type"]

        if task_type == "regression":
            raw = float(logits[0, 0].item())
            return {
                "prediction": raw,
                "task_type": "regression",
                "confidence": None,
                "unit": cfg["unit"],
                "label": None,
            }
        else:
            # Classification — return first task probability
            prob = torch.sigmoid(logits[0, 0]).item()
            confidence = float(max(prob, 1.0 - prob))
            label = "Active" if prob >= 0.5 else "Inactive"
            return {
                "prediction": prob,
                "task_type": "classification",
                "confidence": confidence,
                "unit": "probability",
                "label": label,
            }

    def predict_with_uncertainty(self, smiles: str, dataset: str, n_passes: int = 20) -> dict:
        """Monte Carlo Dropout — run n stochastic forward passes to estimate uncertainty."""
        if dataset not in self.models:
            raise ValueError(f"Model not loaded: {dataset}")

        model = self.models[dataset]
        cfg = DATASET_CONFIGS[dataset]
        task_type = cfg["task_type"]

        data = smiles_to_pyg(smiles, self._featurizer).to(self.device)

        # Set model to TRAIN mode — this enables dropout
        model.train()

        predictions = []
        with torch.no_grad():
            for _ in range(n_passes):
                logits, _, _ = model(
                    data.x, data.edge_index,
                    data.edge_attr, data.batch)
                if task_type == "regression":
                    pred = float(logits[0, 0].item())
                else:
                    pred = float(torch.sigmoid(logits[0, 0]).item())
                predictions.append(pred)

        # Set back to eval mode
        model.eval()

        preds = np.array(predictions)
        mean_pred = float(np.mean(preds))
        uncertainty = float(np.std(preds))

        if task_type == "regression":
            return {
                "prediction": mean_pred,
                "uncertainty": round(uncertainty, 4),
                "task_type": "regression",
                "confidence": None,
                "unit": cfg["unit"],
                "label": None,
            }
        else:
            confidence = float(max(mean_pred, 1.0 - mean_pred))
            label = "Active" if mean_pred >= 0.5 else "Inactive"
            return {
                "prediction": mean_pred,
                "uncertainty": round(uncertainty, 4),
                "task_type": "classification",
                "confidence": confidence,
                "unit": "probability",
                "label": label,
            }

    def get_model_and_data(self, smiles: str, dataset: str):

        """
        Return (model, data) ready for GNNExplainer.
        Used by the /explain endpoint.
        """
        if dataset not in self.models:
            raise ValueError(f"Model for dataset '{dataset}' is not loaded.")
        model = self.models[dataset]
        data = smiles_to_pyg(smiles, self._featurizer).to(self.device)
        return model, data
