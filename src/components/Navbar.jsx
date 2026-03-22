import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/predict', label: 'Predict' },
    { path: '/about', label: 'About' },
];

export default function Navbar() {
    const location = useLocation();

    return (
        <nav
            className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
            style={{
                background: 'rgba(6, 30, 41, 0.80)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(68, 161, 148, 0.12)',
            }}
        >
            <div className="max-w-6xl mx-auto flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 no-underline">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #44A194, #EC8F8D)' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="4" r="2" fill="white" />
                            <circle cx="4" cy="18" r="2" fill="white" />
                            <circle cx="20" cy="18" r="2" fill="white" />
                            <line x1="12" y1="4" x2="4" y2="18" stroke="white" strokeWidth="1.5" />
                            <line x1="12" y1="4" x2="20" y2="18" stroke="white" strokeWidth="1.5" />
                            <line x1="4" y1="18" x2="20" y2="18" stroke="white" strokeWidth="1.5" />
                        </svg>
                    </div>
                    <span className="font-bold text-lg tracking-tight" style={{ color: '#44A194' }}>
                        MolGraph<span style={{ color: '#F4F0E4' }}>IQ</span>
                    </span>
                </Link>

                {/* Nav Links */}
                <div className="flex items-center gap-1">
                    {navLinks.map(({ path, label }) => {
                        const isActive = location.pathname === path;
                        return (
                            <Link
                                key={path}
                                to={path}
                                className="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 no-underline"
                                style={{ color: isActive ? '#44A194' : 'rgba(244, 240, 228,0.55)' }}
                            >
                                {isActive && (
                                    <motion.span
                                        layoutId="nav-active-pill"
                                        className="absolute inset-0 rounded-lg"
                                        style={{ background: 'rgba(68, 161, 148,0.10)', border: '1px solid rgba(68, 161, 148,0.25)' }}
                                        transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }}
                                    />
                                )}
                                <span className="relative z-10">{label}</span>
                            </Link>
                        );
                    })}

                    <Link
                        to="/predict"
                        className="ml-3 btn-primary text-sm py-2 px-5 no-underline inline-block"
                        style={{ borderRadius: '8px' }}
                    >
                        Try Now
                    </Link>
                </div>
            </div>
        </nav>
    );
}
