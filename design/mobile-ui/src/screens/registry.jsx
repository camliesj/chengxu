import React from 'react';
import { SCREEN_CATALOG } from '../screen-catalog.js';
import { LoginCompanyScreen } from './AuthScreens.jsx';

function CatalogPlaceholderScreen({ id, label, group, role }) {
  return (
    <main className="atlas-root" data-screen-id={id}>
      <section className="phone-shell">
        <div className="phone-shell__status">
          <span>Android UI Atlas</span>
          <span>{id}</span>
        </div>
        <div className="phone-shell__body">
          <section className="placeholder-screen">
            <p className="placeholder-screen__eyebrow">任务 1 占位原型</p>
            <h1>{label}</h1>
            <p className="placeholder-screen__description">
              当前只建立屏幕契约、路由入口与审查占位结构，业务 UI 留待后续任务实现。
            </p>
            <dl className="placeholder-screen__meta">
              <div>
                <dt>Screen ID</dt>
                <dd>{id}</dd>
              </div>
              <div>
                <dt>Group</dt>
                <dd>{group}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{role}</dd>
              </div>
            </dl>
          </section>
        </div>
      </section>
    </main>
  );
}

const PLACEHOLDER_REGISTRY = Object.fromEntries(
  SCREEN_CATALOG.filter((screen) => screen.id !== 'login-company').map((screen) => [
    screen.id,
    function ScreenPlaceholder() {
      return <CatalogPlaceholderScreen {...screen} />;
    },
  ]),
);

export const SCREEN_REGISTRY = {
  'login-company': LoginCompanyScreen,
  ...PLACEHOLDER_REGISTRY,
};
