import React from 'react';
import { WifiOff } from 'lucide-react';
import { BottomNav } from './BottomNav.jsx';

export function MobileShell({
  title,
  subtitle,
  action,
  activeTab,
  offline = false,
  showBottomNav = false,
  screenId,
  children,
}) {
  return (
    <main className="atlas-root" data-screen-id={screenId}>
      <section className="mobile-shell" data-mobile-shell>
        <header className="mobile-shell__header">
          <div className="mobile-shell__status-row">
            <span>9:41</span>
            <span>5G</span>
          </div>
          {offline ? (
            <div className="mobile-shell__offline-strip" role="status">
              <WifiOff size={14} strokeWidth={2} aria-hidden="true" />
              <span>网络不可用，当前为只读模式</span>
            </div>
          ) : null}
          <div className="mobile-shell__header-main">
            <div>
              <p className="mobile-shell__eyebrow">登录与公司选择</p>
              <h1>{title}</h1>
              {subtitle ? <p className="mobile-shell__subtitle">{subtitle}</p> : null}
            </div>
            {action ? <div className="mobile-shell__action">{action}</div> : null}
          </div>
        </header>
        <div className="mobile-shell__main-wrap">
          <section className="mobile-shell__main">{children}</section>
        </div>
        {showBottomNav ? <BottomNav activeTab={activeTab} /> : null}
      </section>
    </main>
  );
}
