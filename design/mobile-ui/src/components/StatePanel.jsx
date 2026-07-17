import React from 'react';
import { BrandIcon } from './BrandIcon.jsx';

const ICONS = {
  loading: 'refresh',
  empty: 'records',
  error: 'offline',
  permission: 'shield',
};

export function StatePanel({ type, title, description, actionLabel }) {
  const icon = ICONS[type] ?? 'records';

  return (
    <section className={`state-panel state-panel--${type}`} data-state-panel={type}>
      <span className="state-panel__icon" aria-hidden="true">
        <BrandIcon name={icon} size={22} strokeWidth={2} decorative />
      </span>
      <div className="state-panel__copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actionLabel ? (
        <button type="button" className="atlas-button atlas-button--secondary">
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
