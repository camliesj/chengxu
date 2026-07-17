import React, { useId } from 'react';
import { BrandIcon } from './BrandIcon.jsx';

export function BrandField({
  label,
  error,
  leadingIcon,
  trailingAction,
  className = '',
  id,
  forceState,
  ...inputProps
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <label
      className={['brand-field', error ? 'brand-field--error' : '', className].filter(Boolean).join(' ')}
      htmlFor={inputId}
      data-force-state={forceState}
      data-interaction-ready="true"
    >
      <span className="brand-field__label">{label}</span>
      <span className="brand-field__control">
        {leadingIcon ? (
          <span className="brand-field__leading" aria-hidden="true">
            <BrandIcon name={leadingIcon} size={18} decorative />
          </span>
        ) : null}
        <input
          {...inputProps}
          id={inputId}
          className="brand-field__input"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
        />
        {trailingAction ? <span className="brand-field__trailing">{trailingAction}</span> : null}
      </span>
      {error ? <span id={errorId} className="brand-field__error">{error}</span> : null}
    </label>
  );
}
