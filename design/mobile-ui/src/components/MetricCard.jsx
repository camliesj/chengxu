import React from 'react';
import { ChevronRight } from 'lucide-react';

export function MetricCard({ label, value, detail, tone = 'default' }) {
  return (
    <section className={['metric-card', `metric-card--${tone}`].join(' ')}>
      <div className="metric-card__content">
        <p className="metric-card__label">{label}</p>
        <p className="metric-card__value">{value}</p>
        {detail ? <p className="metric-card__detail">{detail}</p> : null}
      </div>
      <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
    </section>
  );
}
