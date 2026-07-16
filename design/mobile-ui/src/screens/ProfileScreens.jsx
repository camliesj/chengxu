import React from 'react';
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
import { cachedOrders, profileRows } from '../mock-data.js';

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
        <StatePanel type="loading" title="正在同步数据" description="正在获取最新工单，请稍候。" />
        <StatePanel type="empty" title="暂无相关记录" description="调整筛选条件后再试一次。" actionLabel="清除筛选" />
        <StatePanel type="error" title="云端连接失败" description="数据暂未更新，可检查网络后重试。" actionLabel="重新加载" />
        <StatePanel type="permission" title="没有操作权限" description="当前账号无法执行此操作，请联系管理员。" />
      </div>
    </MobileShell>
  );
}
