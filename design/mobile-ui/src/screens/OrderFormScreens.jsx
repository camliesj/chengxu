import React, { useState } from 'react';
import { CarFront, ChevronLeft, ClipboardCheck, FilePenLine, Shield, UserRound, Wallet } from 'lucide-react';
import { FullScreenModal } from '../components/Overlays.jsx';
import { LabeledInput, LabeledSelect, LabeledTextarea } from '../components/FormControls.jsx';
import {
  accidentTypes,
  insurers,
  paymentMethods,
  sampleOrder,
  staff,
  vehicleTypes,
} from '../mock-data.js';

function toOptions(values) {
  return values.map((value) => ({ value, label: value }));
}

function FormHeader({ progress, title, subtitle, showProgress = true, orderNo, tabs, activeTab, onTabChange }) {
  return (
    <header className="order-form__header" data-form-header>
      <div className="order-form__header-row">
        <button type="button" className="atlas-button atlas-button--secondary order-form__back">
          <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          <span>返回</span>
        </button>
        {showProgress ? <span className="order-form__progress">{progress}</span> : null}
      </div>
      <div className="order-form__title-block">
        <h2>{title}</h2>
        {orderNo ? <p className="order-form__order-no">工单号 {orderNo}</p> : null}
        <p>{subtitle}</p>
      </div>
      {tabs ? (
        <div className="order-form__tabs" role="tablist" aria-label="编辑分区">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={tab.tabId}
              aria-selected={activeTab === tab.id ? 'true' : 'false'}
              aria-controls={tab.panelId}
              className={`order-form__tab${activeTab === tab.id ? ' order-form__tab--active' : ''}`}
              onClick={() => onTabChange?.(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}
    </header>
  );
}

function FormGrid({ children, columns = 'responsive' }) {
  const resolvedColumns =
    columns === 'responsive'
      ? typeof window !== 'undefined' && window.innerWidth >= 768
        ? '2'
        : '1'
      : String(columns);
  return (
    <div className="order-form__grid" data-form-grid data-columns={resolvedColumns}>
      {children}
    </div>
  );
}

function FormSection({ icon: Icon, title, children }) {
  return (
    <section className="order-form__section">
      <div className="order-form__section-heading">
        <span className="order-form__section-icon" aria-hidden="true">
          <Icon size={16} strokeWidth={2} />
        </span>
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function FormActions({ primaryLabel, secondaryLabel = '关闭' }) {
  return (
    <div className="order-form__actions" data-form-actions>
      <button type="button" className="atlas-button atlas-button--secondary">
        {secondaryLabel}
      </button>
      <button type="button" className="atlas-button atlas-button--primary" data-primary-action>
        {primaryLabel}
      </button>
    </div>
  );
}

function CustomerFields({ values = {} }) {
  return (
    <FormSection icon={UserRound} title="客户资料">
      <FormGrid>
        <LabeledInput
          id="customer-name"
          label="客户姓名"
          placeholder="必填，请输入客户姓名"
          value={values.customer}
        />
        <LabeledInput
          id="customer-phone"
          label="手机号"
          type="tel"
          placeholder="必填，请输入手机号"
          value={values.phone}
        />
        <LabeledInput
          id="customer-plate"
          label="车牌号"
          placeholder="必填，请输入车牌号"
          value={values.plate}
        />
        <LabeledInput
          id="customer-model"
          label="车型"
          placeholder="必填，请输入车型"
          value={values.model}
        />
        <LabeledInput
          id="customer-vin"
          label="VIN"
          placeholder="可选，请输入VIN"
          value={values.vin}
        />
      </FormGrid>
    </FormSection>
  );
}

function InsuranceFields({ values = {} }) {
  return (
    <FormSection icon={Shield} title="保险资料">
      <FormGrid>
        <LabeledSelect
          id="insurance-company"
          label="保险公司"
          value={values.insurer ?? insurers[0]}
          options={toOptions(insurers)}
        />
        <LabeledInput
          id="insurance-expiry"
          label="保险到期日（必填）"
          type="date"
          placeholder="必填，请输入保险到期日"
          value={values.expiryDate}
        />
        <LabeledInput
          id="insurance-claim"
          label="案件号"
          placeholder="可选，请输入案件号"
          value={values.claimNo}
        />
        <LabeledSelect
          id="vehicle-type"
          label="车辆类型"
          value={values.vehicleType ?? vehicleTypes[0]}
          options={toOptions(vehicleTypes)}
        />
        <LabeledSelect
          id="accident-type"
          label="事故类型"
          value={values.accidentType ?? accidentTypes[0]}
          options={toOptions(accidentTypes)}
        />
      </FormGrid>
    </FormSection>
  );
}

function RepairFields({ values = {} }) {
  return (
    <FormSection icon={Wallet} title="维修资料">
      <FormGrid>
        <div className="order-form__span-full">
          <LabeledTextarea
            id="repair-content"
            label="维修内容"
            placeholder="必填，请输入维修内容"
            value={values.repairContent}
            rows={4}
          />
        </div>
        <LabeledInput
          id="repair-labor"
          label="工时费"
          type="number"
          placeholder="必填，请输入工时费"
          value={values.laborFee}
        />
        <LabeledInput
          id="repair-material"
          label="材料费"
          type="number"
          placeholder="必填，请输入材料费"
          value={values.materialFee}
        />
        <LabeledSelect
          id="repair-payment"
          label="付款方式"
          value={values.paymentMethod ?? paymentMethods[0]}
          options={toOptions(paymentMethods)}
        />
        <LabeledSelect
          id="repair-staff"
          label="业务员"
          value={values.staff ?? staff[0]}
          options={toOptions(staff)}
        />
        <LabeledInput
          id="repair-entry-date"
          label="进厂日期"
          type="date"
          placeholder="必填，请输入进厂日期"
          value={values.entryDate ?? '2026-07-15'}
          disabled
        />
        <LabeledInput
          id="repair-entry-time"
          label="进厂时间"
          type="time"
          placeholder="必填，请输入进厂时间"
          value={values.entryTime ?? '08:12'}
        />
      </FormGrid>
    </FormSection>
  );
}

function ReviewGroup({ icon: Icon, title, items }) {
  return (
    <section className="order-form__review-group">
      <div className="order-form__section-heading">
        <span className="order-form__section-icon" aria-hidden="true">
          <Icon size={16} strokeWidth={2} />
        </span>
        <h3>{title}</h3>
      </div>
      <dl className="order-form__review-list">
        {items.map((item) => (
          <div key={item.label} className="order-form__review-item">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ReviewContent() {
  return (
    <div className="order-form__review">
      <ReviewGroup
        icon={CarFront}
        title="客户车辆"
        items={[
          { label: '客户姓名', value: sampleOrder.customer },
          { label: '手机号', value: sampleOrder.phone },
          { label: '车牌号', value: sampleOrder.plate },
          { label: '车型', value: sampleOrder.model },
          { label: 'VIN', value: sampleOrder.vin },
        ]}
      />
      <ReviewGroup
        icon={Shield}
        title="保险事故"
        items={[
          { label: '保险公司', value: sampleOrder.insurer },
          { label: '保险到期日', value: sampleOrder.expiryDate },
          { label: '案件号', value: sampleOrder.claimNo },
          { label: '车辆类型', value: sampleOrder.vehicleType },
          { label: '事故类型', value: sampleOrder.accidentType },
        ]}
      />
      <ReviewGroup
        icon={ClipboardCheck}
        title="维修费用"
        items={[
          { label: '维修内容', value: sampleOrder.repairContent },
          { label: '工时费', value: `${sampleOrder.laborFee}` },
          { label: '材料费', value: `${sampleOrder.materialFee}` },
          { label: '付款方式', value: sampleOrder.paymentMethod },
          { label: '业务员', value: sampleOrder.staff },
          { label: '进厂日期', value: sampleOrder.entryDate },
          { label: '进厂时间', value: sampleOrder.entryTime },
        ]}
      />
    </div>
  );
}

function FormModalShell({
  screenId,
  title,
  subtitle,
  progress,
  children,
  primaryLabel,
  showProgress = true,
  orderNo,
  tabs,
  activeTab,
  onTabChange,
}) {
  return (
    <div data-screen-id={screenId}>
      <FullScreenModal
        title=""
        subtitle=""
        actions={<FormActions primaryLabel={primaryLabel} secondaryLabel={showProgress ? '关闭' : '取消'} />}
      >
        <div className="order-form" data-screen-content="order-form">
          <FormHeader
            progress={progress}
            title={title}
            subtitle={subtitle}
            showProgress={showProgress}
            orderNo={orderNo}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={onTabChange}
          />
          <div className="order-form__body">{children}</div>
        </div>
      </FullScreenModal>
    </div>
  );
}

export function OrderCreateCustomerScreen() {
  return (
    <FormModalShell
      screenId="order-create-customer"
      title="客户与车辆"
      subtitle="新增工单第一步，先录入客户与车辆基础信息。"
      progress="1 / 4"
      primaryLabel="下一步"
    >
      <CustomerFields />
    </FormModalShell>
  );
}

export function OrderCreateInsuranceScreen() {
  return (
    <FormModalShell
      screenId="order-create-insurance"
      title="保险与事故"
      subtitle="保险信息独立成步，必填项与事故分类在这里确认。"
      progress="2 / 4"
      primaryLabel="下一步"
    >
      <InsuranceFields />
    </FormModalShell>
  );
}

export function OrderCreateRepairScreen() {
  return (
    <FormModalShell
      screenId="order-create-repair"
      title="维修与费用"
      subtitle="维修内容与费用录入保持单列优先，小屏不横向展开。"
      progress="3 / 4"
      primaryLabel="下一步"
    >
      <RepairFields />
    </FormModalShell>
  );
}

export function OrderCreateReviewScreen() {
  return (
    <FormModalShell
      screenId="order-create-review"
      title="确认并提交"
      subtitle="提交前按业务分组三次复核，不再嵌套卡片。"
      progress="4 / 4"
      primaryLabel="提交工单"
    >
      <ReviewContent />
    </FormModalShell>
  );
}

export function OrderEditScreen() {
  const tabs = [
    {
      id: 'customer',
      label: '客户车辆',
      tabId: 'order-edit-tab-customer',
      panelId: 'order-edit-panel-customer',
    },
    {
      id: 'insurance',
      label: '保险事故',
      tabId: 'order-edit-tab-insurance',
      panelId: 'order-edit-panel-insurance',
    },
    {
      id: 'repair',
      label: '维修费用',
      tabId: 'order-edit-tab-repair',
      panelId: 'order-edit-panel-repair',
    },
  ];
  const [activeTab, setActiveTab] = useState('customer');

  let panel = (
    <div
      id="order-edit-panel-customer"
      role="tabpanel"
      aria-labelledby="order-edit-tab-customer"
      className="order-form__tabpanel"
    >
      <CustomerFields values={sampleOrder} />
    </div>
  );

  if (activeTab === 'insurance') {
    panel = (
      <div
        id="order-edit-panel-insurance"
        role="tabpanel"
        aria-labelledby="order-edit-tab-insurance"
        className="order-form__tabpanel"
      >
        <InsuranceFields values={sampleOrder} />
      </div>
    );
  }

  if (activeTab === 'repair') {
    panel = (
      <div
        id="order-edit-panel-repair"
        role="tabpanel"
        aria-labelledby="order-edit-tab-repair"
        className="order-form__tabpanel"
      >
        <RepairFields values={sampleOrder} />
      </div>
    );
  }

  return (
    <FormModalShell
      screenId="order-edit"
      title="编辑工单"
      subtitle="编辑态不显示四步进度，直接切换三组信息并保留真实预填值。"
      primaryLabel="保存修改"
      showProgress={false}
      orderNo={sampleOrder.orderNo}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="order-form__edit-stack">{panel}</div>
    </FormModalShell>
  );
}
