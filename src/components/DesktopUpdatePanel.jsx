import React from 'react';

function notesFor(update) {
  return String(update?.body || '').trim() || '暂无版本说明';
}

export default function DesktopUpdatePanel({ supported, currentVersion, state, onCheck, onInstall, onRestart }) {
  if (!supported) {
    return (
      <div className="desktop-update-panel web-runtime">
        <div className="desktop-update-status-icon">网</div>
        <div>
          <strong>当前为网页版本</strong>
          <p>网页端会自动使用最新版本，无需手动下载安装。</p>
        </div>
      </div>
    );
  }

  const percent = state.progress.total > 0
    ? Math.min(100, Math.round((state.progress.downloaded / state.progress.total) * 100))
    : 0;

  return (
    <div className="desktop-update-panel">
      <div className="desktop-update-version-row">
        <div><span>当前版本</span><strong>{currentVersion || '读取中...'}</strong></div>
        <div><span>最新版本</span><strong>{state.update?.version || (state.checking ? '检查中...' : '已是最新')}</strong></div>
      </div>

      {state.update ? (
        <section className="desktop-update-release">
          <span>版本说明</span>
          <p>{notesFor(state.update)}</p>
        </section>
      ) : null}

      {state.error ? <div className="desktop-update-message error">{state.error}</div> : null}
      {!state.error && !state.checking && !state.update ? <div className="desktop-update-message">当前已是最新版本</div> : null}

      {state.installing || state.installed ? (
        <div className="desktop-update-progress">
          <i style={{ width: `${state.installed ? 100 : percent}%` }} />
          <span>{state.installed ? '更新已下载，重启后完成安装' : state.progress.total > 0 ? `正在下载 ${percent}%` : '正在准备更新...'}</span>
        </div>
      ) : null}

      <div className="desktop-update-panel-actions">
        <button type="button" onClick={onCheck} disabled={state.checking || state.installing}>
          {state.checking ? '正在检查...' : '检查更新'}
        </button>
        {state.update && !state.installed ? (
          <button type="button" className="primary" onClick={onInstall} disabled={state.installing}>
            {state.installing ? '下载中...' : '下载更新'}
          </button>
        ) : null}
        {state.installed ? <button type="button" className="primary" onClick={onRestart}>更新并重启</button> : null}
      </div>
    </div>
  );
}
