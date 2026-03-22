"""
MolGraphIQ Backend — explainer.py
Gradient-based atom importance and RDKit SVG generation.
"""

import torch
import numpy as np
from rdkit import Chem
from rdkit.Chem.Draw import MolDraw2DSVG
from rdkit.Chem import rdDepictor


def compute_atom_importance(model, data, device, task_type: str) -> list:
    model.eval()

    x = data.x.clone().detach().requires_grad_(True).to(device)
    edge_index = data.edge_index.to(device)
    edge_attr = data.edge_attr.to(device)
    batch = data.batch.to(device)

    out, _, _ = model(x, edge_index, edge_attr, batch)

    # Use first task output
    if out.shape[-1] > 1:
        score = out[0, 0]
    else:
        score = out[0, 0] if out.dim() > 1 else out[0]

    score.backward()

    if x.grad is None:
        return [0.5] * x.size(0)

    importance = x.grad.abs().sum(dim=-1).detach().cpu().numpy()
    mn, mx = importance.min(), importance.max()
    if mx > mn:
        importance = (importance - mn) / (mx - mn)
    else:
        importance = np.ones_like(importance) * 0.5

    return importance.tolist()


def generate_svg(smiles: str, atom_importance: list, width: int = 500, height: int = 400) -> str:
    from rdkit.Chem.Draw import rdMolDraw2D

    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError(f"Invalid SMILES: {smiles}")

    rdDepictor.Compute2DCoords(mol)

    n_atoms = mol.GetNumAtoms()
    importances = list(atom_importance)[:n_atoms]
    while len(importances) < n_atoms:
        importances.append(0.0)

    highlight_atoms = list(range(n_atoms))
    atom_colors = {}
    atom_radii = {}
    for i, imp in enumerate(importances):
        r = float(imp)
        atom_colors[i] = (r, 1.0 - r, 1.0 - r)
        atom_radii[i] = 0.3 + 0.2 * r

    drawer = rdMolDraw2D.MolDraw2DSVG(width, height)
    drawer.drawOptions().addStereoAnnotation = False
    rdMolDraw2D.PrepareAndDrawMolecule(
        drawer, mol,
        highlightAtoms=highlight_atoms,
        highlightAtomColors=atom_colors,
        highlightAtomRadii=atom_radii)
    drawer.FinishDrawing()
    svg = drawer.GetDrawingText()

    # Replace whatever background colour RDKit emits with warm cream
    svg = svg.replace(
        "<rect style='opacity:1.0;fill:#FFFFFF",
        "<rect style='opacity:1.0;fill:#F4F0E4",
    )
    svg = svg.replace(
        "<rect style='opacity:1.0;fill:#0d1526",
        "<rect style='opacity:1.0;fill:#F4F0E4",
    )
    return svg


def explain(model, data, smiles: str, device, task_type: str) -> dict:
    """
    Full explainability pipeline.

    Args:
        model     : loaded MolGraphIQ model
        data      : PyG Data object for the molecule
        smiles    : SMILES string (for SVG generation)
        device    : torch device
        task_type : 'regression' or 'classification'

    Returns:
        { atom_importance: list[float], atom_symbols: list[str], svg: str }
    """
    importance = compute_atom_importance(model, data, device, task_type)
    svg = generate_svg(smiles, importance)

    from rdkit import Chem
    mol = Chem.MolFromSmiles(smiles)
    atom_symbols = [atom.GetSymbol() for atom in mol.GetAtoms()]

    return {
        "atom_importance": importance,
        "atom_symbols": atom_symbols,
        "svg": svg,
    }
