import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import MolecularBackground from '../components/MolecularBackground';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

/* ─── Animation variant ─────────────────────────────────────── */
const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    }),
};

/* ─── Architecture steps ─────────────────────────────────────── */
const architectureSteps = [
    {
        step: '01',
        title: 'SMILES Input',
        desc: 'Molecular SMILES string parsed by RDKit and DeepChem MolGraphConvFeaturizer into 30-dim node features and 11-dim edge features.',
    },
    {
        step: '02',
        title: 'Graph Construction',
        desc: 'Atoms become nodes, bonds become edges. Node features include atomic number, degree, formal charge, hybridization, aromaticity, hydrogen count and chirality.',
    },
    {
        step: '03',
        title: 'Pretrained GIN Backbone',
        desc: '5-layer GINEConv with hidden dim 300. Weights from Hu et al. 2020 contextpred checkpoint pretrained on 2 million molecules from ZINC15.',
    },
    {
        step: '04',
        title: 'Task-Adaptive Readout',
        desc: 'Regression: Set Transformer aggregation capturing global structure. Classification: mean pooling with 82 functional group auxiliary supervision (Dey & Ning 2024).',
    },
    {
        step: '05',
        title: 'Auxiliary Supervision',
        desc: '82 RDKit SMARTS functional group patterns used as auxiliary targets during training — chemistry-guided regularization that improves generalization in low-data regimes.',
    },
    {
        step: '06',
        title: 'Gradient Attribution',
        desc: 'Atom importance via input gradient saliency. 20 MC Dropout forward passes estimate both prediction and aleatoric/epistemic uncertainty.',
    },
];

/* ─── Task-adaptive cards ────────────────────────────────────── */
const adaptiveCards = [
    {
        icon: 'GIN',
        title: 'Pretrained GIN Encoder',
        desc: 'Shared 5-layer GINEConv backbone initialised from the Hu et al. 2020 contextpred checkpoint, pretrained on 2 M molecules. Transfers transferable chemical knowledge to all downstream tasks.',
        color: '#44A194',
    },
    {
        icon: 'SET',
        title: 'Set Transformer (Regression)',
        desc: 'Set Transformer pooling captures global molecular structure for continuous property tasks (ESOL, Lipophilicity). Superior to simple mean/sum pooling for regression.',
        color: '#44A194',
    },
    {
        icon: 'FG',
        title: 'Aux FG Supervision (Classification)',
        desc: '82 RDKit SMARTS functional group patterns provide auxiliary supervision during classification training. Acts as chemistry-guided regularization in low-data regimes.',
        color: '#22c55e',
    },
];

/* ─── Performance data ───────────────────────────────────────── */
const tableRows = [
    { dataset: 'ESOL', type: 'Regression', metric: 'RMSE', rf: '1.8001', vanilla: '1.2495', ours: '0.9735' },
    { dataset: 'Lipophilicity', type: 'Regression', metric: 'RMSE', rf: '0.9241', vanilla: '0.8512', ours: '0.7688' },
    { dataset: 'BACE', type: 'Classification', metric: 'ROC-AUC', rf: 'N/A', vanilla: '0.8621', ours: '0.8274' },
    { dataset: 'BBBP', type: 'Classification', metric: 'ROC-AUC', rf: 'N/A', vanilla: '0.9012', ours: '0.9206' },
    { dataset: 'ClinTox', type: 'Classification', metric: 'ROC-AUC', rf: '0.7585', vanilla: '0.8726', ours: '0.8398' },
    { dataset: 'HIV', type: 'Classification', metric: 'ROC-AUC', rf: '0.7561', vanilla: '0.8076', ours: '0.8069' },
    { dataset: 'Tox21', type: 'Classification', metric: 'ROC-AUC', rf: '0.648', vanilla: '0.7432', ours: '0.7382' },
];

const regressionData = [
    { dataset: 'ESOL', RF: 1.8001, Vanilla: 1.2495, MolGraphIQ: 0.9735 },
    { dataset: 'Lipo', RF: 0.9241, Vanilla: 0.8512, MolGraphIQ: 0.7688 },
];

const classificationData = [
    { dataset: 'BACE', Vanilla: 0.8621, MolGraphIQ: 0.8274 },
    { dataset: 'BBBP', Vanilla: 0.9012, MolGraphIQ: 0.9206 },
    { dataset: 'ClinTox', RF: 0.7585, Vanilla: 0.8726, MolGraphIQ: 0.8398 },
    { dataset: 'HIV', RF: 0.7561, Vanilla: 0.8076, MolGraphIQ: 0.8069 },
    { dataset: 'Tox21', RF: 0.648, Vanilla: 0.7432, MolGraphIQ: 0.7382 },
];

/* ─── Shared chart styling ───────────────────────────────────── */
const CHART_COLORS = {
    RF: 'rgba(150,150,150,0.7)',
    Vanilla: 'rgba(100,150,255,0.7)',
    MolGraphIQ: 'rgba(0,212,255,0.9)',
};

const tooltipStyle = {
    backgroundColor: '#0d2d3d',
    border: '1px solid rgba(68,161,148,0.3)',
    borderRadius: 8,
    fontSize: 11,
    color: '#F4F0E4',
};

const axisStyle = { fill: 'rgba(255,255,255,0.35)', fontSize: 11 };

function ChartLegend() {
    return (
        <div className="flex items-center justify-center gap-6 mt-3">
            {Object.entries(CHART_COLORS).map(([name, color]) => (
                <div key={name} className="flex items-center gap-1.5">
                    <span
                        style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }}
                    />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                        {name === 'Vanilla' ? 'Vanilla GNN' : name}
                    </span>
                </div>
            ))}
        </div>
    );
}

/* ─── Determine "best" colour for table cells ────────────────── */
function isBest(row, col) {
    if (row.type === 'Regression') {
        // lower is better
        const vals = [
            row.rf !== 'N/A' ? parseFloat(row.rf) : Infinity,
            parseFloat(row.vanilla),
            parseFloat(row.ours),
        ];
        const best = Math.min(...vals);
        if (col === 'rf') return parseFloat(row.rf) === best;
        if (col === 'vanilla') return parseFloat(row.vanilla) === best;
        if (col === 'ours') return parseFloat(row.ours) === best;
    } else {
        // higher is better
        const vals = [
            row.rf !== 'N/A' ? parseFloat(row.rf) : -Infinity,
            parseFloat(row.vanilla),
            parseFloat(row.ours),
        ];
        const best = Math.max(...vals);
        if (col === 'rf') return row.rf !== 'N/A' && parseFloat(row.rf) === best;
        if (col === 'vanilla') return parseFloat(row.vanilla) === best;
        if (col === 'ours') return parseFloat(row.ours) === best;
    }
    return false;
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function About() {
    return (
        <div className="relative min-h-screen" style={{ background: '#061E29' }}>
            <MolecularBackground />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 60% 40% at 50% 15%, rgba(68,161,148,0.05) 0%, transparent 70%)',
                    zIndex: 1,
                }}
            />

            <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-20">

                {/* ── Header ── */}
                <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="mb-12 text-center">
                    <h1
                        className="text-4xl font-black mb-3"
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #44A194 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        About MolGraphIQ
                    </h1>
                    <p className="text-muted text-sm max-w-2xl mx-auto leading-relaxed">
                        A pretrained Graph Isomorphism Network (GIN) framework for molecular property prediction —
                        combining graph learning, chemistry-guided auxiliary supervision, and gradient-based
                        interpretability.
                    </p>
                </motion.div>

                {/* ── Architecture pipeline ── */}
                <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
                    <GlassCard className="p-6">
                        <h2 className="text-base font-bold mb-1" style={{ color: '#F4F0E4' }}>Model Architecture</h2>
                        <p className="text-xs text-muted mb-6">
                            End-to-end pipeline from raw SMILES string to property prediction and atom-level explanation.
                        </p>
                        <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
                            {architectureSteps.map((s, i) => (
                                <div key={s.step} className="flex items-stretch flex-shrink-0">
                                    <div
                                        className="flex flex-col p-3 rounded-lg"
                                        style={{
                                            minWidth: 140,
                                            maxWidth: 155,
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(68,161,148,0.14)',
                                        }}
                                    >
                                        <span className="text-xs font-black mb-1" style={{ color: '#44A194' }}>
                                            {s.step}
                                        </span>
                                        <span className="text-xs font-semibold text-white mb-1">{s.title}</span>
                                        <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                                            {s.desc}
                                        </span>
                                    </div>
                                    {i < architectureSteps.length - 1 && (
                                        <div
                                            className="flex items-center px-2 flex-shrink-0"
                                            style={{ color: 'rgba(68,161,148,0.40)', fontSize: 16 }}
                                        >
                                            ›
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </motion.div>

                {/* ── Task-adaptive section ── */}
                <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
                    <GlassCard className="p-6">
                        <h2 className="text-base font-bold mb-1" style={{ color: '#F4F0E4' }}>Task-Adaptive Approach</h2>
                        <p className="text-xs text-muted mb-5">
                            A single pretrained GIN encoder adapts to regression and classification via specialised
                            readout heads and auxiliary objectives.
                        </p>
                        <div className="grid md:grid-cols-3 gap-4">
                            {adaptiveCards.map(({ icon, title, desc, color }) => (
                                <div
                                    key={title}
                                    className="rounded-xl p-4"
                                    style={{ background: `${color}08`, border: `1px solid ${color}20` }}
                                >
                                    <div
                                        className="text-xs font-black mb-2 px-2 py-0.5 rounded inline-block"
                                        style={{ background: `${color}15`, color }}
                                    >
                                        {icon}
                                    </div>
                                    <p className="text-sm font-semibold mb-1" style={{ color }}>{title}</p>
                                    <p className="text-xs text-muted leading-relaxed">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </motion.div>

                {/* ── Performance table ── */}
                <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
                    <GlassCard className="p-6">
                        <h2 className="text-base font-bold mb-1" style={{ color: '#F4F0E4' }}>Performance Comparison</h2>
                        <p className="text-xs text-muted mb-1">
                            MolGraphIQ vs Random Forest baseline and single-task Vanilla GIN.
                        </p>
                        <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            All MolGraphIQ results are mean across 3 random seeds with scaffold splits.&nbsp;
                            Lower RMSE↓ &nbsp;·&nbsp; Higher ROC-AUC↑ &nbsp;·&nbsp;
                            <span style={{ color: '#44A194' }}>★ best per row</span>
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                                <thead>
                                    <tr>
                                        {['Dataset', 'Type', 'Metric', 'RF', 'Vanilla GIN', 'MolGraphIQ (Ours)'].map((h) => (
                                            <th
                                                key={h}
                                                className="text-left px-3 py-2 font-semibold"
                                                style={{
                                                    color: 'rgba(255,255,255,0.4)',
                                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                }}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.map((r, i) => (
                                        <tr
                                            key={r.dataset}
                                            style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                                        >
                                            <td className="px-3 py-2 font-medium text-white rounded-l-lg">{r.dataset}</td>
                                            <td className="px-3 py-2 text-muted">{r.type}</td>
                                            <td className="px-3 py-2 font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>{r.metric}</td>

                                            {/* RF */}
                                            <td className="px-3 py-2 font-mono"
                                                style={{ color: isBest(r, 'rf') ? '#44A194' : 'rgba(255,255,255,0.45)' }}>
                                                {r.rf}{isBest(r, 'rf') && <span className="ml-1" style={{ color: '#44A194' }}>★</span>}
                                            </td>

                                            {/* Vanilla */}
                                            <td className="px-3 py-2 font-mono"
                                                style={{ color: isBest(r, 'vanilla') ? '#44A194' : 'rgba(255,255,255,0.45)' }}>
                                                {r.vanilla}{isBest(r, 'vanilla') && <span className="ml-1" style={{ color: '#44A194' }}>★</span>}
                                            </td>

                                            {/* MolGraphIQ */}
                                            <td className="px-3 py-2 font-mono font-bold rounded-r-lg"
                                                style={{ color: isBest(r, 'ours') ? '#44A194' : 'rgba(255,255,255,0.55)' }}>
                                                {r.ours}{isBest(r, 'ours') && <span className="ml-1" style={{ color: '#44A194' }}>★</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </motion.div>

                {/* ── Bar charts ── */}
                <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible">
                    <GlassCard className="p-6">
                        <h2 className="text-base font-bold mb-1" style={{ color: '#F4F0E4' }}>Visual Comparison</h2>
                        <p className="text-xs text-muted mb-6">
                            Grouped bar charts across all benchmarks.
                        </p>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* ── Regression chart ── */}
                            <div>
                                <p className="text-xs font-semibold mb-3 text-center" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                    Regression — RMSE&nbsp;
                                    <span style={{ color: 'rgba(236,143,141,0.8)' }}>(lower is better ↓)</span>
                                </p>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart
                                        data={regressionData}
                                        margin={{ top: 4, right: 8, left: -10, bottom: 4 }}
                                        barCategoryGap="30%"
                                        barGap={3}
                                    >
                                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="dataset" tick={axisStyle} axisLine={false} tickLine={false} />
                                        <YAxis tick={axisStyle} axisLine={false} tickLine={false} domain={[0, 2.1]} />
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                            formatter={(val) => val?.toFixed(4)}
                                        />
                                        <Bar dataKey="RF" fill={CHART_COLORS.RF} radius={[3, 3, 0, 0]} name="RF" />
                                        <Bar dataKey="Vanilla" fill={CHART_COLORS.Vanilla} radius={[3, 3, 0, 0]} name="Vanilla GNN" />
                                        <Bar dataKey="MolGraphIQ" fill={CHART_COLORS.MolGraphIQ} radius={[3, 3, 0, 0]} name="MolGraphIQ" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* ── Classification chart ── */}
                            <div>
                                <p className="text-xs font-semibold mb-3 text-center" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                    Classification — ROC-AUC&nbsp;
                                    <span style={{ color: '#44A194' }}>(higher is better ↑)</span>
                                </p>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart
                                        data={classificationData}
                                        margin={{ top: 4, right: 8, left: -10, bottom: 4 }}
                                        barCategoryGap="25%"
                                        barGap={2}
                                    >
                                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="dataset" tick={axisStyle} axisLine={false} tickLine={false} />
                                        <YAxis tick={axisStyle} axisLine={false} tickLine={false} domain={[0.5, 1.0]} />
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                            formatter={(val) => val?.toFixed(4)}
                                        />
                                        <Bar dataKey="RF" fill={CHART_COLORS.RF} radius={[3, 3, 0, 0]} name="RF" />
                                        <Bar dataKey="Vanilla" fill={CHART_COLORS.Vanilla} radius={[3, 3, 0, 0]} name="Vanilla GNN" />
                                        <Bar dataKey="MolGraphIQ" fill={CHART_COLORS.MolGraphIQ} radius={[3, 3, 0, 0]} name="MolGraphIQ" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Shared legend */}
                        <ChartLegend />

                        <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.22)' }}>
                            RF bars omitted for BACE and BBBP (not applicable). All results on scaffold splits.
                        </p>
                    </GlassCard>
                </motion.div>

            </div>
        </div>
    );
}
