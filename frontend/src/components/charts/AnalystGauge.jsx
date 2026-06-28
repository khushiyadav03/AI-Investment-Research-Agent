import React from 'react';
import ChartCard from './ChartCard';

/**
 * recommendationMean: 1 = Strong Buy, 2 = Buy, 3 = Hold, 4 = Sell, 5 = Strong Sell
 * We convert to a 0–100 "bull score": score = ((5 - mean) / 4) * 100
 */
const LABELS = { 1: 'Strong Buy', 2: 'Buy', 3: 'Hold', 4: 'Sell', 5: 'Strong Sell' };
const KEY_COLORS = {
  strongbuy:  '#1FAA59',
  buy:        '#4CAF7D',
  hold:       '#F59E0B',
  sell:       '#E8372A',
  strongsell: '#B91C1C',
  underperform: '#E8372A',
  underweight:  '#E8372A',
  outperform:   '#1FAA59',
  overweight:   '#1FAA59',
  neutral:      '#F59E0B',
};

function keyColor(key) {
  return KEY_COLORS[key?.toLowerCase().replace(/[\s-]/g, '')] || '#F59E0B';
}

export default function AnalystGauge({ fs }) {
  const { recommendationKey, recommendationMean, targetMeanPrice, currentPrice } = fs;
  if (!recommendationKey && !recommendationMean) return null;

  const mean       = recommendationMean ?? 3;
  const bullScore  = Math.round(((5 - mean) / 4) * 100);
  const color      = keyColor(recommendationKey);
  const label      = recommendationKey
    ? recommendationKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : LABELS[Math.round(mean)] || 'Hold';

  // SVG arc gauge
  const R   = 52;
  const cx  = 80, cy = 80;
  const startAngle = 200;
  const sweep      = 140;
  const endAngle   = startAngle - sweep;
  const toRad      = (deg) => (deg * Math.PI) / 180;
  const arcX       = (deg) => cx + R * Math.cos(toRad(deg));
  const arcY       = (deg) => cy - R * Math.sin(toRad(deg));
  const arcPath    = (start, end) => {
    const s  = toRad(start), e = toRad(end);
    const x1 = cx + R * Math.cos(s), y1 = cy - R * Math.sin(s);
    const x2 = cx + R * Math.cos(e), y2 = cy - R * Math.sin(e);
    return `M ${x1} ${y1} A ${R} ${R} 0 ${Math.abs(start - end) > 180 ? 1 : 0} 0 ${x2} ${y2}`;
  };

  const filledEnd = startAngle - (sweep * bullScore) / 100;

  const upside = targetMeanPrice && currentPrice
    ? (((targetMeanPrice - currentPrice) / currentPrice) * 100).toFixed(1)
    : null;

  return (
    <ChartCard title="Analyst Consensus" icon="award" subtitle={`${Math.max(1, Math.round(mean * 10 / 5))} analyst rating`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        {/* Arc gauge */}
        <svg width={160} height={110} style={{ flexShrink: 0 }}>
          {/* Track */}
          <path d={arcPath(startAngle, endAngle)} fill="none" stroke="var(--border)" strokeWidth={10} strokeLinecap="round" />
          {/* Fill */}
          {bullScore > 0 && (
            <path d={arcPath(startAngle, filledEnd)} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
          )}
          {/* Label */}
          <text x={cx} y={cy + 6} textAnchor="middle" fontSize={22} fontWeight={800} fill={color} fontFamily="var(--font-title)">{bullScore}</text>
          <text x={cx} y={cy + 22} textAnchor="middle" fontSize={10} fill="var(--text-muted)" fontFamily="var(--font-body)">Bull Score</text>
          <text x={arcX(startAngle) - 4} y={arcY(startAngle) + 14} textAnchor="middle" fontSize={9} fill="var(--text-muted)">Sell</text>
          <text x={arcX(endAngle) + 4}   y={arcY(endAngle) + 14}  textAnchor="middle" fontSize={9} fill="var(--text-muted)">Buy</text>
        </svg>

        {/* Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '5px 14px', borderRadius: 20, background: `${color}1A`, border: `1.5px solid ${color}40`, color, fontSize: '0.88rem', fontWeight: 700, display: 'inline-block' }}>
            {label}
          </div>
          {targetMeanPrice && (
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>Target Price</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-title)' }}>
                ${targetMeanPrice.toFixed(2)}
              </div>
              {upside && (
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: parseFloat(upside) >= 0 ? '#1FAA59' : '#E8372A' }}>
                  {parseFloat(upside) >= 0 ? '▲' : '▼'} {Math.abs(upside)}% vs current
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ChartCard>
  );
}
