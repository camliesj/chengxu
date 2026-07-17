import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { BRAND_ICON_MAP } from '../assets/brand/icon-map.js';

export function BrandIcon({
  name,
  size = 24,
  strokeWidth = 1.5,
  decorative = false,
  label,
  ...props
}) {
  const icon = BRAND_ICON_MAP[name];

  if (!icon) {
    throw new Error(`Unknown brand icon: ${name}`);
  }

  return (
    <HugeiconsIcon
      {...props}
      data-brand-icon={name}
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : label}
      role={decorative ? undefined : 'img'}
      focusable="false"
    />
  );
}
