import React, { forwardRef } from 'react';

const NATIVE_DISABLEABLE = new Set(['button', 'input', 'select', 'textarea']);

export const InteractiveSurface = forwardRef(function InteractiveSurface(
  {
    as: Component = 'button',
    disabled = false,
    selected,
    className = '',
    children,
    type,
    ...props
  },
  ref,
) {
  const isNative = typeof Component === 'string' && NATIVE_DISABLEABLE.has(Component);
  const isButton = Component === 'button';

  return (
    <Component
      {...props}
      ref={ref}
      className={['interactive-surface', className].filter(Boolean).join(' ')}
      data-interaction-ready="true"
      data-selected={selected ? 'true' : undefined}
      disabled={isNative ? disabled : undefined}
      aria-disabled={disabled ? 'true' : undefined}
      aria-pressed={isButton && selected !== undefined ? Boolean(selected) : undefined}
      tabIndex={!isNative && disabled ? -1 : props.tabIndex}
      type={isButton ? (type ?? 'button') : type}
    >
      {children}
    </Component>
  );
});
