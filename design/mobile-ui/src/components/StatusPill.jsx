import React from 'react';
import { BrandIcon } from './BrandIcon.jsx';

const STATUS_META = {
  primary: { icon: 'car', className: 'status-pill--primary' },
  success: { icon: 'check', className: 'status-pill--success' },
  warning: { icon: 'warning', className: 'status-pill--warning' },
  danger: { icon: 'shield', className: 'status-pill--danger' },
};

export function StatusPill({ tone = 'primary', children }) {
  const meta = STATUS_META[tone] ?? STATUS_META.primary;
  return (
    <span className={['status-pill', meta.className].join(' ')}>
      <BrandIcon name={meta.icon} size={14} strokeWidth={1.8} decorative />
      <span>{children}</span>
    </span>
  );
}
