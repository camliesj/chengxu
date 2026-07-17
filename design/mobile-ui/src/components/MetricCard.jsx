import React from 'react';
import { BrandIcon } from './BrandIcon.jsx';
import { InteractiveSurface } from './InteractiveSurface.jsx';

export function MetricCard({
  label,
  value,
  detail,
  tone = 'neutral',
  disabled = false,
  selected = false,
  className = '',
  ...props
}) {
  return (
    <InteractiveSurface
      {...props}
      disabled={disabled}
      selected={selected}
      className={['metric-card', `metric-card--${tone}`, className].filter(Boolean).join(' ')}
    >
      <div className="metric-card__content">
        <p className="metric-card__label">{label}</p>
        <p className="metric-card__value">{value}</p>
        {detail ? <p className="metric-card__detail">{detail}</p> : null}
      </div>
      <BrandIcon name="arrowRight" size={18} strokeWidth={1.8} decorative />
    </InteractiveSurface>
  );
}
