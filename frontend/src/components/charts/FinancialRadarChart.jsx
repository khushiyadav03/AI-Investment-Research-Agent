import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import ChartCard from './ChartCard';

/**
 * Normalises each metric to a 0–100 "health score" vs a healthy benchmark.
 * Higher = better for all axes (we invert bad-direction metrics).
 */
function normalise(value, min, max, invert = false) {
  if (value == null) return null;
  const clamped = Math.max(min, Math.min(max, value));
  const score   = ((clamped - min) / (max - min)) * 100;
  return invert ? 100 - score : score;
}

const BENCHMARKS = {
  'Profitability':  { label: 'Profitability',  bench: 65 },
  'Growth':         { label: 'Growth',         bench: 55 },
  'Liquidity':      { label: 'Liquidity',      bench: 60 },
  'Valuation':      { label: 'Valuation',      bench: 50 },
  'Debt Safety':    { label: 'Debt Safety',    bench: 60 },
  'Margins':        { label: 'Margins',        bench: 55 },
};

export default function FinancialRadarChart({ fs }) {
  // Build normalised scores
  const profitability = normalise((fs.profitMargin ?? 0) * 100, -20, 40);
  const growth        = normalise((fs.revenueGrowth ?? 0) * 100, -20, 60);
  const liquidity     = normalise(fs.currentRatio ?? 0, 0, 3);
  const valuation     = normalise(fs.peRatio ?? 0, 0, 60, true); // lower PE = better
  const debtSafety    = normalise(fs.debtToEquity ?? 0, 0, 300, true); // lower D/E = better
  const margins       = normalise((fs.operatingMargin ?? fs.grossMargin ?? 0) * 100, -10, 50);

  const scores = { profitability, growth, liquidity, valuation, debtSafety, margins };
  const validCount = Object.values(scores).filter(v => v != null).length;
  if (validCount < 3) return null; // don't render with too little data

  const data = [
    { axis: 'Profitability', company: Math.round(profitability ?? 0), benchmark: BENCHMARKS['Profitability'].bench },
    { axis: 'Growth',        company: Math.round(growth       ?? 0), benchmark: BENCHMARKS['Growth'].bench },
    { axis: 'Liquidity',     company: Math.round(liquidity    ?? 0), benchmark: BENCHMARKS['Liquidity'].bench },
    { axis: 'Valuation',     company: Math.round(valuation    ?? 0), benchmark: BENCHMARKS['Valuation'].bench },
    { axis: 'Debt Safety',   company: Math.round(debtSafety   ?? 0), benchmark: BENCHMARKS['Debt Safety'].bench },
    { axis: 'Margins',       company: Math.round(margins      ?? 0), benchmark: BENCHMARKS['Margins'].bench },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{d?.axis}</div>
        <div style={{ color: '#FF6B35' }}>Company: <strong>{d?.company}</strong>/100</div>
        <div style={{ color: 'var(--text-muted)' }}>Benchmark: {d?.benchmark}/100</div>
      </div>
    );
  };

  return (
    <ChartCard title="Financial Health Radar" icon="activity" subtitle="vs healthy benchmark (100 = ideal)">
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="Benchmark" dataKey="benchmark" stroke="#E5E7EB" fill="#E5E7EB" fillOpacity={0.25} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          <Radar name="Company"   dataKey="company"   stroke="#FF6B35" fill="#FF6B35" fillOpacity={0.18} strokeWidth={2} dot={{ r: 4, fill: '#FF6B35' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(name) => <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{name}</span>}
            iconType="circle" iconSize={8}
          />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
