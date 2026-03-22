import { motion } from 'framer-motion';

export default function LoadingSpinner({ size = 40, message = 'Analyzing molecule...' }) {
    return (
        <div className="flex flex-col items-center gap-4 py-8">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                style={{
                    width: size,
                    height: size,
                    border: `3px solid rgba(68, 161, 148, 0.15)`,
                    borderTop: `3px solid #44A194`,
                    borderRadius: '50%',
                }}
            />
            {message && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    className="text-sm text-muted"
                >
                    {message}
                </motion.p>
            )}
        </div>
    );
}
