import React from 'react';
import { SCREEN_CATALOG } from '../screen-catalog.js';
import { MetricCard } from '../components/MetricCard.jsx';
import { MobileShell } from '../components/MobileShell.jsx';
import { StatusPill } from '../components/StatusPill.jsx';
import { LoginCompanyScreen } from './AuthScreens.jsx';

const GROUP_TAB_MAP = {
  workbench: 'workbench',
  orders: 'orders',
  forms: 'add',
  records: 'records',
  system: 'profile',
};

const PLACEHOLDER_METRICS = [
  { label: '当前阶段', value: 'Task 1', detail: '保留路由契约', tone: 'neutral' },
  { label: '后续实现', value: '待补业务 UI', detail: '继续沿用共享壳层', tone: 'primary' },
  { label: '状态标签', value: '可复用', detail: '后续任务直接接入', tone: 'success' },
  { label: '响应式', value: '移动优先', detail: '统一手机壳层约束', tone: 'warning' },
];

function CatalogPlaceholderScreen({ id, label, group, role }) {
  const activeTab = GROUP_TAB_MAP[group] ?? 'workbench';
  const offline = id === 'offline-readonly';

  return (
    <MobileShell
      screenId={id}
      eyebrow="任务 1 占位原型"
      title={label}
      subtitle="当前保留屏幕契约、共享移动壳层与导航位置，业务 UI 在后续任务继续替换。"
      activeTab={activeTab}
      offline={offline}
      showBottomNav
    >
      <section className="placeholder-screen">
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

        <div className="placeholder-screen__metrics">
          {PLACEHOLDER_METRICS.map((metric) => (
            <MetricCard key={`${id}-${metric.label}`} {...metric} />
          ))}
        </div>

        <div className="placeholder-screen__stack">
          <section className="placeholder-panel">
            <div className="placeholder-panel__header">
              <h2>共享壳层检查</h2>
              <StatusPill tone="primary">底部导航固定</StatusPill>
            </div>
            <p>
              当前占位页已切换到共享移动壳层，可直接验证 header、独立滚动 main 与五栏底部导航。
            </p>
          </section>

          <section className="placeholder-panel">
            <div className="placeholder-panel__header">
              <h2>后续接入提示</h2>
              <StatusPill tone="warning">待替换业务内容</StatusPill>
            </div>
            <p>
              后续任务会基于同一套导航、高度约束与卡片变体替换这里的占位块，不再重新搭壳。
            </p>
          </section>

          {Array.from({ length: 6 }, (_, index) => (
            <section className="placeholder-panel" key={`${id}-section-${index + 1}`}>
              <div className="placeholder-panel__header">
                <h2>占位检查块 {index + 1}</h2>
                <StatusPill tone={index % 2 === 0 ? 'success' : 'danger'}>
                  {index % 2 === 0 ? '滚动验证' : '布局验证'}
                </StatusPill>
              </div>
              <p>
                这是用于拉长内容区的审查占位块，确保内容超出一屏时，仅主滚动区移动，底部导航仍稳定贴合壳层底部。
              </p>
            </section>
          ))}
        </div>
      </section>
    </MobileShell>
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
