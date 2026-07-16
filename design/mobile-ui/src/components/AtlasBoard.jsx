import React from 'react';
import { SCREEN_CATALOG } from '../screen-catalog.js';
import { SCREEN_REGISTRY } from '../screens/registry.jsx';

export const ATLAS_GROUPS = {
  'auth-workbench': ['login-company', 'workbench-employee', 'workbench-admin'],
  'orders-overlays': [
    'orders-current',
    'orders-filter-sheet',
    'order-detail-employee',
    'order-detail-admin',
    'order-status-dialog',
    'order-settlement',
    'receipt-upload',
    'reverse-settlement-dialog',
  ],
  'create-edit-flow': [
    'order-create-customer',
    'order-create-insurance',
    'order-create-repair',
    'order-create-review',
    'order-edit',
  ],
  'records-system': [
    'records-customers',
    'records-insurance',
    'records-history',
    'profile-sync',
    'offline-readonly',
    'states-gallery',
  ],
};

const ROLE_LABELS = {
  all: '通用',
  employee: '员工',
  admin: '管理员',
};

export function AtlasBoard({ group }) {
  const ids = ATLAS_GROUPS[group] ?? [];

  return (
    <main className="atlas-board" data-atlas-group={group}>
      <header className="atlas-board__header">
        <h1>汽修管理系统 Android UI 图集</h1>
        <p>{group} · 390 × 844 设计基准</p>
      </header>
      <section className="atlas-board__grid">
        {ids.map((id) => {
          const meta = SCREEN_CATALOG.find((screen) => screen.id === id);
          const Screen = SCREEN_REGISTRY[id];
          return (
            <figure className="atlas-frame" key={id}>
              <figcaption>
                <strong>{meta.label}</strong>
                <span>{ROLE_LABELS[meta.role]} · {id}</span>
              </figcaption>
              <div className="atlas-phone"><Screen /></div>
            </figure>
          );
        })}
      </section>
    </main>
  );
}
