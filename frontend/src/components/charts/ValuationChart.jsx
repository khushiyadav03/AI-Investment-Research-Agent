import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from 'recharts';
import ChartCard from './ChartCard';

/**
 * Compares company valuation multiples vs typical S&P 500 / sector benchmarks.
 * Shows P/E, P/B, PEG side by side with a benchmark reference line.
 */
const BENCHMARKS = {
  'P/E Ratio':  { bench: 22,  goodBelow: true,  label: 'P/E' },
  'P/B Ratio':  { bench: 3.5, goodBelow: true,  label: 'P/B' },
  'PEG Ratio':  { bench: 1.5, goodBelow: true,  label: 'PEG' },
};

function barColor(value, bench, goodBelow) {
  if (!goodBelow) return value >= bench ? '#1FAA59' : '#FF8A00';
  if (value <= bench * 0.8)  return '#1FAA59';
  if (value <= bench * 1.3)  return '#FF8A00';
  return '#E8372A';
}

export default function ValuationChart({ fs }) {
  const rows = [
    fs.peRatio      != null && { name: 'P/E Ratio', value: parseFloat(fs.peRatio.toFixed(2)),     bench: BENCHMARKS['P/E Ratio'].bench, goodBelow: true },
    fs.priceToBook  != null && { name: 'P/B Ratio', value: parseFloat(fs.priceToBook.toFixed(2)), bench: BENCHMARKS['P/B Ratio'].bench, goodBelow: true },
    fs.pegRatio     != null && { name: 'PEG Ratio', value: parseFloat(fs.pegRatio.toFixed(2)),    bench: BENCHMARKS['PEG Ratio'].bench, goodBelow: true },
  ].filter(Boolean);

  if (rows.length === 0) return null;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{d.name}</div>
        <div style={{ color: barColor(d.value, d.bench, d.goodBelow) }}>Company: <strong>{d.value}x</strong></div>
        <div style={{ color: 'var(--text-muted)' }}>S&P 500 avg: {d.bench}x</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {d.goodBelow ? 'Lower = cheaper valuation' : 'Higher = stronger growth'}
        </div>
      </div>
    );
  };

  return (
    <ChartCard title="Valuation vs Market" icon="database" subtitle="Company multiples vs S&P 500 averages">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={rows} margin={{ top: 16, right: 24, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={32}
            tickFormatter={v => `${v}x`} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          {/* Benchmark reference lines */}
          {rows.map(r => (
            <ReferenceLine key={r.name} y={r.bench} stroke="rgba(0,0,0,0.15)"
              strokeDasharray="4 3" strokeWidth={1.5} />
          ))}
          <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={44} maxBarSize={60}>
            {rows.map((r, i) => (
              <Cell key={i} fill={barColor(r.value, r.bench, r.goodBelow)} />
            ))}
            <LabelList dataKey="value" position="top" formatter={v => `${v}x`}
              style={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {[['#1FAA59','Attractive'],['#FF8A00','Fair'],['#E8372A','Expensive']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          --- S&P 500 avg
        </div>
      </div>
    </ChartCard>
  );
}
