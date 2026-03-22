/**
 * Reusable glassmorphism card component.
 */
export default function GlassCard({ children, className = '', glow = false, style = {} }) {
    return (
        <div
            className={`glass-card ${className}`}
            style={{
                ...(glow
                    ? { boxShadow: '0 0 40px rgba(68, 161, 148, 0.10), 0 4px 40px rgba(0,0,0,0.4)' }
                    : { boxShadow: '0 4px 40px rgba(0,0,0,0.3)' }),
                ...style,
            }}
        >
            {children}
        </div>
    );
}
