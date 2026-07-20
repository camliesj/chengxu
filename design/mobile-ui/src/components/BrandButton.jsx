import React, { forwardRef } from 'react';
import { BrandIcon } from './BrandIcon.jsx';
import { InteractiveSurface } from './InteractiveSurface.jsx';

export const BrandButton = forwardRef(function BrandButton({
  tone = 'primary',
  disabled = false,
  loading = false,
  icon,
  iconOnly = false,
  children,
  className = '',
  ...props
}, ref) {
  return (
    <InteractiveSurface
      {...props}
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        'brand-button',
        `brand-button--${tone}`,
        iconOnly ? 'brand-button--icon' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {loading ? <BrandIcon name="refresh" size={18} decorative className="brand-button__spinner" /> : null}
      {!loading && icon ? <BrandIcon name={icon} size={18} decorative /> : null}
      {iconOnly ? <span className="sr-only">{children}</span> : children}
    </InteractiveSurface>
  );
});
