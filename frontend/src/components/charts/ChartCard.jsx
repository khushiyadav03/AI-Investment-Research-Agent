import React from 'react';
import Icon from '../Icon';

/**
 * Shared wrapper that every chart lives inside.
 * Fades in when mounted. Hides gracefully if `show` is false.
 */
export default function ChartCard({ title, icon = 'activity', subtitle, children, style }) {
  return (
    <div className="chart-viz-card" style={style}>
      <div className="chart-viz-header">
        <div className="chart-viz-title">
          <div className="card-title-icon">
            <Icon name={icon} size={14} color="var(--color-brand)" />
          </div>
          <span>{title}</span>
        </div>
        {subtitle && <span className="chart-viz-subtitle">{subtitle}</span>}
      </div>
      <div className="chart-viz-body">{children}</div>
    </div>
  );
}
