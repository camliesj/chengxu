import React, { useEffect, useReducer, useRef } from 'react';
import { initialPrototypeState, prototypeReducer } from './prototype-state.js';
import { LoginCompanyScreen } from './screens/AuthScreens.jsx';
import { MobileShell } from './components/MobileShell.jsx';
import { BrandConfirmDialog } from './components/Overlays.jsx';
import {
  BrandProfileStage,
  BrandStageScreen,
} from './screens/BrandStageScreens.jsx';
import { BrandWorkbench } from './screens/WorkbenchScreens.jsx';

const TAB_META = {
  workbench: ['今日协同', '今日工作', '优先处理到店、在修与交付事项'],
  orders: ['业务进度', '工单中心', '查看当前维修服务进度'],
  add: ['业务录入', '新增工单', '创建客户车辆维修服务记录'],
  records: ['客户资产', '客户档案', '客户、车辆、保险与历史记录'],
  profile: ['账户与安全', '我的账户', '当前身份、同步状态与安全设置'],
};

function BrandPrototypeShell({ state, dispatch, offline }) {
  const logoutRef = useRef(null);
  const [eyebrow, title, subtitle] = state.activeTab === 'workbench' && state.role === 'admin'
    ? ['经营与调度', '经营工作台', '关注结算节奏、产值进度与高优先事项']
    : TAB_META[state.activeTab];

  let content;
  if (state.activeTab === 'workbench') content = <BrandWorkbench role={state.role} dispatch={dispatch} />;
  else if (state.activeTab === 'profile') {
    content = (
      <BrandProfileStage
        state={state}
        logoutRef={logoutRef}
        onLogout={() => dispatch({ type: 'OPEN_OVERLAY', overlay: 'logout' })}
      />
    );
  } else content = <BrandStageScreen kind={state.activeTab} offline={offline} />;

  return (
    <>
      <MobileShell
        screenId={`brand-${state.activeTab}`}
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        activeTab={state.activeTab}
        offline={offline}
        showBottomNav
        disabledTabs={offline ? ['add'] : []}
        onTabSelect={(tab) => dispatch({ type: 'SELECT_TAB', tab })}
      >
        {content}
      </MobileShell>
      {state.overlay === 'logout' ? (
        <BrandConfirmDialog
          title="确认退出登录"
          description="退出后将清空当前原型会话，并返回企业选择与账号登录页面。"
          cancelLabel="暂不退出"
          confirmLabel="退出登录"
          returnFocusRef={logoutRef}
          onCancel={() => dispatch({ type: 'CLOSE_OVERLAY' })}
          onConfirm={() => dispatch({ type: 'LOGOUT' })}
        />
      ) : null}
    </>
  );
}

export function BrandPrototypeApp() {
  const [state, dispatch] = useReducer(prototypeReducer, initialPrototypeState);
  const offline = new URLSearchParams(window.location.search).get('offline') === '1';

  useEffect(() => {
    if (!state.submitting) return undefined;

    const timeout = window.setTimeout(() => {
      if (state.username.toLowerCase() === 'error') {
        dispatch({ type: 'LOGIN_FAILED', message: '账号或密码错误，请检查后重试' });
      } else {
        dispatch({ type: 'LOGIN_SUCCEEDED' });
      }
    }, 480);

    return () => window.clearTimeout(timeout);
  }, [state.submitting, state.username]);

  if (!state.authenticated) {
    return <LoginCompanyScreen state={state} dispatch={dispatch} />;
  }

  return <BrandPrototypeShell state={state} dispatch={dispatch} offline={offline} />;
}
