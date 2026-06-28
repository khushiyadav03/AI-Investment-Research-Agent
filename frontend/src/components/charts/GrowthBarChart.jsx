import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from 'recharts';
import ChartCard from './ChartCard';

const fmt = (v) => `${(v * 100).toFixed(1)}%`;

export default function GrowthBarChart({ fs }) {
  const fields = [
    { name: 'Revenue Growth',  value: fs.revenueGrowth },
    { name: 'Earnings Growth', value: fs.earningsGrowth },
  ].filter(f => f.value != null);

  if (fields.length === 0) return null;

  const data = fields.map(f => ({ name: f.name, value: f.value }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const v = payload[0].value;
    return (
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{payload[0].payload.name}</div>
        <div style={{ color: v >= 0 ? '#1FAA59' : '#E8372A', fontWeight: 700 }}>{fmt(v)}</div>
      </div>
    );
  };

  return (
    <ChartCard title="Growth Indicators" icon="trending" subtitle="YoY growth rates">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={44} />
          <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.value >= 0 ? '#1FAA59' : '#E8372A'} />
            ))}
            <LabelList dataKey="value" position="top" formatter={fmt}
              style={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
