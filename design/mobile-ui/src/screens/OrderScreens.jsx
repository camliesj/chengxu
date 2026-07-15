import React from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  FileImage,
  Filter,
  HandCoins,
  ImagePlus,
  Phone,
  ReceiptText,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Wrench,
} from 'lucide-react';
import { BottomSheet, ConfirmDialog, FullScreenModal, UploadHint } from '../components/Overlays.jsx';
import { MobileShell } from '../components/MobileShell.jsx';
import { OrderCard } from '../components/OrderCard.jsx';
import { StatusPill } from '../components/StatusPill.jsx';
import {
  currentOrders,
  detailSections,
  detailTimeline,
  filterGroups,
  orderTabs,
  receiptFile,
  settlementSummary,
} from '../mock-data.js';

function SectionBlock({ title, children, aside }) {
  return (
    <section className="order-section">
      <div className="order-section__heading">
        <h2>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function KeyValueGrid({ items }) {
  return (
    <dl className="key-value-grid">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="key-value-grid__item">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function OrdersCurrentContent() {
  return (
    <div className="orders-screen">
      <section className="orders-tabs" aria-label="工单筛选标签">
        {orderTabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            className={`orders-tabs__item${index === 0 ? ' orders-tabs__item--active' : ''}`}
            aria-pressed={index === 0 ? 'true' : 'false'}
          >
            {tab.label}
          </button>
        ))}
      </section>

      <section className="orders-list" aria-label="当前工单列表">
        {currentOrders.map((order) => (
          <OrderCard key={order.orderNo} order={order} onOpenLabel="查看详情" />
        ))}
      </section>
    </div>
  );
}

function BaseOrdersShell({ screenId, title, subtitle, action, children }) {
  return (
    <MobileShell
      screenId={screenId}
      eyebrow="工单中心"
      title={title}
      subtitle={subtitle}
      action={action}
      activeTab="orders"
      showBottomNav
    >
      {children}
    </MobileShell>
  );
}

function StatusHeader() {
  return (
    <section className="order-status-hero">
      <div>
        <p className="order-status-hero__label">{detailSections.status.label}</p>
        <h2>工单 RO202607150018</h2>
        <p className="order-status-hero__helper">{detailSections.status.helper}</p>
      </div>
      <StatusPill tone={detailSections.status.tone}>{detailSections.status.value}</StatusPill>
    </section>
  );
}

function Timeline() {
  return (
    <ol className="order-timeline">
      {detailTimeline.map((item) => (
        <li key={item.title} className="order-timeline__item">
          <span
            className={`order-timeline__dot${item.done ? ' order-timeline__dot--done' : ''}`}
            aria-hidden="true"
          />
          <div className="order-timeline__content">
            <div className="order-timeline__row">
              <strong>{item.title}</strong>
              <span>{item.time}</span>
            </div>
            <p>{item.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function SharedDetailBody() {
  return (
    <div className="order-detail-screen">
      <StatusHeader />
      <SectionBlock title="车辆与客户">
        <KeyValueGrid items={[...detailSections.vehicle, ...detailSections.customer]} />
      </SectionBlock>
      <SectionBlock title="状态时间线">
        <Timeline />
      </SectionBlock>
      <SectionBlock title="维修内容">
        <KeyValueGrid items={detailSections.repair} />
      </SectionBlock>
      <SectionBlock title="保险与事故">
        <KeyValueGrid items={detailSections.insurance} />
      </SectionBlock>
      <SectionBlock title="费用汇总">
        <KeyValueGrid items={detailSections.cost} />
      </SectionBlock>
      <SectionBlock title="备注">
        <ul className="notes-list">
          {detailSections.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </SectionBlock>
    </div>
  );
}

function FooterAction({ icon: Icon, label, tone = 'secondary' }) {
  return (
    <button type="button" className={`atlas-button atlas-button--${tone}`}>
      <Icon size={16} strokeWidth={2} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function DetailFooter({ role, settlementStatus = 'awaiting' }) {
  const employeeActions = [
    { icon: Wrench, label: '切换为在修' },
    { icon: BadgeCheck, label: '切换为完工' },
    { icon: HandCoins, label: '标记待结算', tone: 'primary' },
  ];

  const adminActions =
    settlementStatus === 'settled'
      ? [
          { icon: RotateCcw, label: '返结算', tone: 'danger' },
          { icon: ShieldAlert, label: '作废工单' },
        ]
      : [
          { icon: ReceiptText, label: '完成结算', tone: 'primary' },
          { icon: ShieldAlert, label: '作废工单' },
        ];

  const actions = role === 'employee' ? employeeActions : adminActions;

  return (
    <div className="stable-action-bar" data-stable-action-bar>
      {actions.map((action) => (
        <FooterAction key={action.label} {...action} />
      ))}
    </div>
  );
}

function SettlementContent() {
  return (
    <div className="order-detail-screen">
      <SectionBlock
        title="结算工单"
        aside={<StatusPill tone="warning">待补充回执</StatusPill>}
      >
        <KeyValueGrid items={settlementSummary} />
      </SectionBlock>
      <SectionBlock title="回执必传">
        <UploadHint />
        <div className="receipt-required">
          <div className="receipt-required__copy">
            <strong>回执必传</strong>
            <p>到账截图或回单上传成功后，才能继续完成结算。</p>
          </div>
          <button type="button" className="atlas-button atlas-button--primary">
            <ImagePlus size={16} strokeWidth={2} aria-hidden="true" />
            <span>去上传回执</span>
          </button>
        </div>
      </SectionBlock>
      <DetailFooter role="admin" />
    </div>
  );
}

function ReceiptPreviewFrame() {
  return (
    <div className="receipt-frame" data-receipt-frame>
      <div className="receipt-frame__photo">
        <div className="receipt-frame__toolbar">
          <span>到账回执</span>
          <Camera size={14} strokeWidth={2} aria-hidden="true" />
        </div>
        <div className="receipt-frame__paper">
          <ReceiptText size={28} strokeWidth={2} aria-hidden="true" />
          <strong>入账凭证</strong>
          <span>金额 3,040.00</span>
          <span>户名 通达汽车服务中心</span>
        </div>
      </div>
    </div>
  );
}

function ReceiptUploadContent() {
  return (
    <FullScreenModal
      title="到账回执"
      subtitle="仅当前 screen id 渲染该弹层，不保留打开状态。"
      actions={
        <>
          <button type="button" className="atlas-button atlas-button--secondary">
            <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
            <span>删除文件</span>
          </button>
          <button type="button" className="atlas-button atlas-button--primary">
            <BadgeCheck size={16} strokeWidth={2} aria-hidden="true" />
            <span>确认上传</span>
          </button>
        </>
      }
    >
      <div className="receipt-upload">
        <UploadHint />
        <ReceiptPreviewFrame />
        <section className="order-section">
          <div className="order-section__heading">
            <h2>文件信息</h2>
          </div>
          <div className="receipt-meta">
            <div className="receipt-meta__row">
              <FileImage size={18} strokeWidth={2} aria-hidden="true" />
              <div>
                <strong>{receiptFile.name}</strong>
                <p>{receiptFile.size}</p>
              </div>
            </div>
            <div className="receipt-meta__grid">
              <div>
                <span>更新时间</span>
                <strong>{receiptFile.updatedAt}</strong>
              </div>
              <div>
                <span>上传人</span>
                <strong>{receiptFile.uploader}</strong>
              </div>
            </div>
            <button type="button" className="atlas-button atlas-button--secondary">
              <RotateCcw size={16} strokeWidth={2} aria-hidden="true" />
              <span>替换文件</span>
            </button>
          </div>
        </section>
      </div>
    </FullScreenModal>
  );
}

function FilterSheetContent() {
  return (
    <BottomSheet
      title="工单筛选"
      subtitle="使用底部弹层收纳筛选项，避免横向滚动。"
      actions={
        <>
          <button type="button" className="atlas-button atlas-button--secondary">
            重置
          </button>
          <button type="button" className="atlas-button atlas-button--primary">
            应用筛选
          </button>
        </>
      }
    >
      <div className="filter-groups">
        {filterGroups.map((group) => (
          <section key={group.title} className="filter-group">
            <h3>{group.title}</h3>
            <div className="filter-group__options">
              {group.options.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  className={`filter-chip${index === 0 ? ' filter-chip--active' : ''}`}
                  aria-pressed={index === 0 ? 'true' : 'false'}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </BottomSheet>
  );
}

export function OrdersCurrentScreen() {
  return (
    <BaseOrdersShell
      screenId="orders-current"
      title="当前工单"
      subtitle="按工单状态查看在修推进、完工交付与待结算事项。"
      action={
        <button type="button" className="icon-action-button" aria-label="打开工单筛选">
          <Filter size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      }
    >
      <OrdersCurrentContent />
    </BaseOrdersShell>
  );
}

export function OrdersFilterSheetScreen() {
  return (
    <BaseOrdersShell
      screenId="orders-filter-sheet"
      title="当前工单"
      subtitle="筛选以底部弹层呈现。"
      action={
        <button type="button" className="icon-action-button" aria-label="打开工单筛选">
          <Filter size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      }
    >
      <>
        <OrdersCurrentContent />
        <FilterSheetContent />
      </>
    </BaseOrdersShell>
  );
}

function OrderDetailScreen({ screenId, role, title }) {
  return (
    <BaseOrdersShell
      screenId={screenId}
      title={title}
      subtitle="详情正文共享，仅底部权限动作因角色不同而变化。"
      action={
        <button type="button" className="icon-action-button" aria-label="联系客户">
          <Phone size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      }
    >
      <>
        <SharedDetailBody />
        <DetailFooter role={role} />
      </>
    </BaseOrdersShell>
  );
}

export function OrderDetailEmployeeScreen() {
  return <OrderDetailScreen screenId="order-detail-employee" role="employee" title="员工工单详情" />;
}

export function OrderDetailAdminScreen() {
  return <OrderDetailScreen screenId="order-detail-admin" role="admin" title="管理员工单详情" />;
}

export function OrderStatusDialogScreen() {
  return (
    <BaseOrdersShell
      screenId="order-status-dialog"
      title="状态确认"
      subtitle="状态确认使用中性语气，并明确目标状态。"
    >
      <>
        <SharedDetailBody />
        <ConfirmDialog
          title="确认切换状态"
          description="确认将当前工单状态切换为完工，系统会保留原始详情内容。"
          tone="neutral"
          confirmLabel="确认切换为完工"
        />
      </>
    </BaseOrdersShell>
  );
}

export function OrderSettlementScreen() {
  return (
    <BaseOrdersShell
      screenId="order-settlement"
      title="结算工单"
      subtitle="结算页面固定保留必传回执与操作区。"
      action={
        <button type="button" className="icon-action-button" aria-label="查看到账回执">
          <FileImage size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      }
    >
      <SettlementContent />
    </BaseOrdersShell>
  );
}

export function ReceiptUploadScreen() {
  return (
    <BaseOrdersShell
      screenId="receipt-upload"
      title="结算工单"
      subtitle="回执弹层仅在当前 screen id 中出现。"
    >
      <>
        <SettlementContent />
        <ReceiptUploadContent />
      </>
    </BaseOrdersShell>
  );
}

export function ReverseSettlementDialogScreen() {
  return (
    <BaseOrdersShell
      screenId="reverse-settlement-dialog"
      title="返结算确认"
      subtitle="危险操作需要清晰提示返结算结果。"
      action={
        <button type="button" className="icon-action-button" aria-label="返回结算页">
          <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      }
    >
      <>
        <SettlementContent />
        <ConfirmDialog
          title="确认返结算"
          description="返结算后，当前工单会返回待结算，并重新等待回执确认。"
          tone="danger"
          confirmLabel="确认返结算"
        />
      </>
    </BaseOrdersShell>
  );
}
