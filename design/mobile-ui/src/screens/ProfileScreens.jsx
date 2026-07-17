import React, { useState } from 'react';
import {
  BellRing,
  ChevronRight,
  CloudOff,
  Database,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react';
import { MobileShell } from '../components/MobileShell.jsx';
import { OrderCard } from '../components/OrderCard.jsx';
import { StatePanel } from '../components/StatePanel.jsx';
import { StatusPill } from '../components/StatusPill.jsx';
import { BrandButton } from '../components/BrandButton.jsx';
import { BrandField } from '../components/BrandField.jsx';
import { BrandIcon } from '../components/BrandIcon.jsx';
import { InteractiveSurface } from '../components/InteractiveSurface.jsx';
import { MetricCard } from '../components/MetricCard.jsx';
import { cachedOrders, profileRows } from '../mock-data.js';
import { BRAND_ASSETS } from '../assets/brand/asset-manifest.js';

function ProfileRow({ Icon, label, value, status }) {
  return (
    <button type="button" className="profile-row">
      <span className="profile-row__icon" aria-hidden="true"><Icon size={18} /></span>
      <span className="profile-row__copy"><strong>{label}</strong><span>{value}</span></span>
      {status ? <StatusPill tone="success">{status}</StatusPill> : <ChevronRight size={17} aria-hidden="true" />}
    </button>
  );
}

export function ProfileSyncScreen() {
  const icons = [UserRound, ShieldCheck, Database, RefreshCw, Smartphone, BellRing];
  return (
    <MobileShell
      screenId="profile-sync"
      eyebrow="账户与设备"
      title="我的"
      subtitle="当前门店、同步状态与应用信息"
      activeTab="profile"
      showBottomNav
    >
      <div className="profile-screen">
        <section className="profile-identity">
          <span className="profile-identity__avatar"><UserRound size={24} /></span>
          <div><h2>张工</h2><p>维修顾问 · 通达汽车服务中心</p></div>
          <StatusPill tone="primary">员工</StatusPill>
        </section>
        <section className="profile-list" aria-label="账户与同步信息">
          {profileRows.map((row, index) => <ProfileRow key={row.label} Icon={icons[index]} {...row} />)}
        </section>
        <button type="button" className="profile-signout"><LogOut size={17} />退出登录</button>
      </div>
    </MobileShell>
  );
}

export function OfflineReadonlyScreen() {
  return (
    <MobileShell
      screenId="offline-readonly"
      eyebrow="缓存数据"
      title="当前工单"
      subtitle="已显示最近同步的缓存数据"
      activeTab="orders"
      offline
      showBottomNav
      action={<button type="button" className="icon-action-button" disabled aria-label="新增工单"><Plus size={18} /></button>}
    >
      <div className="offline-screen">
        <section className="offline-explainer">
          <CloudOff size={19} aria-hidden="true" />
          <div><h2>当前为只读模式</h2><p>查看不受影响，新增、编辑和状态变更将在网络恢复后开放。</p></div>
        </section>
        <div className="record-list">
          {cachedOrders.map((order) => <OrderCard key={order.orderNo} order={order} compact onOpenLabel="查看缓存" />)}
        </div>
        <button type="button" className="atlas-button atlas-button--neutral" disabled>修改工单状态</button>
      </div>
    </MobileShell>
  );
}

const INTERACTION_STATES = ['default', 'hover', 'pressed', 'focus', 'selected', 'disabled'];
const SELECTABLE_COMPONENTS = new Set(['navigation-item', 'selection-card']);
const INTERACTION_COMPONENTS = [
  ['button', '主按钮'],
  ['icon-button', '图标按钮'],
  ['navigation-item', '导航项'],
  ['selection-card', '选择卡'],
  ['metric-card', '指标卡'],
  ['field', '输入字段'],
  ['dialog-action', '弹层动作'],
];

const STATE_LABELS = {
  default: '默认',
  hover: '悬停',
  pressed: '按下',
  focus: '聚焦',
  selected: '选中',
  disabled: '禁用',
};

function InteractionFixture({ component, state, children }) {
  return (
    <div
      className="interaction-fixture"
      data-component={component}
      data-force-state={state}
    >
      <span className="interaction-fixture__label">{STATE_LABELS[state]}</span>
      {children}
    </div>
  );
}

function FixtureControl({ component, state }) {
  const disabled = state === 'disabled';
  const selected = state === 'selected';

  switch (component) {
    case 'button':
      return <BrandButton disabled={disabled}>保存工单</BrandButton>;
    case 'icon-button':
      return <BrandButton icon="add" iconOnly disabled={disabled} aria-label="新建工单示例">新建工单</BrandButton>;
    case 'navigation-item':
      return (
        <InteractiveSurface className="brand-nav-demo" disabled={disabled} selected={selected}>
          <BrandIcon name="home" size={19} decorative />
          <span>工作台</span>
        </InteractiveSurface>
      );
    case 'selection-card':
      return (
        <InteractiveSurface className="brand-selection-card" disabled={disabled} selected={selected} aria-label="选择门店示例">
          <span className="brand-selection-card__icon"><BrandIcon name="building" size={19} decorative /></span>
          <span><strong>通达汽车</strong><small>服务中心</small></span>
          {selected ? <BrandIcon name="check" size={18} decorative /> : null}
        </InteractiveSurface>
      );
    case 'metric-card':
      return (
        <MetricCard
          label="今日接车"
          value="12"
          detail="较昨日 +2"
          tone="primary"
          disabled={disabled}
          aria-label="今日接车 12"
        />
      );
    case 'field':
      return <BrandField label="账号" leadingIcon="user" defaultValue="zhang.gong" disabled={disabled} />;
    case 'dialog-action':
      return (
        <div className="brand-dialog-action-demo">
          <BrandButton tone="secondary" disabled={disabled}>暂不退出</BrandButton>
        </div>
      );
    default:
      return null;
  }
}

function InteractionMatrix() {
  const [companySelected, setCompanySelected] = useState(false);

  return (
    <section className="interaction-matrix" aria-labelledby="interaction-matrix-title">
      <div className="interaction-matrix__heading">
        <div>
          <p>Shared primitives</p>
          <h2 id="interaction-matrix-title">交互状态矩阵</h2>
        </div>
        <StatusPill tone="success">键盘可用</StatusPill>
      </div>

      <div className="interaction-live" aria-label="实时交互示例">
        <BrandButton>实时交互按钮</BrandButton>
        <InteractiveSurface
          className="brand-selection-card"
          selected={companySelected}
          onClick={() => setCompanySelected((selected) => !selected)}
          aria-label="选择通达汽车服务中心"
        >
          <span className="brand-selection-card__icon"><BrandIcon name="building" size={19} decorative /></span>
          <span><strong>通达汽车</strong><small>服务中心</small></span>
          {companySelected ? <BrandIcon name="check" size={18} decorative /> : null}
        </InteractiveSurface>
        <BrandButton tone="secondary" disabled>禁用操作</BrandButton>
      </div>

      {INTERACTION_COMPONENTS.map(([component, label]) => (
        <section key={component} className="interaction-group" aria-label={`${label}状态`}>
          <h3>{label}</h3>
          <div className="interaction-fixtures">
            {INTERACTION_STATES.filter((state) => state !== 'selected' || SELECTABLE_COMPONENTS.has(component)).map((state) => (
              <InteractionFixture key={state} component={component} state={state}>
                <FixtureControl component={component} state={state} />
              </InteractionFixture>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

export function StatesGalleryScreen() {
  return (
    <MobileShell
      screenId="states-gallery"
      eyebrow="组件状态"
      title="系统状态合集"
      subtitle="移动端常见反馈与恢复入口"
      activeTab="profile"
      showBottomNav
    >
      <div className="states-gallery">
        <section className="brand-asset-preview" data-brand-preview aria-label="品牌图片资产">
          {Object.entries(BRAND_ASSETS).map(([key, asset]) => (
            <figure key={key} className="brand-asset-preview__item">
              <img
                data-brand-asset={key}
                src={asset.src}
                width={asset.width}
                height={asset.height}
                alt={asset.alt}
              />
            </figure>
          ))}
        </section>
        <InteractionMatrix />
        <StatePanel type="loading" title="正在同步数据" description="正在获取最新工单，请稍候。" />
        <StatePanel type="empty" title="暂无相关记录" description="调整筛选条件后再试一次。" actionLabel="清除筛选" />
        <StatePanel type="error" title="云端连接失败" description="数据暂未更新，可检查网络后重试。" actionLabel="重新加载" />
        <StatePanel type="permission" title="没有操作权限" description="当前账号无法执行此操作，请联系管理员。" />
      </div>
    </MobileShell>
  );
}
