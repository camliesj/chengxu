import React from 'react';
import { CloudOff, Inbox, LoaderCircle, ShieldX } from 'lucide-react';

const ICONS = {
  loading: LoaderCircle,
  empty: Inbox,
  error: CloudOff,
  permission: ShieldX,
};

export function StatePanel({ type, title, description, actionLabel }) {
  const Icon = ICONS[type] ?? Inbox;

  return (
    <section className={`state-panel state-panel--${type}`} data-state-panel={type}>
      <span className="state-panel__icon" aria-hidden="true">
        <Icon size={22} strokeWidth={2} />
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
