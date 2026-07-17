import React from 'react';
import { BrandIcon } from './BrandIcon.jsx';

const NAV_ITEMS = [
  { id: 'workbench', label: '工作台', icon: 'home' },
  { id: 'orders', label: '工单', icon: 'orders' },
  { id: 'add', label: '新增', icon: 'add', primary: true },
  { id: 'records', label: '档案', icon: 'records' },
  { id: 'profile', label: '我的', icon: 'profile' },
];

export function BottomNav({ activeTab = 'workbench' }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="主导航" data-mobile-nav>
      {NAV_ITEMS.map(({ id, label, icon, primary }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            className={[
              'mobile-bottom-nav__item',
              primary ? 'mobile-bottom-nav__item--primary' : '',
              isActive ? 'mobile-bottom-nav__item--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="mobile-bottom-nav__icon-wrap" aria-hidden="true">
              <BrandIcon name={icon} size={primary ? 20 : 18} strokeWidth={2} decorative />
            </span>
            <span className="mobile-bottom-nav__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
