import React, { useReducer } from 'react';
import { BRAND_ASSETS } from '../assets/brand/asset-manifest.js';
import { BrandButton } from '../components/BrandButton.jsx';
import { BrandField } from '../components/BrandField.jsx';
import { BrandIcon } from '../components/BrandIcon.jsx';
import { InteractiveSurface } from '../components/InteractiveSurface.jsx';
import { companies } from '../mock-data.js';
import { initialPrototypeState, prototypeReducer } from '../prototype-state.js';

function CompanyOption({ company, selected, disabled, onSelect }) {
  return (
    <InteractiveSurface
      className="brand-company-option"
      selected={selected}
      disabled={disabled}
      aria-label={`选择${company.shortName}`}
      onClick={onSelect}
    >
      <span className="brand-company-option__icon" aria-hidden="true">
        <BrandIcon name="building" size={20} decorative />
      </span>
      <span className="brand-company-option__copy">
        <strong>{company.shortName}</strong>
        <small>{company.fullName}</small>
      </span>
      <span className="brand-company-option__check" aria-hidden="true" data-selected-icon={selected ? 'true' : 'false'}>
        {selected ? <BrandIcon name="check" size={20} decorative /> : <span />}
      </span>
    </InteractiveSurface>
  );
}

export function LoginCompanyScreen({ state: controlledState, dispatch: controlledDispatch }) {
  const [localState, localDispatch] = useReducer(prototypeReducer, initialPrototypeState);
  const state = controlledState ?? localState;
  const dispatch = controlledDispatch ?? localDispatch;

  function submit(event) {
    event.preventDefault();
    if (!state.submitting) dispatch({ type: 'SUBMIT_LOGIN' });
  }

  return (
    <main className="atlas-root brand-login-root" data-screen-id="login-company">
      <section className="mobile-shell brand-login-shell" data-mobile-shell>
        <div className="brand-login-scroll">
          <header className="brand-login-hero">
            <div className="mobile-shell__status-row brand-login-hero__status">
              <span>9:41</span>
              <span>5G</span>
            </div>
            <div className="brand-login-hero__copy">
              <p>Autoservice mobile</p>
              <h1>让每一次服务<br />更从容</h1>
              <span>门店业务与车辆服务协同入口</span>
            </div>
            <img
              className="brand-login-hero__vehicle"
              data-brand-asset="loginHero"
              src={BRAND_ASSETS.loginHero.src}
              width={BRAND_ASSETS.loginHero.width}
              height={BRAND_ASSETS.loginHero.height}
              alt={BRAND_ASSETS.loginHero.alt}
            />
          </header>

          <form className="brand-login-panel" onSubmit={submit} noValidate>
            <div className="brand-login-panel__heading">
              <p>欢迎回来</p>
              <h2>登录维修业务移动端</h2>
              <span>选择企业并使用现有业务账号登录</span>
            </div>

            <fieldset className="brand-login-companies" disabled={state.submitting}>
              <legend>所属企业</legend>
              <div className="brand-login-companies__list">
                {companies.map((company) => (
                  <CompanyOption
                    key={company.id}
                    company={company}
                    selected={state.companyId === company.id}
                    disabled={state.submitting}
                    onSelect={() => dispatch({ type: 'SELECT_COMPANY', companyId: company.id })}
                  />
                ))}
              </div>
              {state.errors.companyId ? <p className="brand-login-error">{state.errors.companyId}</p> : null}
            </fieldset>

            <div className="brand-login-fields">
              <BrandField
                id="brand-login-account"
                label="账号"
                leadingIcon="user"
                placeholder="请输入登录账号"
                autoComplete="username"
                value={state.username}
                disabled={state.submitting}
                error={state.errors.username}
                onChange={(event) => dispatch({ type: 'SET_USERNAME', value: event.target.value })}
              />
              <BrandField
                id="brand-login-password"
                label="密码"
                leadingIcon="lock"
                type={state.passwordVisible ? 'text' : 'password'}
                placeholder="请输入登录密码"
                autoComplete="current-password"
                value={state.password}
                disabled={state.submitting}
                error={state.errors.password}
                onChange={(event) => dispatch({ type: 'SET_PASSWORD', value: event.target.value })}
                trailingAction={(
                  <BrandButton
                    type="button"
                    tone="quiet"
                    icon={state.passwordVisible ? 'eyeOff' : 'eye'}
                    iconOnly
                    disabled={state.submitting}
                    aria-label={state.passwordVisible ? '隐藏密码' : '显示密码'}
                    onClick={() => dispatch({ type: 'TOGGLE_PASSWORD' })}
                  >
                    {state.passwordVisible ? '隐藏密码' : '显示密码'}
                  </BrandButton>
                )}
              />
            </div>

            {state.errors.form ? <p className="brand-login-form-error" role="alert">{state.errors.form}</p> : null}

            <BrandButton
              type="submit"
              className="brand-login-submit"
              loading={state.submitting}
              data-primary-action
              aria-label={state.submitting ? '正在登录' : '进入系统'}
            >
              {state.submitting ? '正在登录' : '进入系统'}
            </BrandButton>

            <p className="brand-login-note">
              <BrandIcon name="shield" size={15} decorative />
              <span>本 HTML 原型仅模拟本地状态，不连接生产接口，也不会保存账号密码。</span>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
