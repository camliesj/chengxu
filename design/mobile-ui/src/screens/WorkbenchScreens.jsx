import React from 'react';
import { ChevronRight } from 'lucide-react';
import { MetricCard } from '../components/MetricCard.jsx';
import { MobileShell } from '../components/MobileShell.jsx';
import { OrderCard } from '../components/OrderCard.jsx';
import { BrandButton } from '../components/BrandButton.jsx';
import { InteractiveSurface } from '../components/InteractiveSurface.jsx';
import { StatusPill } from '../components/StatusPill.jsx';
import {
  adminWorkbenchMetrics,
  adminWorkbenchOrders,
  adminQuickActions,
  adminRoleSummary,
  employeeWorkbenchMetrics,
  employeeWorkbenchOrders,
  employeeQuickActions,
  employeeRoleSummary,
  workbenchStateBand,
} from '../mock-data.js';

function StateBand() {
  return (
    <section className="workbench-state-band" aria-label="工单状态概览">
      {workbenchStateBand.map((item, index) => (
        <button
          key={item.label}
          type="button"
          className="workbench-state-band__item"
          data-primary-action={index === 0 ? '' : undefined}
        >
          <span className="workbench-state-band__value">{item.value}</span>
          <span className="workbench-state-band__label">{item.label}</span>
          <span className="workbench-state-band__cue">
            {item.cue}
            <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
          </span>
        </button>
      ))}
    </section>
  );
}

function MetricGrid({ metrics }) {
  return (
    <section className="workbench-metrics" aria-label="关键指标">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </section>
  );
}

function RoleSummary({ title, items }) {
  return (
    <section className="workbench-summary" aria-label={title} data-role-summary>
      <div className="workbench-section-heading">
        <h2>{title}</h2>
      </div>
      <div className="workbench-summary__list">
        {items.map((item) => (
          <div className="workbench-summary__row" key={item.label}>
            <div>
              <p>{item.label}</p>
              <span>{item.detail}</span>
            </div>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function PriorityList({ title, orders }) {
  return (
    <section className="workbench-priority" aria-label={title}>
      <div className="workbench-section-heading">
        <h2>{title}</h2>
      </div>
      <div className="workbench-priority__list">
        {orders.map((order) => (
          <OrderCard key={order.orderNo} order={order} compact onOpenLabel="查看工单" />
        ))}
      </div>
    </section>
  );
}

function WorkbenchLayout({
  screenId,
  eyebrow,
  title,
  subtitle,
  metrics,
  summaryTitle,
  summaryItems,
  taskTitle,
  orders,
}) {
  return (
    <MobileShell
      screenId={screenId}
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      activeTab="workbench"
      showBottomNav
    >
      <div className="workbench-screen">
        <StateBand />
        <MetricGrid metrics={metrics} />
        <RoleSummary title={summaryTitle} items={summaryItems} />
        <PriorityList title={taskTitle} orders={orders} />
      </div>
    </MobileShell>
  );
}

export function EmployeeWorkbenchScreen() {
  return (
    <WorkbenchLayout
      screenId="workbench-employee"
      eyebrow="员工工作台"
      title="今日工作"
      subtitle="优先处理在修推进、费用核对与保险到期提醒。"
      metrics={employeeWorkbenchMetrics}
      summaryTitle="当班概览"
      summaryItems={employeeRoleSummary}
      taskTitle="我的待办"
      orders={employeeWorkbenchOrders}
    />
  );
}

export function AdminWorkbenchScreen() {
  return (
    <WorkbenchLayout
      screenId="workbench-admin"
      eyebrow="经营与调度"
      title="管理员工作台"
      subtitle="关注结算节奏、产值进度与高优先事项。"
      metrics={adminWorkbenchMetrics}
      summaryTitle="经营摘要"
      summaryItems={adminRoleSummary}
      taskTitle="优先事项"
      orders={adminWorkbenchOrders}
    />
  );
}

export function BrandWorkbench({ role = 'employee', dispatch }) {
  const isAdmin = role === 'admin';
  const metrics = isAdmin ? adminWorkbenchMetrics : employeeWorkbenchMetrics;
  const orders = isAdmin ? adminWorkbenchOrders : employeeWorkbenchOrders;
  const quickActions = isAdmin ? adminQuickActions : employeeQuickActions;

  return (
    <div className="brand-workbench" data-role={role}>
      <div className="brand-role-switch" data-prototype-control role="group" aria-label="原型角色">
        {[
          ['employee', '员工'],
          ['admin', '管理员'],
        ].map(([value, label]) => (
          <InteractiveSurface
            key={value}
            className="brand-role-switch__item"
            selected={role === value}
            onClick={() => dispatch({ type: 'SWITCH_ROLE', role: value })}
          >
            {label}
          </InteractiveSurface>
        ))}
      </div>

      <section className="brand-workbench__hero">
        <div>
          <p>{isAdmin ? '经营与调度' : '维修顾问工作台'}</p>
          <h2>{isAdmin ? '早上好，李经理' : '早上好，张工'}</h2>
          <span>通达汽车服务中心</span>
        </div>
        <StatusPill tone="success">在线</StatusPill>
      </section>

      <section className="brand-workbench__band" aria-label="工单状态概览">
        {workbenchStateBand.map((item, index) => (
          <InteractiveSurface
            key={item.label}
            className="brand-workbench__band-item"
            onClick={() => dispatch({ type: 'SELECT_TAB', tab: index === 3 ? 'records' : 'orders' })}
          >
            <strong>{item.value}</strong><span>{item.label}</span>
          </InteractiveSurface>
        ))}
      </section>

      <section className="brand-workbench__section" aria-labelledby="brand-metrics-title">
        <div className="brand-workbench__heading"><h3 id="brand-metrics-title">{isAdmin ? '经营概览' : '今日概览'}</h3><span>实时演示数据</span></div>
        <div className="brand-workbench__metrics">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} aria-label={`${metric.label} ${metric.value}`} />
          ))}
        </div>
      </section>

      <section className="brand-workbench__section" aria-labelledby="brand-actions-title">
        <div className="brand-workbench__heading"><h3 id="brand-actions-title">快捷操作</h3></div>
        <div className="brand-workbench__actions">
          {quickActions.map((action) => (
            <BrandButton
              key={action.label}
              tone="secondary"
              icon={action.icon}
              onClick={() => dispatch({ type: 'SELECT_TAB', tab: action.targetTab })}
            >
              {action.label}
            </BrandButton>
          ))}
        </div>
      </section>

      <section className="brand-workbench__section" aria-labelledby="brand-orders-title">
        <div className="brand-workbench__heading"><h3 id="brand-orders-title">{isAdmin ? '优先事项' : '我的待办'}</h3><BrandButton tone="quiet" className="brand-workbench__view-all" onClick={() => dispatch({ type: 'SELECT_TAB', tab: 'orders' })}>查看全部</BrandButton></div>
        <div className="brand-workbench__orders">
          {orders.map((order) => (
            <OrderCard
              key={order.orderNo}
              order={order}
              compact
              interactive
              onOpenLabel="查看工单"
              onOpen={() => dispatch({ type: 'SELECT_TAB', tab: 'orders' })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
