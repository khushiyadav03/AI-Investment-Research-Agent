import React, { useRef, useEffect, useState } from 'react';

export default function StockChart({ data, ticker }) {
  const canvasRef = useRef(null);
  const [selectedRange, setSelectedRange] = useState('1Y'); // '3M' | '6M' | '1Y'
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [filteredData, setFilteredData] = useState([]);
  const [resizeTrigger, setResizeTrigger] = useState(0);

  // Monitor window resize to redraw canvas
  useEffect(() => {
    const handleResize = () => {
      setResizeTrigger(prev => prev + 1);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter data based on selected range
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    const today = new Date();
    let cutoffDate = new Date();
    
    if (selectedRange === '3M') {
      cutoffDate.setDate(today.getDate() - 90);
    } else if (selectedRange === '6M') {
      cutoffDate.setDate(today.getDate() - 180);
    } else {
      cutoffDate.setDate(today.getDate() - 365); // 1Y
    }
    
    const filtered = data.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate;
    });
    
    // Fallback to full data if filter results in too few points
    setFilteredData(filtered.length > 5 ? filtered : data);
    setHoverIndex(-1); // Reset hover
  }, [data, selectedRange]);

  // Handle draw logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || filteredData.length === 0) return;

    const ctx = canvas.getContext('2d');
    
    // Set display sizes (double for retina/high-DPI displays)
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const width = rect.width;
    const height = rect.height;

    const margin = { top: 25, right: 20, bottom: 30, left: 55 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    ctx.clearRect(0, 0, width, height);

    const prices = filteredData.map(d => d.close);
    const maxPrice = Math.max(...prices) * 1.02;
    const minPrice = Math.min(...prices) * 0.98;
    const priceRange = maxPrice - minPrice;

    // Map points
    const points = filteredData.map((d, index) => {
      const x = margin.left + (index / (filteredData.length - 1)) * chartWidth;
      const y = margin.top + chartHeight - ((d.close - minPrice) / priceRange) * chartHeight;
      return { x, y, price: d.close, date: d.date };
    });

    // 1. Draw Grid Lines & Y Axis Labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#475569'; // var(--text-muted)
    ctx.font = '10px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yGridCount = 4;
    for (let i = 0; i <= yGridCount; i++) {
      const priceVal = minPrice + (i / yGridCount) * priceRange;
      const y = margin.top + chartHeight - (i / yGridCount) * chartHeight;
      
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();

      ctx.fillText(`$${priceVal.toFixed(2)}`, margin.left - 8, y);
    }

    // 2. Draw X Axis Labels (Dates)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xLabelCount = 3;
    const step = Math.floor(filteredData.length / (xLabelCount - 1)) || 1;
    
    for (let i = 0; i < xLabelCount; i++) {
      let idx = i * step;
      if (idx >= filteredData.length) idx = filteredData.length - 1;
      if (idx < 0) continue;
      
      const pt = points[idx];
      const dateParts = pt.date.split('-');
      let dateLabel = pt.date;
      if (dateParts.length === 3) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthIndex = parseInt(dateParts[1]) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          dateLabel = `${monthNames[monthIndex]} ${dateParts[2]}`;
        }
      }

      ctx.fillText(dateLabel, pt.x, height - margin.bottom + 8);
    }

    // 3. Draw Gradient Fill Area Under the Line
    const areaGradient = ctx.createLinearGradient(0, margin.top, 0, margin.top + chartHeight);
    areaGradient.addColorStop(0, 'rgba(0, 242, 254, 0.15)'); // Cyan Glow
    areaGradient.addColorStop(1, 'rgba(0, 242, 254, 0.0)');
    
    ctx.fillStyle = areaGradient;
    ctx.beginPath();
    ctx.moveTo(points[0].x, margin.top + chartHeight);
    points.forEach(pt => ctx.lineTo(pt.x, pt.y));
    ctx.lineTo(points[points.length - 1].x, margin.top + chartHeight);
    ctx.closePath();
    ctx.fill();

    // 4. Draw Price Line
    ctx.strokeStyle = '#00f2fe'; // Cyber Cyan
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // 5. Draw Hover State (Vertical line, highlight circle, and canvas tooltip)
    if (hoverIndex >= 0 && hoverIndex < points.length) {
      const activePt = points[hoverIndex];

      // Draw dashed crosshair line
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(activePt.x, margin.top);
      ctx.lineTo(activePt.x, height - margin.bottom);
      ctx.stroke();
      ctx.restore();

      // Draw glowing node circle
      ctx.beginPath();
      ctx.arc(activePt.x, activePt.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#00f2fe';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f2fe';
      ctx.fill();
      
      // Draw outer ring
      ctx.beginPath();
      ctx.arc(activePt.x, activePt.y, 10, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Reset shadow for tooltip drawing
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Draw Tooltip Callout Panel (Dynamic Canvas drawing)
      const tipVal = `$${activePt.price.toFixed(2)}`;
      const tipDate = activePt.date;
      ctx.font = 'bold 10px Plus Jakarta Sans, sans-serif';
      const w1 = ctx.measureText(tipVal).width;
      ctx.font = '9px Plus Jakarta Sans, sans-serif';
      const w2 = ctx.measureText(tipDate).width;
      
      const tooltipW = Math.max(w1, w2) + 20;
      const tooltipH = 34;
      
      // Position tooltip dynamically to avoid borders
      let tooltipX = activePt.x - tooltipW / 2;
      if (tooltipX < margin.left) tooltipX = margin.left + 5;
      if (tooltipX + tooltipW > width - margin.right) tooltipX = width - margin.right - tooltipW - 5;
      
      let tooltipY = activePt.y - tooltipH - 12;
      if (tooltipY < margin.top) tooltipY = activePt.y + 12; // flip underneath if too high

      // Tooltip Glass container
      ctx.fillStyle = 'rgba(10, 14, 28, 0.95)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      
      // Draw rounded rectangle
      const radius = 6;
      ctx.beginPath();
      ctx.roundRect(tooltipX, tooltipY, tooltipW, tooltipH, radius);
      ctx.fill();
      ctx.stroke();

      // Tooltip Text
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tipVal, tooltipX + tooltipW / 2, tooltipY + 12);
      
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px Plus Jakarta Sans, sans-serif';
      ctx.fillText(tipDate, tooltipX + tooltipW / 2, tooltipY + 24);
    }

    // 6. Draw axis borders
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();

  }, [filteredData, hoverIndex, resizeTrigger]);

  // Track mouse coordinates to locate nearest point index
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || filteredData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    const margin = { left: 55, right: 20 };
    const chartWidth = rect.width - margin.left - margin.right;
    
    // Compute exact hover ratio
    const hoverRatio = (x - margin.left) / chartWidth;
    let targetIndex = Math.round(hoverRatio * (filteredData.length - 1));
    
    // Bounds clamping
    if (targetIndex < 0) targetIndex = 0;
    if (targetIndex >= filteredData.length) targetIndex = filteredData.length - 1;

    setHoverIndex(targetIndex);
  };

  const handleMouseLeave = () => {
    setHoverIndex(-1);
  };

  if (!data || data.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '20px', margin: 0 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Historical price chart not available.
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
          Stock Price ({ticker})
        </span>
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
          {['3M', '6M', '1Y'].map(range => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              style={{
                background: selectedRange === range ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                border: 'none',
                color: selectedRange === range ? '#00f2fe' : 'var(--text-secondary)',
                borderRadius: '6px',
                padding: '2px 10px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: '600',
                fontFamily: 'var(--font-title)',
                transition: 'all 0.2s'
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="chart-canvas"
        style={{ width: '100%', height: '180px', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
}
