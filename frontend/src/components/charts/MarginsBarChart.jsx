import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import ChartCard from './ChartCard';

const fmt = (v) => `${(v * 100).toFixed(1)}%`;

const BAR_COLOR = (v) => {
  if (v >= 0.25) return '#1FAA59';
  if (v >= 0.10) return '#FF8A00';
  return '#E8372A';
};

export default function MarginsBarChart({ fs }) {
  const fields = [
    { key: 'Gross Margin',     value: fs.grossMargin },
    { key: 'EBITDA Margin',    value: fs.ebitdaMargin },
    { key: 'Operating Margin', value: fs.operatingMargin },
    { key: 'Profit Margin',    value: fs.profitMargin },
  ].filter(f => f.value != null);

  if (fields.length < 2) return null;

  const data = fields.map(f => ({ name: f.key, value: f.value }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{payload[0].payload.name}</div>
        <div style={{ color: BAR_COLOR(payload[0].value) }}>{fmt(payload[0].value)}</div>
      </div>
    );
  };

  return (
    <ChartCard title="Margin Breakdown" icon="trending" subtitle="Higher is better">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, left: 12, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 'auto']} tickFormatter={v => `${(v*100).toFixed(0)}%`}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={110}
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
            {data.map((entry, i) => (
              <Cell key={i} fill={BAR_COLOR(entry.value)} />
            ))}
            <LabelList dataKey="value" position="right" formatter={fmt}
              style={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
