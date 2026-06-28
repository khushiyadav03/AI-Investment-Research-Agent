import React, { useRef, useEffect, useState } from 'react';

export default function StockChart({ data, ticker }) {
  const canvasRef     = useRef(null);
  const [range, setRange]           = useState('1Y');
  const [hoverIdx, setHoverIdx]     = useState(-1);
  const [filtered, setFiltered]     = useState([]);
  const [resizeTick, setResizeTick] = useState(0);

  useEffect(() => {
    const onResize = () => setResizeTick(t => t + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!data?.length) return;
    const today = new Date();
    const cutoff = new Date();
    if      (range === '3M') cutoff.setDate(today.getDate() - 90);
    else if (range === '6M') cutoff.setDate(today.getDate() - 180);
    else                     cutoff.setDate(today.getDate() - 365);
    const f = data.filter(d => new Date(d.date) >= cutoff);
    setFiltered(f.length > 5 ? f : data);
    setHoverIdx(-1);
  }, [data, range]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !filtered.length) return;

    const ctx  = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const W = rect.width, H = rect.height;
    const mg = { top: 24, right: 16, bottom: 28, left: 56 };
    const cW = W - mg.left - mg.right;
    const cH = H - mg.top  - mg.bottom;

    ctx.clearRect(0, 0, W, H);

    const prices  = filtered.map(d => d.close);
    const maxP    = Math.max(...prices) * 1.02;
    const minP    = Math.min(...prices) * 0.98;
    const range_  = maxP - minP;

    const pts = filtered.map((d, i) => ({
      x: mg.left + (i / (filtered.length - 1)) * cW,
      y: mg.top  + cH - ((d.close - minP) / range_) * cH,
      price: d.close, date: d.date,
    }));

    // Grid lines + Y labels
    ctx.font = '10px Plus Jakarta Sans, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = minP + (i / 4) * range_;
      const y   = mg.top + cH - (i / 4) * cH;
      ctx.strokeStyle = 'rgba(0,0,0,0.055)';
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(mg.left, y); ctx.lineTo(W - mg.right, y); ctx.stroke();
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText(`$${val.toFixed(0)}`, mg.left - 6, y);
    }

    // X labels
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const xCount = 3;
    for (let i = 0; i < xCount; i++) {
      const idx = Math.min(Math.round(i * (filtered.length - 1) / (xCount - 1)), filtered.length - 1);
      const pt  = pts[idx];
      const dp  = pt.date.split('-');
      const lbl = dp.length === 3 ? `${months[parseInt(dp[1])-1]} ${dp[2]}` : pt.date;
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText(lbl, pt.x, H - mg.bottom + 6);
    }

    // Gradient fill
    const grad = ctx.createLinearGradient(0, mg.top, 0, mg.top + cH);
    grad.addColorStop(0,   'rgba(255,107,53,0.18)');
    grad.addColorStop(0.7, 'rgba(255,107,53,0.04)');
    grad.addColorStop(1,   'rgba(255,107,53,0.00)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, mg.top + cH);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length-1].x, mg.top + cH);
    ctx.closePath();
    ctx.fill();

    // Line
    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Hover
    if (hoverIdx >= 0 && hoverIdx < pts.length) {
      const ap = pts[hoverIdx];
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(ap.x, mg.top); ctx.lineTo(ap.x, H - mg.bottom); ctx.stroke();
      ctx.restore();

      ctx.beginPath(); ctx.arc(ap.x, ap.y, 5, 0, 2*Math.PI);
      ctx.fillStyle = '#FF6B35'; ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(255,107,53,0.5)'; ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath(); ctx.arc(ap.x, ap.y, 9, 0, 2*Math.PI);
      ctx.strokeStyle = 'rgba(255,107,53,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();

      const tipVal  = `$${ap.price.toFixed(2)}`;
      const tipDate = ap.date;
      ctx.font = 'bold 10px Plus Jakarta Sans, sans-serif';
      const tW = Math.max(ctx.measureText(tipVal).width, ctx.measureText(tipDate).width) + 20;
      const tH = 34;
      let tX = ap.x - tW / 2;
      let tY = ap.y - tH - 12;
      if (tX < mg.left) tX = mg.left + 2;
      if (tX + tW > W - mg.right) tX = W - mg.right - tW - 2;
      if (tY < mg.top) tY = ap.y + 12;

      ctx.fillStyle   = '#FFFFFF';
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth   = 1;
      ctx.shadowBlur  = 8; ctx.shadowColor = 'rgba(0,0,0,0.10)';
      ctx.beginPath(); ctx.roundRect(tX, tY, tW, tH, 6); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#1A1F36';
      ctx.font = 'bold 10px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tipVal, tX + tW/2, tY + 12);
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '9px Plus Jakarta Sans, sans-serif';
      ctx.fillText(tipDate, tX + tW/2, tY + 24);
    }

    // Axis border
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mg.left, mg.top); ctx.lineTo(mg.left, H - mg.bottom);
    ctx.lineTo(W - mg.right, H - mg.bottom);
    ctx.stroke();

  }, [filtered, hoverIdx, resizeTick]);

  const handleMouseMove = e => {
    const canvas = canvasRef.current;
    if (!canvas || !filtered.length) return;
    const rect = canvas.getBoundingClientRect();
    const x  = e.clientX - rect.left;
    const mg = { left: 56, right: 16 };
    const cW = rect.width - mg.left - mg.right;
    let idx  = Math.round(((x - mg.left) / cW) * (filtered.length - 1));
    idx = Math.max(0, Math.min(idx, filtered.length - 1));
    setHoverIdx(idx);
  };

  if (!data?.length) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
        Historical price chart not available.
      </div>
    );
  }

  const ranges = ['3M', '6M', '1Y'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div className="chart-header">
        <span className="chart-title">
          Price History{ticker ? ` · ${ticker}` : ''}
        </span>
        <div className="chart-range-tabs">
          {ranges.map(r => (
            <button key={r} className={`chart-range-btn${range === r ? ' active' : ''}`} onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-canvas-wrap" style={{ height: 200 }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(-1)}
        />
      </div>
    </div>
  );
}
