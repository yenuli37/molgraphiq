import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import MolecularBackground from '../components/MolecularBackground';

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.12, duration: 0.65, ease: [0.22, 1, 0.36, 1] },
    }),
};

const features = [
    {
        icon: '🧬',
        title: 'Graph Neural Networks',
        desc: 'Processes molecular topology directly as graphs — atoms as nodes, bonds as edges.',
    },
    {
        icon: '🔬',
        title: 'Knowledge Augmentation',
        desc: 'Pre-trained on large molecular datasets to transfer chemical domain knowledge.',
    },
    {
        icon: '📊',
        title: 'Multi-Task Prediction',
        desc: 'Solubility, lipophilicity, toxicity, bioactivity — all from a single unified model.',
    },
    {
        icon: '🎯',
        title: 'GNN Explainability',
        desc: 'Highlights which molecular substructures drive each prediction via GNNExplainer.',
    },
];

export default function Home() {
    return (
        <div className="relative min-h-screen" style={{ background: '#061E29' }}>
            <MolecularBackground />

            {/* Radial glow behind hero */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(68, 161, 148,0.06) 0%, transparent 70%)',
                    zIndex: 1,
                }}
            />

            <div className="relative z-10 flex flex-col items-center text-center px-6 pt-36 pb-24">
                {/* Badge */}
                <motion.div
                    custom={0}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8"
                    style={{
                        background: 'rgba(68, 161, 148,0.1)',
                        border: '1px solid rgba(68, 161, 148,0.25)',
                        color: '#44A194',
                        letterSpacing: '0.05em',
                    }}
                >
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: '#EC8F8D', boxShadow: '0 0 6px #EC8F8D' }}
                    />
                    KAGNN-BASED MOLECULAR INTELLIGENCE
                </motion.div>

                {/* Title */}
                <motion.h1
                    custom={1}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="font-black tracking-tight mb-4"
                    style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1.05 }}
                >
                    <span
                        style={{
                            background: 'linear-gradient(135deg, #F4F0E4 0%, #44A194 55%, #EC8F8D 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        MolGraph
                    </span>
                    <span className="text-white">IQ</span>
                </motion.h1>

                {/* Tagline */}
                <motion.p
                    custom={2}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="text-lg md:text-xl font-medium mb-4 max-w-2xl"
                    style={{ color: 'rgba(244, 240, 228, 0.70)', lineHeight: 1.6 }}
                >
                    Knowledge-Augmented Graph Neural Networks for Drug Discovery
                </motion.p>

                {/* Description */}
                <motion.p
                    custom={3}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="text-sm md:text-base max-w-xl mb-10"
                    style={{ color: 'rgba(244, 240, 228, 0.50)', lineHeight: 1.8 }}
                >
                    Enter a SMILES string and predict drug-like molecular properties with state-of-the-art
                    GNN models — trained on 7 benchmark datasets spanning solubility, toxicity, bioactivity
                    and beyond.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    custom={4}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col sm:flex-row gap-4"
                >
                    <Link to="/predict" className="btn-primary no-underline text-sm inline-block">
                        ⚡ Try Prediction
                    </Link>
                    <Link to="/about" className="btn-outline no-underline text-sm inline-block">
                        Learn More →
                    </Link>
                </motion.div>

                {/* Stats bar */}
                <motion.div
                    custom={5}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="mt-16 flex flex-wrap justify-center gap-8"
                >
                    {[
                        { value: '7', label: 'Benchmark Datasets' },
                        { value: 'GNN', label: 'Graph Neural Network' },
                        { value: 'GNNExplainer', label: 'Atom Attribution' },
                        { value: 'SMILES', label: 'Input Format' },
                    ].map(({ value, label }) => (
                        <div key={label} className="flex flex-col items-center gap-1">
                            <span
                                className="text-2xl font-bold"
                                style={{
                                    background: 'linear-gradient(135deg, #44A194, #EC8F8D)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                {value}
                            </span>
                            <span className="text-xs text-muted">{label}</span>
                        </div>
                    ))}
                </motion.div>

                {/* Divider */}
                <motion.div
                    custom={6}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="divider-cyan w-full max-w-4xl mt-20 mb-16"
                />

                {/* Feature cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full">
                    {features.map(({ icon, title, desc }, i) => (
                        <motion.div
                            key={title}
                            custom={7 + i}
                            variants={fadeUp}
                            initial="hidden"
                            animate="visible"
                            className="glass-card-hover p-6 text-left"
                        >
                            <div className="text-2xl mb-3">{icon}</div>
                            <h3 className="font-semibold text-sm mb-2" style={{ color: '#F4F0E4' }}>
                                {title}
                            </h3>
                            <p className="text-xs leading-relaxed text-muted">{desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
