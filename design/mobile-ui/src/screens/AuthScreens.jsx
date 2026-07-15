import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { MobileShell } from '../components/MobileShell.jsx';
import { LabeledInput, formIcons } from '../components/FormControls.jsx';
import { companies } from '../mock-data.js';

function CompanyOption({ company, selected }) {
  return (
    <button
      type="button"
      className={[
        'company-option',
        selected ? 'company-option--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={selected}
    >
      <span className="company-option__copy">
        <span className="company-option__title">{company.shortName}</span>
        <span className="company-option__subtitle">{company.fullName}</span>
      </span>
      <span className="company-option__check" aria-hidden="true">
        <CheckCircle2 size={18} strokeWidth={2} />
      </span>
    </button>
  );
}

export function LoginCompanyScreen() {
  return (
    <MobileShell
      screenId="login-company"
      title="选择门店"
      subtitle="请选择当前登录门店，并输入账号密码进入系统。"
    >
      <div className="auth-screen">
        <section className="auth-panel">
          <div className="auth-panel__brand">
            <p className="auth-panel__product">维修业务移动端</p>
            <p className="auth-panel__description">
              面向前台与车间人员的移动工单入口
            </p>
          </div>

          <div className="auth-section">
            <h2 className="auth-section__title">门店选择</h2>
            <div className="auth-section__stack">
              {companies.map((company, index) => (
                <CompanyOption
                  key={company.fullName}
                  company={company}
                  selected={index === 0}
                />
              ))}
            </div>
          </div>

          <div className="auth-section">
            <h2 className="auth-section__title">账号登录</h2>
            <div className="auth-section__stack">
              <LabeledInput
                id="login-account"
                label="账号"
                placeholder="必填，请输入登录账号"
                icon={formIcons.account}
              />
              <LabeledInput
                id="login-password"
                label="密码"
                type="password"
                placeholder="必填，请输入登录密码"
                icon={formIcons.password}
              />
            </div>
          </div>

          <button type="button" className="auth-submit" data-primary-action>
            进入系统
          </button>

          <p className="auth-note">
            <ShieldCheck size={14} strokeWidth={2} aria-hidden="true" />
            <span>请确认当前网络安全后再登录，账号数据仅用于业务操作验证。</span>
          </p>
        </section>
      </div>
    </MobileShell>
  );
}
