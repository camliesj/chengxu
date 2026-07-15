import React from 'react';
import {
  ClipboardList,
  FolderSearch,
  LayoutDashboard,
  Plus,
  UserRound,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'workbench', label: '工作台', Icon: LayoutDashboard },
  { id: 'orders', label: '工单', Icon: ClipboardList },
  { id: 'add', label: '新增', Icon: Plus, primary: true },
  { id: 'records', label: '档案', Icon: FolderSearch },
  { id: 'profile', label: '我的', Icon: UserRound },
];

export function BottomNav({ activeTab = 'workbench' }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="主导航">
      {NAV_ITEMS.map(({ id, label, Icon, primary }) => {
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
              <Icon size={primary ? 20 : 18} strokeWidth={2} />
            </span>
            <span className="mobile-bottom-nav__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
