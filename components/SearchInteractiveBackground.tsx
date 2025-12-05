
import React, { useEffect, useRef } from 'react';
const BASES = ['A','G','C','T','U'];

interface Props {
  isActive: boolean;
}

export const SearchInteractiveBackground: React.FC<Props> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      const parent = canvas.parentElement;
      const dpr = window.devicePixelRatio || 1;
      const rect = parent ? parent.getBoundingClientRect() : { width: window.innerWidth, height: 160 } as DOMRect;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width: rect.width, height: rect.height };
    };

    let { width, height } = updateSize();

    const strandLength = 40;
    const amplitude = 22;
    const perspective = 520;
    let spacing = width / 42;
    const tilt = 0;
    const bases0 = Array.from({ length: strandLength }, (_, i) => BASES[i % BASES.length]);
    const bases1 = Array.from({ length: strandLength }, (_, i) => BASES[(i + 2) % BASES.length]);

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      rotationRef.current += isActive ? 0.008 : 0.003;
      const centerY = height / 2;
      const angle = rotationRef.current;

      const points: { x: number; y: number; z: number; scale: number; strand: number; base: string }[] = [];
      for (let s = 0; s < 2; s++) {
        const phase = s === 0 ? 0 : Math.PI;
        for (let i = 0; i < strandLength; i++) {
          const x = (i + 2.5) * spacing;
          const t = i * 0.14;
          const theta = t * Math.PI * 2 + angle + phase;
          const y3d = amplitude * Math.cos(theta) + Math.sin(theta * 0.5) * 6;
          const z3d = amplitude * Math.sin(theta) + Math.sin(theta * 2) * 8 + (x - width / 2) * tilt * 200;
          const scale = perspective / (perspective + z3d);
          const y = centerY + y3d * scale;
          const base = s === 0 ? bases0[i] : bases1[i];
          points.push({ x, y, z: z3d, scale, strand: s, base });
        }
      }

      points.sort((a, b) => a.z - b.z);

      for (const p of points) {
        const r = 3.2 * p.scale + 0.6;
        const lightX = p.x + r * 0.4;
        const lightY = p.y - r * 0.4;
        const grad = ctx.createRadialGradient(lightX, lightY, r * 0.1, p.x, p.y, r);
        grad.addColorStop(0, `rgba(255,255,255,${0.5 * p.scale})`);
        grad.addColorStop(0.35, `rgba(173,181,189,${0.35})`);
        grad.addColorStop(0.7, `rgba(108,117,125,${0.25})`);
        grad.addColorStop(1, `rgba(52,58,64,${0.15})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();

        if (p.scale > 0.6) {
          ctx.font = `${9 * p.scale}px Inter, monospace`;
          ctx.fillStyle = `rgba(33,37,41,0.85)`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.base, p.x, p.y);
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    const handleResize = () => {
      const dims = updateSize();
      width = dims.width;
      height = dims.height;
      spacing = width / 42;
    };

    window.addEventListener('resize', handleResize);
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-700"
    />
  );
};
