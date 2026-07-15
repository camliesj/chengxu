import React from 'react';
import { ChevronRight } from 'lucide-react';
import { MetricCard } from '../components/MetricCard.jsx';
import { MobileShell } from '../components/MobileShell.jsx';
import { OrderCard } from '../components/OrderCard.jsx';
import {
  adminWorkbenchMetrics,
  adminWorkbenchOrders,
  adminRoleSummary,
  employeeWorkbenchMetrics,
  employeeWorkbenchOrders,
  employeeRoleSummary,
  workbenchStateBand,
} from '../mock-data.js';

function StateBand() {
  return (
    <section className="workbench-state-band" aria-label="工单状态概览">
      {workbenchStateBand.map((item) => (
        <button key={item.label} type="button" className="workbench-state-band__item">
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
