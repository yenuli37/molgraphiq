import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import MolecularBackground from '../components/MolecularBackground';

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    }),
};

const results = [
    { dataset: 'ESOL', type: 'Regression', metric: 'RMSE', baseline: '1.74', gnn: '0.97', kagnn: '0.83' },
    { dataset: 'Lipophilicity', type: 'Regression', metric: 'RMSE', baseline: '0.88', gnn: '0.73', kagnn: '0.65' },
    { dataset: 'BACE', type: 'Classification', metric: 'ROC-AUC', baseline: '0.78', gnn: '0.86', kagnn: '0.89' },
    { dataset: 'BBBP', type: 'Classification', metric: 'ROC-AUC', baseline: '0.71', gnn: '0.89', kagnn: '0.91' },
    { dataset: 'ClinTox', type: 'Classification', metric: 'ROC-AUC', baseline: '0.65', gnn: '0.82', kagnn: '0.87' },
    { dataset: 'HIV', type: 'Classification', metric: 'ROC-AUC', baseline: '0.75', gnn: '0.77', kagnn: '0.80' },
    { dataset: 'Tox21', type: 'Classification', metric: 'ROC-AUC', baseline: '0.74', gnn: '0.83', kagnn: '0.86' },
];

const architectureSteps = [
    { step: '01', title: 'SMILES Input', desc: 'Molecular SMILES string parsed by RDKit into atom/bond feature vectors.' },
    { step: '02', title: 'Graph Construction', desc: 'Atoms → nodes, bonds → edges. Node features include atomic number, hybridization, charge, etc.' },
    { step: '03', title: 'GIN Backbone', desc: 'Graph Isomorphism Network performs message passing over the molecular graph (L layers).' },
    { step: '04', title: 'Knowledge Injection', desc: 'QMugs pre-trained embeddings distilled into the encoder via knowledge transfer objectives.' },
    { step: '05', title: 'Task Head', desc: 'Task-adaptive readout: regression (MSE) or classification (BCE) depending on dataset type.' },
    { step: '06', title: 'GNNExplainer', desc: 'Attribution post-hoc: masks edges/features to identify maximally important subgraphs.' },
];

export default function About() {
    return (
        <div className="relative min-h-screen" style={{ background: '#061E29' }}>
            <MolecularBackground />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 60% 40% at 50% 15%, rgba(124,58,237,0.05) 0%, transparent 70%)',
                    zIndex: 1,
                }}
            />

            <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-20">
                {/* Header */}
                <motion.div
                    custom={0}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="mb-12 text-center"
                >
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
                    <p className="text-muted text-sm max-w-xl mx-auto leading-relaxed">
                        A Knowledge-Augmented Graph Neural Network framework for molecular property
                        prediction — bridging pre-training, graph learning, and explainability.
                    </p>
                </motion.div>

                {/* Architecture Pipeline */}
                <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
                    <GlassCard className="p-6">
                        <h2 className="text-base font-bold mb-1" style={{ color: '#F4F0E4' }}>
                            Model Architecture
                        </h2>
                        <p className="text-xs text-muted mb-6">
                            End-to-end GNN pipeline from raw SMILES to property prediction.
                        </p>

                        {/* Pipeline diagram */}
                        <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
                            {architectureSteps.map((s, i) => (
                                <div key={s.step} className="flex items-stretch flex-shrink-0">
                                    {/* Step card */}
                                    <div
                                        className="flex flex-col p-3 rounded-lg min-w-[130px] max-w-[140px]"
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(68, 161, 148,0.12)',
                                        }}
                                    >
                                        <span
                                            className="text-xs font-black mb-1"
                                            style={{ color: i < 3 ? '#44A194' : '#44A194' }}
                                        >
                                            {s.step}
                                        </span>
                                        <span className="text-xs font-semibold text-white mb-1">{s.title}</span>
                                        <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                                            {s.desc}
                                        </span>
                                    </div>
                                    {/* Arrow connector */}
                                    {i < architectureSteps.length - 1 && (
                                        <div
                                            className="flex items-center px-2 flex-shrink-0"
                                            style={{ color: 'rgba(68, 161, 148,0.4)', fontSize: '14px' }}
                                        >
                                            &rsaquo;
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </motion.div>

                {/* Task-adaptive section */}
                <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
                    <GlassCard className="p-6">
                        <h2 className="text-base font-bold mb-1" style={{ color: '#F4F0E4' }}>
                            Task-Adaptive Approach
                        </h2>
                        <p className="text-xs text-muted mb-5">
                            A single unified encoder; task-specific heads for regression and classification.
                        </p>
                        <div className="grid md:grid-cols-3 gap-4">
                            {[
                                {
                                    title: 'Shared Encoder',
                                    desc: 'GIN backbone pre-trained on QMugs quantum chemical dataset — learns transferable molecular representations.',
                                    color: '#44A194',
                                    icon: 'ENC',
                                },
                                {
                                    title: 'Knowledge Transfer',
                                    desc: 'HOMO/LUMO energy levels and DFT properties distilled as auxiliary supervision during pre-training.',
                                    color: '#44A194',
                                    icon: 'KT',
                                },
                                {
                                    title: 'Task Heads',
                                    desc: 'Regression head (MSE loss) for continuous properties; binary/multi-label classification head (BCE) for activity.',
                                    color: '#22c55e',
                                    icon: 'MLP',
                                },
                            ].map(({ title, desc, color, icon }) => (
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
                                    <p className="text-sm font-semibold mb-1" style={{ color }}>
                                        {title}
                                    </p>
                                    <p className="text-xs text-muted leading-relaxed">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </motion.div>

                {/* Results table */}
                <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
                    <GlassCard className="p-6">
                        <h2 className="text-base font-bold mb-1" style={{ color: '#F4F0E4' }}>
                            Performance Comparison
                        </h2>
                        <p className="text-xs text-muted mb-5">
                            KA-GNN vs Random Forest baseline and single-task GIN.
                            Lower RMSE is better ↓ &nbsp;·&nbsp; Higher ROC-AUC is better ↑
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                                <thead>
                                    <tr>
                                        {['Dataset', 'Type', 'Metric', 'Baseline (RF)', 'GIN', 'KA-GNN (Ours)'].map(
                                            (h) => (
                                                <th
                                                    key={h}
                                                    className="text-left px-3 py-2 font-semibold"
                                                    style={{ color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                                                >
                                                    {h}
                                                </th>
                                            ),
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((r, i) => (
                                        <tr
                                            key={r.dataset}
                                            style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                                        >
                                            <td className="px-3 py-2 font-medium text-white rounded-l-lg">{r.dataset}</td>
                                            <td className="px-3 py-2 text-muted">{r.type}</td>
                                            <td
                                                className="px-3 py-2 font-mono"
                                                style={{ color: 'rgba(255,255,255,0.5)' }}
                                            >
                                                {r.metric}
                                            </td>
                                            <td className="px-3 py-2 text-muted font-mono">{r.baseline}</td>
                                            <td className="px-3 py-2 text-muted font-mono">{r.gnn}</td>
                                            <td className="px-3 py-2 font-mono font-bold rounded-r-lg" style={{ color: '#44A194' }}>
                                                {r.kagnn}
                                                <span
                                                    className="ml-2 text-xs px-1.5 py-0.5 rounded"
                                                    style={{ background: 'rgba(68, 161, 148,0.1)', color: '#44A194', fontSize: '0.65rem' }}
                                                >
                                                    BEST
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>
        </div>
    );
}
