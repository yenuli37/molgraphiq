import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import LoadingSpinner from '../components/LoadingSpinner';
import MolecularBackground from '../components/MolecularBackground';
import { predictMolecule, explainMolecule, parseFile, BASE_URL } from '../api/api';

const DATASETS = [
    {
        value: 'esol',
        label: 'ESOL — Solubility',
        description: 'Water solubility (log mol/L)',
        taskType: 'regression',
        unit: 'log mol/L',
        hint: 'Predicts aqueous solubility, which is critical for drug absorption.',
    },
    {
        value: 'lipophilicity',
        label: 'Lipophilicity',
        description: 'Octanol-water distribution coefficient (logD at pH 7.4)',
        taskType: 'regression',
        unit: 'log D',
        hint: 'Measures lipophilicity (octanol/water partition), which impacts membrane permeability.',
    },
    {
        value: 'bace',
        label: 'BACE — Enzyme Inhibition',
        description: 'Beta-secretase 1 inhibitor (binary)',
        taskType: 'classification',
        unit: 'probability',
        direction: 'Higher probability = more likely BACE-1 inhibitor',
        hint: 'Predicts if the molecule inhibits BACE-1, a target in Alzheimer\'s research.',
    },
    {
        value: 'bbbp',
        label: 'BBBP — Blood-Brain Barrier',
        description: 'BBB permeability (binary)',
        taskType: 'classification',
        unit: 'probability',
        direction: 'Higher probability = more likely BBB permeable',
        hint: 'Predicts blood-brain barrier permeability, key for CNS drug design.',
    },
    {
        value: 'clintox',
        label: 'ClinTox — Clinical Toxicity',
        description: 'FDA clinical trial failure (binary)',
        taskType: 'classification',
        unit: 'probability',
        direction: 'Higher probability = more likely to fail clinical trials',
        hint: 'Predicts if a molecule has failed clinical trials for toxicity reasons.',
    },
    {
        value: 'hiv',
        label: 'HIV — Antiviral Activity',
        description: 'HIV replication inhibition (binary)',
        taskType: 'classification',
        unit: 'probability',
        direction: 'Higher probability = more likely to inhibit HIV',
        hint: 'Predicts ability to inhibit HIV replication for antiviral drug screening.',
    },
    {
        value: 'tox21',
        label: 'Tox21 — Toxicity Screening',
        description: '12 toxicity assays (multi-label)',
        taskType: 'classification',
        unit: 'probability',
        direction: 'Higher probability = more likely toxic',
        hint: 'Screens against 12 toxicity pathways from the Tox21 challenge.',
    },
];

function AtomImportanceChart({ importances, atom_symbols }) {
    if (!importances || importances.length === 0) return null;

    // Detect uniform values — gradient attribution unavailable
    const allEqual = importances.every((v) => Math.abs(v - importances[0]) < 1e-6);
    if (allEqual) {
        return (
            <div className="mt-4">
                <p className="text-xs font-semibold mb-2" style={{ color: '#F4F0E4' }}>
                    Atom Importance
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Gradient attribution unavailable
                </p>
            </div>
        );
    }

    const max = Math.max(...importances.map(Math.abs));

    return (
        <div className="mt-4">
            <p className="text-xs font-semibold mb-2" style={{ color: '#F4F0E4' }}>
                Atom Importance (Gradient)
            </p>
            <div className="flex flex-col gap-1.5">
                {importances.map((imp, idx) => {
                    const norm = max > 0 ? Math.abs(imp) / max : 0;
                    return (
                        <div key={idx} className="flex items-center gap-3">
                            <span className="text-xs text-muted w-14 flex-shrink-0">
                                {atom_symbols?.[idx] ? `${atom_symbols[idx]}:${idx + 1}` : `Atom ${idx + 1}`}
                            </span>
                            <div
                                className="flex-1 rounded-full overflow-hidden"
                                style={{ height: 6, background: 'rgba(255,255,255,0.06)' }}
                            >
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${norm * 100}%` }}
                                    transition={{ duration: 0.6, delay: idx * 0.04, ease: 'easeOut' }}
                                    style={{
                                        height: '100%',
                                        borderRadius: 9999,
                                        background: `linear-gradient(90deg, #44A194, ${norm > 0.7 ? '#EC8F8D' : '#537D96'})`,
                                    }}
                                />
                            </div>
                            <span className="text-xs text-muted w-10 text-right">
                                {(imp * 100).toFixed(0)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ConfidenceBadge({ confidence }) {
    const pct = Math.round((confidence ?? 0) * 100);
    const color = pct > 70 ? '#22c55e' : pct > 40 ? '#f59e0b' : '#ef4444';
    return (
        <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}
        >
            <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: color, boxShadow: `0 0 6px ${color}` }}
            />
            {pct}% Confidence
        </span>
    );
}

export default function Predict() {
    const [smiles, setSmiles] = useState('');
    const [dataset, setDataset] = useState(DATASETS[0].value);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState(null);

    const selectedDataset = DATASETS.find((d) => d.value === dataset);

    const handlePredict = async () => {
        if (!smiles.trim()) {
            setError('Please enter a SMILES string.');
            return;
        }
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const [prediction, explanation] = await Promise.all([
                predictMolecule(smiles.trim(), dataset),
                explainMolecule(smiles.trim(), dataset),
            ]);
            setResults({ prediction, explanation });
        } catch (err) {
            const msg =
                err.response?.data?.detail ||
                err.message ||
                'Failed to reach MolGraphIQ backend. Make sure the FastAPI server is running at localhost:8000.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const [fileUploadState, setFileUploadState] = useState(null); // null | 'loading' | filename string
    const [fileError, setFileError] = useState(null);

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileError(null);
        setFileUploadState('loading');
        try {
            const content = await file.text();
            const { smiles: parsed } = await parseFile(file.name, content);
            setSmiles(parsed);
            setFileUploadState(file.name);
        } catch (err) {
            const msg =
                err.response?.data?.detail ||
                err.message ||
                'Could not parse file.';
            setFileError(msg);
            setFileUploadState(null);
        }
        // Reset input so same file can be re-uploaded
        e.target.value = '';
    };

    const [pubchemCID, setPubchemCID] = useState('');
    const [pubchemLoading, setPubchemLoading] = useState(false);
    const [pubchemError, setPubchemError] = useState(null);

    const fetchPubChem = async () => {
        if (!pubchemCID.trim()) return;
        setPubchemLoading(true);
        setPubchemError(null);
        try {
            const response = await fetch(`${BASE_URL}/pubchem/${pubchemCID.trim()}`);
            if (!response.ok) throw new Error('CID not found');
            const data = await response.json();
            if (!data.smiles) throw new Error('Could not extract SMILES');
            setSmiles(data.smiles);
            setResults(null);
            setError(null);
        } catch (err) {
            setPubchemError(err.message || 'Failed to fetch from PubChem');
        } finally {
            setPubchemLoading(false);
        }
    };

    const downloadCSV = () => {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `molgraphiq_${dataset}_${timestamp}.csv`;

        const atomRows = results.explanation?.atom_importance?.map((imp, idx) => {
            const symbol = results.explanation?.atom_symbols?.[idx] || `Atom${idx + 1}`;
            return `${symbol}:${idx + 1},${(imp * 100).toFixed(1)}%`;
        }).join('\n') || '';

        const content = [
            'MolGraphIQ Prediction Results',
            `SMILES,${smiles}`,
            `Property,${selectedDataset?.label}`,
            `Prediction,${results.prediction?.prediction}`,
            `Unit,${selectedDataset?.unit}`,
            `Uncertainty,±${results.prediction?.uncertainty}`,
            results.prediction?.confidence ? `Confidence,${(results.prediction.confidence * 100).toFixed(1)}%` : '',
            results.prediction?.label ? `Label,${results.prediction.label}` : '',
            '',
            'Atom,Importance',
            atomRows,
        ].filter(Boolean).join('\n');

        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatPrediction = (val, taskType, unit) => {
        if (taskType === 'classification') {
            return `${(val * 100).toFixed(1)}% (${unit})`;
        }
        return `${val?.toFixed ? val.toFixed(3) : val} ${unit}`;
    };

    return (
        <div className="relative min-h-screen" style={{ background: '#061E29' }}>
            <MolecularBackground />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(68, 161, 148,0.04) 0%, transparent 70%)',
                    zIndex: 1,
                }}
            />

            <div className="relative z-10 max-w-4xl mx-auto px-6 pt-32 pb-20">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-10"
                >
                    <h1 className="text-3xl font-bold mb-2">
                        <span
                            style={{
                                background: 'linear-gradient(90deg, #F4F0E4 0%, #44A194 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            Molecular Prediction
                        </span>
                    </h1>
                    <p className="text-muted text-sm">
                        Enter a SMILES string and select a dataset to predict molecular properties.
                    </p>
                </motion.div>

                {/* How to Use */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.03 }}
                    className="mb-6"
                >
                    {/* Trigger row */}
                    <button
                        onClick={() => setGuideOpen((o) => !o)}
                        className="flex items-center gap-2 w-full text-left px-4 py-3 rounded-xl transition-all duration-200"
                        style={{
                            background: guideOpen ? 'rgba(68,161,148,0.10)' : 'rgba(68,161,148,0.05)',
                            border: '1px solid rgba(68,161,148,0.22)',
                            cursor: 'pointer',
                        }}
                    >
                        <span
                            className="text-xs font-black w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0"
                            style={{ background: 'rgba(68,161,148,0.18)', color: '#44A194', border: '1px solid rgba(68,161,148,0.35)' }}
                        >
                            ?
                        </span>
                        <span className="text-xs font-semibold" style={{ color: '#44A194' }}>How to Use MolGraphIQ</span>
                        <span
                            className="ml-auto text-xs transition-transform duration-300"
                            style={{ color: 'rgba(68,161,148,0.6)', transform: guideOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}
                        >
                            &#9660;
                        </span>
                    </button>

                    {/* Collapsible body */}
                    <div
                        style={{
                            overflow: 'hidden',
                            maxHeight: guideOpen ? '1200px' : '0px',
                            transition: 'max-height 0.4s cubic-bezier(0.22,1,0.36,1)',
                        }}
                    >
                        <div
                            className="rounded-xl mt-1 px-5 py-5 text-xs leading-relaxed"
                            style={{
                                background: 'rgba(68,161,148,0.04)',
                                border: '1px solid rgba(68,161,148,0.15)',
                                borderTop: 'none',
                                borderRadius: '0 0 12px 12px',
                                color: 'rgba(244,240,228,0.65)',
                            }}
                        >
                            {/* Section 1 */}
                            <p className="font-semibold mb-2" style={{ color: '#F4F0E4' }}>1. Input Methods</p>
                            <p className="mb-1">You can input a molecule in three ways:</p>
                            <ul className="mb-4 space-y-2 pl-1">
                                <li><span style={{ color: '#44A194' }}>SMILES String</span> — paste a molecular SMILES string directly.
                                    Example: <code className="font-mono" style={{ background: 'rgba(255,255,255,0.06)', padding: '0 4px', borderRadius: 3 }}>CC(=O)Oc1ccccc1C(=O)O</code> for Aspirin.
                                    Use the quick example buttons below the input for common molecules.</li>
                                <li><span style={{ color: '#44A194' }}>PubChem CID</span> — enter the numeric PubChem identifier.
                                    Example: <code className="font-mono" style={{ background: 'rgba(255,255,255,0.06)', padding: '0 4px', borderRadius: 3 }}>2244</code> for Aspirin.
                                    Find CIDs at <span style={{ color: 'rgba(255,255,255,0.45)' }}>pubchem.ncbi.nlm.nih.gov</span>.</li>
                                <li><span style={{ color: '#44A194' }}>File Upload</span> — upload a <code className="font-mono" style={{ background: 'rgba(255,255,255,0.06)', padding: '0 4px', borderRadius: 3 }}>.mol</code> or <code className="font-mono" style={{ background: 'rgba(255,255,255,0.06)', padding: '0 4px', borderRadius: 3 }}>.sdf</code> file exported from chemistry software like ChemDraw or MarvinSketch.</li>
                            </ul>

                            <div className="divider-cyan my-3" />

                            {/* Section 2 */}
                            <p className="font-semibold mb-2" style={{ color: '#F4F0E4' }}>2. Selecting a Property</p>
                            <p className="mb-1">Choose which molecular property to predict from the dropdown:</p>
                            <ul className="mb-4 space-y-1 pl-1">
                                {[
                                    ['ESOL', 'Aqueous solubility (log mol/L). Lower = less soluble.'],
                                    ['Lipophilicity', 'logD at pH 7.4. Higher = more lipophilic.'],
                                    ['BACE', 'Probability of inhibiting BACE-1 enzyme (Alzheimer target).'],
                                    ['BBBP', 'Probability of crossing the blood-brain barrier.'],
                                    ['ClinTox', 'Probability of clinical trial failure due to toxicity.'],
                                    ['HIV', 'Probability of inhibiting HIV replication.'],
                                    ['Tox21', 'Probability of toxicity across 12 assay pathways.'],
                                ].map(([name, desc]) => (
                                    <li key={name}>
                                        <span style={{ color: '#44A194' }}>{name}</span>: {desc}
                                    </li>
                                ))}
                            </ul>

                            <div className="divider-cyan my-3" />

                            {/* Section 3 */}
                            <p className="font-semibold mb-2" style={{ color: '#F4F0E4' }}>3. Understanding Results</p>
                            <p className="mb-1">After clicking Predict Property:</p>
                            <ul className="mb-4 space-y-1 pl-1">
                                <li><span style={{ color: '#44A194' }}>Prediction value</span>: the model's output for the selected property.</li>
                                <li><span style={{ color: '#44A194' }}>Uncertainty</span>: MC Dropout uncertainty across 20 forward passes. Lower uncertainty means the model is more confident.</li>
                                <li><span style={{ color: '#44A194' }}>Atom importance</span>: shows which atoms influenced the prediction most. Red atoms = high importance, lighter = lower importance. Numbers match between the molecule visualization and the bar chart.</li>
                            </ul>

                            <div className="divider-cyan my-3" />

                            {/* Section 4 */}
                            <p className="font-semibold mb-2" style={{ color: '#F4F0E4' }}>4. What is SMILES?</p>
                            <p className="mb-2">SMILES (Simplified Molecular Input Line Entry System) is a text representation of a molecule.</p>
                            <table className="w-full text-xs mb-2" style={{ borderCollapse: 'separate', borderSpacing: '0 2px' }}>
                                <tbody>
                                    {[
                                        ['c1ccccc1', 'Benzene'],
                                        ['CC(=O)O', 'Acetic acid'],
                                        ['CC(=O)Oc1ccccc1C(=O)O', 'Aspirin'],
                                    ].map(([smi, name]) => (
                                        <tr key={smi}>
                                            <td className="pr-4 font-mono" style={{ color: '#44A194', background: 'rgba(68,161,148,0.06)', padding: '2px 8px', borderRadius: 4 }}>{smi}</td>
                                            <td className="pl-3" style={{ color: 'rgba(244,240,228,0.5)' }}>{name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p style={{ color: 'rgba(255,255,255,0.35)' }}>You can get SMILES from PubChem, ChemSpider, or chemistry drawing tools like ChemDraw.</p>
                        </div>
                    </div>
                </motion.div>

                {/* Input Card */}
                <motion.div
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.05 }}
                >
                    <GlassCard className="p-6 mb-6" glow>
                        {/* SMILES Input */}
                        <label className="block text-xs font-semibold mb-2" style={{ color: '#F4F0E4' }}>
                            SMILES String
                        </label>
                        <div className="relative mb-5">
                            <textarea
                                className="input-glass resize-none font-mono text-sm"
                                rows={3}
                                placeholder="e.g. c1ccccc1  •  CC(=O)Oc1ccccc1C(=O)O  •  CN1C=NC2=C1C(=O)N(C(=O)N2C)C"
                                value={smiles}
                                onChange={(e) => setSmiles(e.target.value)}
                                spellCheck={false}
                            />
                            {smiles && (
                                <button
                                    onClick={() => setSmiles('')}
                                    className="absolute top-2 right-2 text-xs text-muted hover:text-white transition-colors"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        {/* File upload */}
                        <div className="mb-5">
                            <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(244,240,228,0.55)' }}>
                                Or upload a molecule file
                                <span className="ml-1 font-normal" style={{ color: 'rgba(255,255,255,0.28)' }}>(.sdf, .mol)</span>
                            </p>
                            <label
                                className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200"
                                style={{
                                    background: 'rgba(68,161,148,0.05)',
                                    border: '1px dashed rgba(68,161,148,0.30)',
                                    color: '#44A194',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(68,161,148,0.10)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(68,161,148,0.05)'; }}
                            >
                                <span className="text-xs font-black px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(68,161,148,0.12)', border: '1px solid rgba(68,161,148,0.25)', letterSpacing: '0.05em' }}>
                                    MOL
                                </span>
                                <span className="text-xs">
                                    {fileUploadState === 'loading'
                                        ? 'Parsing file…'
                                        : fileUploadState
                                            ? <span style={{ color: '#F4F0E4' }}>{fileUploadState} — SMILES populated</span>
                                            : 'Choose file or drag and drop'}
                                </span>
                                <input
                                    type="file"
                                    accept=".sdf,.mol"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={fileUploadState === 'loading'}
                                />
                            </label>
                            {fileError && (
                                <p className="text-xs mt-2 px-1" style={{ color: '#EC8F8D' }}>
                                    {fileError}
                                </p>
                            )}
                        </div>

                        {/* PubChem CID lookup */}
                        <div className="mb-5">
                            <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(244,240,228,0.55)' }}>
                                Or enter a PubChem CID
                                <span className="ml-1 font-normal" style={{ color: 'rgba(255,255,255,0.28)' }}>(e.g. 2244 for Aspirin)</span>
                            </p>
                            <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.22)' }}>
                                PubChem CID is the numeric identifier from pubchem.ncbi.nlm.nih.gov
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    className="input-glass text-sm flex-1"
                                    placeholder="e.g. 2244"
                                    value={pubchemCID}
                                    onChange={(e) => { setPubchemCID(e.target.value); setPubchemError(null); }}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchPubChem()}
                                    disabled={pubchemLoading}
                                    style={{ padding: '0.45rem 0.75rem' }}
                                />
                                <button
                                    onClick={fetchPubChem}
                                    disabled={pubchemLoading || !pubchemCID.trim()}
                                    className="text-xs px-4 py-2 rounded-lg font-semibold transition-all duration-200"
                                    style={{
                                        background: pubchemLoading || !pubchemCID.trim()
                                            ? 'rgba(68,161,148,0.08)'
                                            : 'rgba(68,161,148,0.18)',
                                        border: '1px solid rgba(68,161,148,0.30)',
                                        color: pubchemLoading || !pubchemCID.trim() ? 'rgba(68,161,148,0.45)' : '#44A194',
                                        cursor: pubchemLoading || !pubchemCID.trim() ? 'not-allowed' : 'pointer',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {pubchemLoading ? 'Fetching...' : 'Fetch'}
                                </button>
                            </div>
                            {pubchemError && (
                                <p className="text-xs mt-2 px-1" style={{ color: '#EC8F8D' }}>
                                    {pubchemError}
                                </p>
                            )}
                        </div>

                        {/* Quick examples */}
                        <div className="flex flex-wrap gap-2 mb-5">
                            <span className="text-xs text-muted">Quick examples:</span>
                            {[
                                { label: 'Benzene', val: 'c1ccccc1' },
                                { label: 'Aspirin', val: 'CC(=O)Oc1ccccc1C(=O)O' },
                                { label: 'Caffeine', val: 'CN1C=NC2=C1C(=O)N(C)C(=O)N2C' },
                                { label: 'Ibuprofen', val: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O' },
                            ].map(({ label, val }) => (
                                <button
                                    key={label}
                                    onClick={() => setSmiles(val)}
                                    className="text-xs px-3 py-1 rounded-full transition-all duration-200"
                                    style={{
                                        background: 'rgba(68, 161, 148,0.08)',
                                        border: '1px solid rgba(68, 161, 148,0.2)',
                                        color: '#44A194',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Property Selector */}
                        <label className="block text-xs font-semibold mb-2" style={{ color: '#F4F0E4' }}>
                            Property
                        </label>
                        <div className="relative mb-5">
                            <select
                                className="input-glass pr-10"
                                value={dataset}
                                onChange={(e) => { setDataset(e.target.value); setResults(null); setError(null); }}
                            >
                                {DATASETS.map((d) => (
                                    <option key={d.value} value={d.value} style={{ background: '#0d2d3d' }}>
                                        {d.label}
                                    </option>
                                ))}
                            </select>
                            <div
                                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                style={{ color: '#44A194' }}
                            >
                                ▾
                            </div>
                        </div>

                        {/* Dataset info */}
                        {selectedDataset && (
                            <div
                                className="rounded-lg px-4 py-3 text-xs mb-5"
                                style={{
                                    background: 'rgba(236, 143, 141, 0.07)',
                                    border: '1px solid rgba(236, 143, 141, 0.22)',
                                    color: 'rgba(244, 240, 228, 0.70)',
                                }}
                            >
                                <span style={{ color: '#EC8F8D' }}>ℹ</span>&nbsp; {selectedDataset.hint}
                            </div>
                        )}

                        {/* Predict Button */}
                        <button
                            className="btn-primary w-full text-sm py-3"
                            onClick={handlePredict}
                            disabled={loading}
                            style={{ opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? 'Running inference...' : 'Predict Property'}
                        </button>
                    </GlassCard>
                </motion.div>

                {/* Loading state */}
                <AnimatePresence>
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <GlassCard className="p-6">
                                <LoadingSpinner message="Running GNN forward pass + GNNExplainer..." />
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error state */}
                <AnimatePresence>
                    {error && !loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="rounded-xl p-4 mb-6 flex items-start gap-3"
                            style={{
                                background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.25)',
                            }}
                        >
                            <span className="text-red-400 text-sm font-bold">!</span>
                            <div>
                                <p className="text-red-400 text-sm font-semibold">Prediction Failed</p>
                                <p className="text-red-300 text-xs mt-1 opacity-80">{error}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Results Panel */}
                <AnimatePresence>
                    {results && !loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <GlassCard className="p-6" glow>
                                <div className="flex items-center gap-2 mb-5">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ background: '#44A194', boxShadow: '0 0 6px #44A194' }}
                                    />
                                    <h2 className="text-sm font-semibold" style={{ color: '#44A194' }}>
                                        Prediction Complete
                                    </h2>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Left: Molecule structure */}
                                    <div>
                                        <p className="text-xs font-semibold mb-3" style={{ color: '#F4F0E4' }}>
                                            Molecular Structure
                                        </p>
                                        {results.explanation?.svg ? (
                                            <div
                                                className="rounded-xl overflow-hidden flex items-center justify-center"
                                                style={{
                                                    background: '#F4F0E4',
                                                    border: '2px solid rgba(236, 143, 141, 0.40)',
                                                    boxShadow: '0 0 20px rgba(236, 143, 141, 0.12)',
                                                    minHeight: 180,
                                                    padding: 4,
                                                }}
                                                dangerouslySetInnerHTML={{ __html: results.explanation.svg }}
                                            />
                                        ) : (
                                            <div
                                                className="rounded-lg flex flex-col items-center justify-center"
                                                style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.07)',
                                                    minHeight: 180,
                                                }}
                                            >
                                                <div className="text-xs font-semibold text-muted mb-1">No structure available</div>
                                                <p className="text-xs text-muted">2D structure pending backend</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Prediction value */}
                                    <div>
                                        <p className="text-xs font-semibold mb-3" style={{ color: '#F4F0E4' }}>
                                            Result: {selectedDataset?.label}
                                        </p>
                                        <div
                                            className="rounded-xl p-4 mb-4"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(68,161,148,0.08) 0%, rgba(236,143,141,0.08) 100%)',
                                                border: '1px solid rgba(236, 143, 141, 0.25)',
                                            }}
                                        >
                                            {results.prediction?.task_type === 'regression' ? (
                                                <>
                                                    <p className="text-4xl font-black mb-1" style={{ color: '#F4F0E4' }}>
                                                        {results.prediction?.prediction !== undefined
                                                            ? formatPrediction(
                                                                results.prediction.prediction,
                                                                results.prediction.task_type,
                                                                selectedDataset?.unit,
                                                            )
                                                            : '—'}
                                                    </p>
                                                    {results.prediction?.uncertainty !== undefined && (
                                                        <p className="text-xs font-mono mb-1" style={{ color: '#44A194' }}>
                                                            &plusmn;{results.prediction.uncertainty.toFixed(4)} uncertainty
                                                            <span className="ml-1 text-muted">(MC Dropout, n=20)</span>
                                                        </p>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-4xl font-black mb-1" style={{ color: '#F4F0E4' }}>
                                                        {results.prediction?.prediction !== undefined
                                                            ? formatPrediction(
                                                                results.prediction.prediction,
                                                                results.prediction.task_type,
                                                                selectedDataset?.unit,
                                                            )
                                                            : '—'}
                                                    </p>
                                                    {selectedDataset?.direction && (
                                                        <p className="text-xs mt-1" style={{ color: 'rgba(68,161,148,0.85)' }}>
                                                            ↑ {selectedDataset.direction}
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                            <p className="text-xs text-muted">{selectedDataset?.description}</p>
                                        </div>

                                        {results.prediction?.task_type === 'classification' &&
                                            results.prediction?.confidence !== undefined && (
                                                <div className="mb-3">
                                                    <ConfidenceBadge confidence={results.prediction.confidence} />
                                                    {results.prediction?.uncertainty !== undefined && (
                                                        <p
                                                            className="text-xs font-mono mt-2"
                                                            style={{ color: '#44A194' }}
                                                        >
                                                            &plusmn;{results.prediction.uncertainty.toFixed(4)} uncertainty
                                                            <span className="ml-1 text-muted">(MC Dropout, n=20)</span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                        <div
                                            className="rounded-lg px-3 py-2 text-xs"
                                            style={{
                                                background: 'rgba(167,139,250,0.06)',
                                                border: '1px solid rgba(167,139,250,0.15)',
                                                color: 'rgba(255,255,255,0.5)',
                                            }}
                                        >
                                            {selectedDataset?.hint}
                                        </div>
                                    </div>
                                </div>

                                {/* Atom importance chart */}
                                {results.explanation?.atom_importance && (
                                    <>
                                        <div className="divider-cyan my-5" />
                                        <AtomImportanceChart
                                            importances={results.explanation.atom_importance}
                                            atom_symbols={results.explanation.atom_symbols}
                                        />
                                    </>
                                )}

                                {/* Download Results */}
                                <div className="divider-cyan mt-5 mb-4" />
                                <button
                                    onClick={downloadCSV}
                                    className="text-sm px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                                    style={{
                                        background: 'rgba(68,161,148,0.10)',
                                        border: '1px solid rgba(68,161,148,0.30)',
                                        color: '#44A194',
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(68,161,148,0.20)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(68,161,148,0.10)'; }}
                                >
                                    ⬇ Download Results (.csv)
                                </button>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
