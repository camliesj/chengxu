import React from 'react';

function updateNotes(update) {
  return String(update?.body || '').trim() || '包含功能优化与稳定性改进。';
}

export default function DesktopUpdatePrompt({ update, installing, progress, onInstall, onDismiss }) {
  if (!update) return null;

  const percent = progress.total > 0
    ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
    : 0;

  return (
    <aside className="desktop-update-prompt" role="status" aria-live="polite">
      <div className="desktop-update-prompt-icon" aria-hidden="true">新</div>
      <div className="desktop-update-prompt-copy">
        <span>Windows 客户端更新</span>
        <strong>发现新版本 {update.version}</strong>
        <p>{updateNotes(update)}</p>
        {installing ? (
          <div className="desktop-update-progress compact">
            <i style={{ width: `${percent}%` }} />
            <span>{progress.total > 0 ? `正在下载 ${percent}%` : '正在准备更新...'}</span>
          </div>
        ) : null}
      </div>
      <div className="desktop-update-prompt-actions">
        <button type="button" onClick={onDismiss} disabled={installing}>稍后</button>
        <button type="button" className="primary" onClick={onInstall} disabled={installing}>
          {installing ? '下载中...' : '下载更新'}
        </button>
      </div>
    </aside>
  );
}
