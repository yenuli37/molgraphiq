import axios from 'axios';

export const BASE_URL = 'https://molgraphiq-51609780733.us-central1.run.app';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

/**
 * Predict molecular property for a given SMILES and dataset.
 * @param {string} smiles
 * @param {string} dataset
 * @returns {Promise<{ prediction: number, task_type: string, confidence: number, unit: string }>}
 */
export const predictMolecule = async (smiles, dataset) => {
    const response = await api.post('/predict', { smiles, dataset });
    return response.data;
};

/**
 * Get GNNExplainer attribution for a given SMILES and dataset.
 * @param {string} smiles
 * @param {string} dataset
 * @returns {Promise<{ prediction: number, svg: string, atom_importance: number[] }>}
 */
export const explainMolecule = async (smiles, dataset) => {
    const response = await api.post('/explain', { smiles, dataset });
    return response.data;
};

/**
 * Fetch list of available datasets.
 * @returns {Promise<Array<{ name: string, description: string, task_type: string }>>}
 */
export const fetchDatasets = async () => {
    const response = await api.get('/datasets');
    return response.data;
};

/**
 * Parse a .mol/.sdf file and return its SMILES string.
 * @param {string} filename
 * @param {string} content  — raw text content of the file
 * @returns {Promise<{ smiles: string }>}
 */
export const parseFile = async (filename, content) => {
    const response = await api.post('/parse-file', { filename, content });
    return response.data;
};

