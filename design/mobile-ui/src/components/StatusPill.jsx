import React from 'react';
import { AlertCircle, CheckCircle2, CircleDot, ShieldAlert } from 'lucide-react';

const STATUS_META = {
  primary: { Icon: CircleDot, className: 'status-pill--primary' },
  success: { Icon: CheckCircle2, className: 'status-pill--success' },
  warning: { Icon: AlertCircle, className: 'status-pill--warning' },
  danger: { Icon: ShieldAlert, className: 'status-pill--danger' },
};

export function StatusPill({ tone = 'primary', children }) {
  const meta = STATUS_META[tone] ?? STATUS_META.primary;
  const Icon = meta.Icon;
  return (
    <span className={['status-pill', meta.className].join(' ')}>
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}
