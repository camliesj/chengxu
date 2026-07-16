import React from 'react';
import { CalendarClock, ChevronRight, FileCheck2, Search, ShieldCheck } from 'lucide-react';
import { MobileShell } from '../components/MobileShell.jsx';
import { StatusPill } from '../components/StatusPill.jsx';
import { customerRecords, historyRecords, insuranceRecords } from '../mock-data.js';

const RECORD_TABS = [
  { id: 'customers', label: '客户车辆' },
  { id: 'insurance', label: '车辆保险' },
  { id: 'history', label: '维修历史' },
];

function RecordTabs({ active }) {
  return (
    <div className="record-tabs" role="tablist" aria-label="档案类型">
      {RECORD_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`record-tabs__item${active === tab.id ? ' record-tabs__item--active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function RecordSearch({ placeholder }) {
  return (
    <label className="record-search">
      <Search size={17} strokeWidth={2} aria-hidden="true" />
      <span className="sr-only">搜索档案</span>
      <input type="search" placeholder={placeholder} />
    </label>
  );
}

function RecordShell({ screenId, title, subtitle, active, children }) {
  return (
    <MobileShell
      screenId={screenId}
      eyebrow="业务档案"
      title={title}
      subtitle={subtitle}
      activeTab="records"
      showBottomNav
    >
      <div className="records-screen">
        <RecordTabs active={active} />
        {children}
      </div>
    </MobileShell>
  );
}

export function CustomerRecordsScreen() {
  return (
    <RecordShell
      screenId="records-customers"
      title="客户车辆"
      subtitle="按客户或车辆快速调取完整档案"
      active="customers"
    >
      <RecordSearch placeholder="搜索客户、手机号或车牌" />
      <div className="record-list">
        {customerRecords.map((record) => (
          <article className="record-card" key={record.plate}>
            <div className="record-card__top">
              <div>
                <h2>{record.plate}</h2>
                <p>{record.customer} · {record.phone}</p>
              </div>
              <StatusPill tone="primary">{record.vehicleType}</StatusPill>
            </div>
            <dl className="record-card__facts">
              <div><dt>车型</dt><dd>{record.model}</dd></div>
              <div><dt>保险公司</dt><dd>{record.insurer}</dd></div>
            </dl>
            <button type="button" className="record-card__link">
              <span>维修记录 {record.repairs} 单</span>
              <ChevronRight size={17} strokeWidth={2} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </RecordShell>
  );
}

export function InsuranceRecordsScreen() {
  return (
    <RecordShell
      screenId="records-insurance"
      title="车辆保险"
      subtitle="查看到期时间与续保跟进状态"
      active="insurance"
    >
      <RecordSearch placeholder="搜索车牌、客户或保险公司" />
      <div className="record-list">
        {insuranceRecords.map((record) => (
          <article className="record-card record-card--insurance" key={record.plate}>
            <div className="record-card__top">
              <div>
                <p className="record-card__eyebrow">{record.insurer}</p>
                <h2>{record.plate}</h2>
                <p>{record.customer} · {record.model}</p>
              </div>
              <StatusPill tone={record.tone}>{record.remaining}</StatusPill>
            </div>
            <div className="record-card__highlight">
              <CalendarClock size={18} strokeWidth={2} aria-hidden="true" />
              <div><span>保险到期</span><strong>{record.expiryDate}</strong></div>
            </div>
            <button type="button" className="record-card__link">
              <span>查看保险档案</span>
              <ChevronRight size={17} strokeWidth={2} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </RecordShell>
  );
}

export function HistoryRecordsScreen() {
  return (
    <RecordShell
      screenId="records-history"
      title="维修历史"
      subtitle="仅归档已经完成结算的历史工单"
      active="history"
    >
      <RecordSearch placeholder="搜索工单号、车牌或客户" />
      <div className="record-list">
        {historyRecords.map((record) => (
          <article className="record-card record-card--history" key={record.orderNo}>
            <div className="record-card__top">
              <div>
                <p className="record-card__eyebrow">{record.orderNo}</p>
                <h2>{record.plate}</h2>
                <p>{record.customer} · {record.model}</p>
              </div>
              <StatusPill tone="success">已结算</StatusPill>
            </div>
            <p className="record-card__summary">{record.repairSummary}</p>
            <dl className="record-card__facts">
              <div><dt>结算金额</dt><dd>{record.amount}</dd></div>
              <div><dt>结算时间</dt><dd>{record.settledAt}</dd></div>
            </dl>
            <div className="record-card__receipt">
              {record.hasReceipt ? <FileCheck2 size={17} /> : <ShieldCheck size={17} />}
              <span>{record.hasReceipt ? '到账回执已归档' : '无到账回执'}</span>
            </div>
          </article>
        ))}
      </div>
    </RecordShell>
  );
}
