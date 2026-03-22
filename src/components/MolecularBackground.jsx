import { useEffect, useRef } from 'react';

/**
 * Animated molecular wireframe SVG canvas background.
 * Renders rotating hexagons, benzene rings, bond lines — subtle dark overlay.
 */
export default function MolecularBackground() {
    const canvasRef = useRef(null);
    const animFrameRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let time = 0;

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        // Molecule cluster definitions
        const molecules = [
            { x: 0.1, y: 0.2, size: 60, speed: 0.3, opacity: 0.12, type: 'hexagon' },
            { x: 0.85, y: 0.15, size: 80, speed: -0.2, opacity: 0.10, type: 'benzene' },
            { x: 0.5, y: 0.7, size: 50, speed: 0.4, opacity: 0.09, type: 'hexagon' },
            { x: 0.75, y: 0.6, size: 70, speed: -0.3, opacity: 0.08, type: 'benzene' },
            { x: 0.2, y: 0.75, size: 55, speed: 0.25, opacity: 0.11, type: 'hexagon' },
            { x: 0.9, y: 0.5, size: 45, speed: 0.35, opacity: 0.07, type: 'chain' },
            { x: 0.35, y: 0.1, size: 65, speed: -0.2, opacity: 0.08, type: 'chain' },
            { x: 0.6, y: 0.35, size: 40, speed: 0.5, opacity: 0.06, type: 'benzene' },
        ];

        function drawHexagon(ctx, cx, cy, r, rotation, opacity) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation);
            ctx.strokeStyle = `rgba(68, 161, 148, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const x = r * Math.cos(angle);
                const y = r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

        function drawBenzene(ctx, cx, cy, r, rotation, opacity) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation);

            // Outer hexagon
            ctx.strokeStyle = `rgba(68, 161, 148, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const x = r * Math.cos(angle);
                const y = r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();

            // Inner circle (aromaticity)
            ctx.strokeStyle = `rgba(83, 125, 150, ${opacity * 0.7})`;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
            ctx.stroke();

            // Bonds from center to vertices (alternating)
            ctx.strokeStyle = `rgba(68, 161, 148, ${opacity * 0.4})`;
            for (let i = 0; i < 6; i += 2) {
                const angle = (Math.PI / 3) * i;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
                ctx.stroke();
            }
            ctx.restore();
        }

        function drawChain(ctx, cx, cy, r, rotation, opacity) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation);
            ctx.strokeStyle = `rgba(68, 161, 148, ${opacity})`;
            ctx.lineWidth = 1;

            // Draw zig-zag chain
            const steps = 5;
            const stepW = r * 0.6;
            const stepH = r * 0.35;
            ctx.beginPath();
            ctx.moveTo(-steps * stepW * 0.5, 0);
            for (let i = 0; i <= steps; i++) {
                const x = -steps * stepW * 0.5 + i * stepW;
                const y = i % 2 === 0 ? 0 : stepH;
                ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Draw atom circles
            ctx.fillStyle = `rgba(68, 161, 148, ${opacity * 0.8})`;
            for (let i = 0; i <= steps; i++) {
                const x = -steps * stepW * 0.5 + i * stepW;
                const y = i % 2 === 0 ? 0 : stepH;
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            time += 0.005;

            molecules.forEach((mol) => {
                const cx = mol.x * canvas.width;
                const cy = mol.y * canvas.height;
                const rotation = time * mol.speed;

                if (mol.type === 'hexagon') {
                    drawHexagon(ctx, cx, cy, mol.size, rotation, mol.opacity);
                } else if (mol.type === 'benzene') {
                    drawBenzene(ctx, cx, cy, mol.size, rotation, mol.opacity);
                } else {
                    drawChain(ctx, cx, cy, mol.size, rotation, mol.opacity);
                }
            });

            // Floating bond lines connecting molecules
            ctx.strokeStyle = 'rgba(68, 161, 148, 0.05)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < molecules.length - 1; i++) {
                const a = molecules[i];
                const b = molecules[i + 1];
                const ax = a.x * canvas.width;
                const ay = a.y * canvas.height;
                const bx = b.x * canvas.width;
                const by = b.y * canvas.height;
                const dist = Math.hypot(bx - ax, by - ay);
                if (dist < 400) {
                    ctx.beginPath();
                    ctx.moveTo(ax, ay);
                    ctx.lineTo(bx, by);
                    ctx.stroke();
                }
            }

            animFrameRef.current = requestAnimationFrame(draw);
        }

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 0, opacity: 1 }}
        />
    );
}
