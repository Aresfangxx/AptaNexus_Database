
import React, { useEffect, useRef } from 'react';

const BASES = ['A', 'G', 'C', 'U'];

interface Props {
  isActive: boolean; // Controls rotation
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

    let width = canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
    let height = canvas.height = canvas.parentElement?.offsetHeight || 150;

    // --- STRAND CONFIG ---
    const strandLength = 40; // Number of bases
    const amplitude = 20;
    const frequency = 0.15;
    const spacing = width / (strandLength + 5); 
    const bases: string[] = [];
    
    // Generate random sequence once
    for(let i=0; i<strandLength; i++) {
       bases.push(BASES[Math.floor(Math.random() * BASES.length)]);
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Update rotation
      if (isActive) {
        rotationRef.current += 0.05; // Spin speed
      } else {
        // Slowly return to 0 or just stop? Let's just slow down drastically or stop.
        // For smoother feel, maybe just drift very slowly
        rotationRef.current += 0.002;
      }

      const centerY = height / 2;
      const angleOffset = rotationRef.current;

      ctx.lineCap = 'round';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Draw Loop
      for (let i = 0; i < strandLength; i++) {
        const x = (i + 2.5) * spacing; // Center horizontally with some padding
        
        // Helix Math
        // We simulate a 3D spiral rotating around X-axis (which is the horizontal line here)
        // Actually, typical DNA spiral is around the axis of the strand.
        // Let's do a wave that rotates.
        
        const t = i * frequency;
        
        // 3D coordinates on the surface of a cylinder running along X
        // y = r * cos(theta)
        // z = r * sin(theta)
        
        const theta = t * Math.PI * 2 + angleOffset;
        const r = amplitude;
        
        const y3d = r * Math.cos(theta);
        const z3d = r * Math.sin(theta);
        
        // Project to 2D
        const perspective = 500;
        const scale = perspective / (perspective + z3d);
        
        const y2d = centerY + y3d * scale;
        const x2d = x; // Orthographic X for simplicity, or we could project X too but linear is fine for this
        
        // Draw Backbone segment (connecting to previous)
        if (i > 0) {
           const prevT = (i - 1) * frequency;
           const prevTheta = prevT * Math.PI * 2 + angleOffset;
           const prevY3d = r * Math.cos(prevTheta);
           const prevZ3d = r * Math.sin(prevTheta);
           const prevScale = perspective / (perspective + prevZ3d);
           const prevY2d = centerY + prevY3d * prevScale;
           const prevX2d = (i - 1 + 2.5) * spacing;

           ctx.beginPath();
           ctx.strokeStyle = `rgba(108, 117, 125, ${0.3 + (scale - 0.5)})`; // Depth cueing alpha
           ctx.lineWidth = 2 * scale;
           ctx.moveTo(prevX2d, prevY2d);
           ctx.lineTo(x2d, y2d);
           ctx.stroke();
        }

        // Draw Base Stick
        // Stick goes from Backbone (y2d) towards center or opposite backbone? 
        // Single strand usually has bases pointing in. Let's make them point 'down' relative to the spiral local frame
        // or just a stick of fixed length.
        
        const stickLen = 15 * scale;
        // Vector for stick direction (inward perpendicular to tangent? simplified: just vertical in local frame)
        // Let's project a point closer to center
        const innerR = r - 10;
        const innerY3d = innerR * Math.cos(theta);
        const innerZ3d = innerR * Math.sin(theta);
        const innerScale = perspective / (perspective + innerZ3d);
        const innerY2d = centerY + innerY3d * innerScale;

        // Draw Stick
        ctx.beginPath();
        ctx.strokeStyle = `rgba(108, 117, 125, ${0.3 + (scale - 0.5)})`;
        ctx.lineWidth = 1 * scale;
        ctx.moveTo(x2d, y2d);
        ctx.lineTo(x2d, y2d + (isActive ? Math.sin(theta)*5 : 0)); // Dynamic wiggle if active?
        // Actually just draw stick to a calculated tip
        const tipY = y2d + (y2d < centerY ? 1 : -1) * stickLen; // Simple directional stick
        ctx.lineTo(x2d, tipY);
        ctx.stroke();

        // Draw Base Letter
        ctx.fillStyle = `rgba(52, 58, 64, ${0.4 + (scale - 0.5)})`; // Dark gray
        ctx.font = `600 ${10 * scale}px "Inter", monospace`;
        ctx.fillText(bases[i], x2d, tipY + (y2d < centerY ? 12 : -12) * scale);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    const handleResize = () => {
       if (canvas.parentElement) {
         width = canvas.width = canvas.parentElement.offsetWidth;
         height = canvas.height = canvas.parentElement.offsetHeight;
       }
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
