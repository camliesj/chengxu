import React from 'react';
import { ChevronDown, EyeOff, LockKeyhole, UserRound } from 'lucide-react';

export function LabeledInput({
  label,
  type = 'text',
  id,
  placeholder,
  value = '',
  icon,
  disabled = false,
  readOnly = false,
}) {
  const Icon = icon;
  return (
    <label className="form-field" htmlFor={id}>
      <span className="form-field__label">{label}</span>
      <span className="form-field__control">
        {Icon ? (
          <span className="form-field__leading" aria-hidden="true">
            <Icon size={18} strokeWidth={2} />
          </span>
        ) : null}
        <input
          id={id}
          className="form-input"
          type={type}
          placeholder={placeholder}
          defaultValue={value}
          disabled={disabled}
          readOnly={readOnly}
        />
        {type === 'password' ? (
          <span className="form-field__trailing" aria-hidden="true">
            <EyeOff size={18} strokeWidth={2} />
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function LabeledSelect({ label, id, value, options, disabled = false }) {
  return (
    <label className="form-field" htmlFor={id}>
      <span className="form-field__label">{label}</span>
      <span className="form-field__control">
        <select id={id} className="form-input" defaultValue={value} disabled={disabled}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="form-field__trailing" aria-hidden="true">
          <ChevronDown size={18} strokeWidth={2} />
        </span>
      </span>
    </label>
  );
}

export function LabeledTextarea({ label, id, placeholder, value = '', rows = 4 }) {
  return (
    <label className="form-field" htmlFor={id}>
      <span className="form-field__label">{label}</span>
      <textarea
        id={id}
        className="form-input form-input--textarea"
        placeholder={placeholder}
        defaultValue={value}
        rows={rows}
      />
    </label>
  );
}

export const formIcons = {
  account: UserRound,
  password: LockKeyhole,
};
