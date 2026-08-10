import React, { useEffect, useRef, useState } from 'react';

// Renders a generated base image with structured text overlays drawn on an
// HTML <canvas> for crisp, perfectly legible text (no garbled AI lettering).
export default function TextImageCanvas({ baseImageUrl, overlays, className }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImageUrl) return;
    setReady(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxW = 768;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      for (const o of overlays || []) {
        const fontSize = (o.size === 'large' ? 40 : o.size === 'small' ? 18 : 28) * scale;
        ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
        const placement = o.placement || 'center';

        let x = canvas.width / 2;
        let y = canvas.height / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (placement.startsWith('top')) y = fontSize + 8 * scale;
        if (placement.startsWith('bottom')) y = canvas.height - fontSize - 6 * scale;
        if (placement.includes('left')) { ctx.textAlign = 'left'; x = 14 * scale; }
        if (placement.includes('right')) { ctx.textAlign = 'right'; x = canvas.width - 14 * scale; }

        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 8 * scale;
        ctx.shadowOffsetY = 1 * scale;
        ctx.fillStyle = o.color || '#ffffff';
        ctx.fillText(o.text || '', x, y);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      }
      setReady(true);
    };
    img.onerror = () => setReady(false);
    img.src = baseImageUrl;
  }, [baseImageUrl, overlays]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: ready ? 'block' : 'none', maxWidth: '100%', height: 'auto', borderRadius: '0.5rem' }}
    />
  );
}