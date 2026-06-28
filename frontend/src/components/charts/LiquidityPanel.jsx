import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from './ChartCard';

/**
 * Shows Current Ratio and Quick Ratio as two radial/arc gauges.
 * Also shows cash vs debt if available.
 */
function fmtBig(n) {
  if (n == null) return null;
  if (Math.abs(n) >= 1e12) return `${(n/1e12).toFixed(1)}T`;
  if (Math.abs(n) >= 1e9)  return `${(n/1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6)  return `${(n/1e6).toFixed(1)}M`;
  return n.toLocaleString();
}

function ratioColor(v, goodAbove = 1) {
  if (v >= goodAbove * 1.5) return '#1FAA59';
  if (v >= goodAbove)       return '#FF8A00';
  return '#E8372A';
}

function RatioGauge({ label, value, max = 4, goodAbove = 1 }) {
  if (value == null) return null;
  const pct  = Math.min((value / max) * 100, 100);
  const color = ratioColor(value, goodAbove);
  const data  = [{ value: pct, fill: color }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 100 }}>
      <div style={{ position: 'relative', width: 88, height: 88 }}>
        <ResponsiveContainer width={88} height={88}>
          <RadialBarChart cx={44} cy={44} innerRadius={28} outerRadius={40}
            startAngle={220} endAngle={-40} data={data} barSize={10}>
            {/* Track */}
            <RadialBar dataKey="value" background={{ fill: 'var(--border)' }} cornerRadius={5} />
            <Tooltip formatter={(v) => [`${value.toFixed(2)}x`, label]} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800, color, fontFamily: 'var(--font-title)', lineHeight: 1 }}>
            {value.toFixed(1)}
          </span>
          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>x</span>
        </div>
      </div>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>{label}</div>
      <div style={{ fontSize: '0.65rem', color: color, fontWeight: 700 }}>
        {value >= goodAbove ? 'Healthy' : 'Below benchmark'}
      </div>
    </div>
  );
}

export default function LiquidityPanel({ fs }) {
  const hasCurrent  = fs.currentRatio != null;
  const hasQuick    = fs.quickRatio   != null;
  const hasCash     = fs.totalCash    != null;
  const hasDebt     = fs.totalDebt    != null;

  if (!hasCurrent && !hasQuick) return null;

  return (
    <ChartCard title="Liquidity & Balance Sheet" icon="shield" subtitle="Ability to meet short-term obligations">
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Gauges */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {hasCurrent && <RatioGauge label="Current Ratio" value={fs.currentRatio} goodAbove={1.5} />}
          {hasQuick   && <RatioGauge label="Quick Ratio"   value={fs.quickRatio}   goodAbove={1.0} />}
        </div>

        {/* Cash vs Debt mini bars */}
        {(hasCash || hasDebt) && (
          <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
            {hasCash && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <span>Total Cash</span><span style={{ fontWeight: 700, color: '#1FAA59' }}>{fmtBig(fs.totalCash)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((fs.totalCash / ((fs.totalCash||0) + (fs.totalDebt||fs.totalCash||1))) * 100, 100)}%`, background: '#1FAA59', borderRadius: 3 }} />
                </div>
              </div>
            )}
            {hasDebt && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <span>Total Debt</span><span style={{ fontWeight: 700, color: '#E8372A' }}>{fmtBig(fs.totalDebt)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((fs.totalDebt / ((fs.totalCash||0) + (fs.totalDebt||1))) * 100, 100)}%`, background: '#E8372A', borderRadius: 3 }} />
                </div>
              </div>
            )}
            {hasCash && hasDebt && (
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', paddingTop: 2 }}>
                Cash/Debt ratio: <strong style={{ color: fs.totalCash >= fs.totalDebt ? '#1FAA59' : '#E8372A' }}>
                  {(fs.totalCash / fs.totalDebt).toFixed(2)}x
                </strong>
              </div>
            )}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
