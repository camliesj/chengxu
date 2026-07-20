import React from 'react';
import { BRAND_ASSETS } from '../assets/brand/asset-manifest.js';
import { BrandButton } from '../components/BrandButton.jsx';
import { BrandIcon } from '../components/BrandIcon.jsx';
import { StatusPill } from '../components/StatusPill.jsx';

const STAGE_COPY = {
  orders: {
    phase: '视觉壳层 · 待接真实数据',
    title: '工单列表正在升级',
    description: '下一阶段将接入 Room 缓存与在线刷新；当前原型只验证导航和状态表达。',
    action: '查看接入说明',
  },
  add: {
    phase: '阶段功能 · 暂未开放',
    title: '新增工单即将接入',
    description: '正式业务表单仍由后续 Android 阶段实现，本原型不会伪造写入结果。',
    action: '查看字段规划',
  },
  records: {
    phase: '视觉壳层 · 待接真实数据',
    title: '客户档案正在整理',
    description: '后续将统一客户、车辆、保险和历史结算记录，并遵守账号级缓存隔离。',
    action: '查看档案范围',
  },
};

export function BrandWorkbenchStage() {
  return (
    <div className="brand-workbench-stage">
      <section className="brand-workbench-stage__lead">
        <div>
          <p>当前门店</p>
          <h2>通达汽车服务中心</h2>
        </div>
        <StatusPill tone="success">已同步</StatusPill>
      </section>
      <section className="brand-workbench-stage__grid" aria-label="今日概览">
        {[
          ['今日接车', '12'],
          ['在修车辆', '18'],
          ['待交付', '04'],
          ['保险到期', '09'],
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <section className="brand-workbench-stage__notice">
        <BrandIcon name="tools" size={22} decorative />
        <div><strong>工作台深度升级进行中</strong><span>Task 5 将完成员工与管理员双角色内容。</span></div>
      </section>
    </div>
  );
}

export function BrandStageScreen({ kind, offline = false }) {
  const copy = STAGE_COPY[kind];
  return (
    <section className="brand-stage-screen" data-stage-kind={kind}>
      <StatusPill tone={offline ? 'warning' : 'primary'}>{offline ? '只读模式' : copy.phase}</StatusPill>
      <img
        data-brand-asset="emptyState"
        src={BRAND_ASSETS.emptyState.src}
        width={BRAND_ASSETS.emptyState.width}
        height={BRAND_ASSETS.emptyState.height}
        alt={BRAND_ASSETS.emptyState.alt}
      />
      <div><h2>{copy.title}</h2><p>{copy.description}</p></div>
      <BrandButton tone="secondary" disabled={offline && kind === 'add'}>{copy.action}</BrandButton>
    </section>
  );
}

export function BrandProfileStage({ state, onLogout, logoutRef }) {
  return (
    <div className="brand-profile-stage">
      <section className="brand-profile-stage__identity">
        <span><BrandIcon name="user" size={24} decorative /></span>
        <div><h2>张工</h2><p>{state.role === 'admin' ? '管理员' : '维修顾问'} · 通达汽车服务中心</p></div>
        <StatusPill tone="primary">{state.role === 'admin' ? '管理员' : '员工'}</StatusPill>
      </section>
      <section className="brand-profile-stage__list" aria-label="账户信息">
        {[
          ['building', '当前企业', '通达汽车服务中心'],
          ['cloud', '云端同步', '刚刚同步'],
          ['shield', '登录安全', '原型不保存凭据'],
        ].map(([icon, label, value]) => (
          <div key={label}><BrandIcon name={icon} size={19} decorative /><span><strong>{label}</strong><small>{value}</small></span></div>
        ))}
      </section>
      <BrandButton ref={logoutRef} tone="danger" icon="logout" onClick={onLogout}>退出登录</BrandButton>
    </div>
  );
}
