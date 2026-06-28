import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from './ChartCard';

const CONFIG = {
  Positive: { color: '#1FAA59', bg: 'rgba(31,170,89,0.10)' },
  Neutral:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
  Negative: { color: '#E8372A', bg: 'rgba(232,55,42,0.10)' },
};

export default function SentimentDonut({ sentimentAnalysis }) {
  const { sentiment, opportunities = [], threats = [] } = sentimentAnalysis || {};
  if (!sentiment) return null;

  // Derive a rough 3-segment breakdown from the sentiment label + counts
  const posCount   = opportunities.length || 1;
  const negCount   = threats.length || 1;
  const neuCount   = 2;

  const total = posCount + negCount + neuCount;
  const data  = [
    { name: 'Positive', value: Math.round((posCount / total) * 100) },
    { name: 'Neutral',  value: Math.round((neuCount / total) * 100) },
    { name: 'Negative', value: Math.round((negCount / total) * 100) },
  ];

  const dominant = CONFIG[sentiment] || CONFIG['Neutral'];
  const label    = sentiment;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', boxShadow: 'var(--shadow-md)' }}>
        <span style={{ color: CONFIG[d.name]?.color || 'var(--text-primary)', fontWeight: 700 }}>{d.name}: {d.value}%</span>
      </div>
    );
  };

  return (
    <ChartCard title="Market Sentiment" icon="globe" subtitle="AI-derived signal from news research">
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        {/* Donut */}
        <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
          <ResponsiveContainer width={110} height={110}>
            <PieChart>
              <Pie data={data} cx={50} cy={50} innerRadius={32} outerRadius={50}
                dataKey="value" startAngle={90} endAngle={-270} strokeWidth={2} stroke="var(--bg-surface)">
                {data.map((entry) => (
                  <Cell key={entry.name} fill={CONFIG[entry.name]?.color || '#ccc'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Centre label */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: dominant.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: CONFIG[d.name]?.color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.name}</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginLeft: 'auto' }}>{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
