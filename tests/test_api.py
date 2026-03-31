import pytest
import requests

BASE_URL = "https://molgraphiq-51609780733.us-central1.run.app"

ASPIRIN = "CC(=O)Oc1ccccc1C(=O)O"
BENZENE = "c1ccccc1"
INVALID = "INVALID_SMILES_XYZ"

# ── Health ──────────────────────────────────────────────
def test_health():
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

# ── Datasets ────────────────────────────────────────────
def test_datasets_returns_seven():
    r = requests.get(f"{BASE_URL}/datasets")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 7

def test_datasets_contains_esol():
    r = requests.get(f"{BASE_URL}/datasets")
    keys = [d["name"] for d in r.json()]
    assert "esol" in keys

# ── Predict ─────────────────────────────────────────────
def test_predict_esol_returns_prediction():
    r = requests.post(f"{BASE_URL}/predict",
        json={"smiles": ASPIRIN, "dataset": "esol"})
    assert r.status_code == 200
    data = r.json()
    assert "prediction" in data
    assert isinstance(data["prediction"], float)

def test_predict_bbbp_returns_probability():
    r = requests.post(f"{BASE_URL}/predict",
        json={"smiles": ASPIRIN, "dataset": "bbbp"})
    assert r.status_code == 200
    data = r.json()
    assert 0.0 <= data["prediction"] <= 1.0

def test_predict_returns_uncertainty():
    r = requests.post(f"{BASE_URL}/predict",
        json={"smiles": BENZENE, "dataset": "esol"})
    assert r.status_code == 200
    assert "uncertainty" in r.json()

def test_predict_all_seven_datasets():
    datasets = ["esol","lipophilicity","bace",
                "bbbp","clintox","hiv","tox21"]
    for ds in datasets:
        r = requests.post(f"{BASE_URL}/predict",
            json={"smiles": BENZENE, "dataset": ds})
        assert r.status_code == 200, f"Failed on {ds}"

def test_predict_invalid_smiles_returns_error():
    r = requests.post(f"{BASE_URL}/predict",
        json={"smiles": INVALID, "dataset": "esol"})
    assert r.status_code in [400, 422, 500]

def test_predict_missing_smiles_returns_error():
    r = requests.post(f"{BASE_URL}/predict",
        json={"dataset": "esol"})
    assert r.status_code in [400, 422]

# ── Explain ─────────────────────────────────────────────
def test_explain_returns_svg():
    r = requests.post(f"{BASE_URL}/explain",
        json={"smiles": BENZENE, "dataset": "esol"})
    assert r.status_code == 200
    data = r.json()
    assert "svg" in data

def test_explain_returns_atom_importance():
    r = requests.post(f"{BASE_URL}/explain",
        json={"smiles": ASPIRIN, "dataset": "esol"})
    assert r.status_code == 200
    data = r.json()
    assert "atom_importance" in data
    assert len(data["atom_importance"]) > 0

def test_explain_returns_atom_symbols():
    r = requests.post(f"{BASE_URL}/explain",
        json={"smiles": ASPIRIN, "dataset": "esol"})
    assert r.status_code == 200
    assert "atom_symbols" in r.json()

# ── PubChem ─────────────────────────────────────────────
def test_pubchem_aspirin():
    r = requests.get(f"{BASE_URL}/pubchem/2244")
    assert r.status_code == 200
    assert "smiles" in r.json()

def test_pubchem_invalid_cid():
    r = requests.get(f"{BASE_URL}/pubchem/999999999")
    assert r.status_code in [404, 422]

# ── Parse File ──────────────────────────────────────────
def test_parse_invalid_file_returns_error():
    r = requests.post(f"{BASE_URL}/parse-file",
        json={"filename": "test.mol", "content": "INVALID"})
    assert r.status_code in [400, 422, 500]

