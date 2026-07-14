import React from 'react';

export default function NetworkStatusBar({ status, lastSyncedAt, onRetry }) {
  if (status !== 'offline') return null;
  const syncedText = lastSyncedAt
    ? `上次同步：${new Date(lastSyncedAt).toLocaleString('zh-CN', { hour12: false })}`
    : '尚无可用同步记录';

  return (
    <div className="network-status-bar" role="status">
      <div>
        <strong>网络不可用</strong>
        <span>当前内容为上次同步结果 · {syncedText}</span>
      </div>
      <button type="button" onClick={onRetry}>重新连接</button>
    </div>
  );
}
