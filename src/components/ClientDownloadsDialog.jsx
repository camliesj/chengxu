import React, { useEffect, useRef, useState } from 'react';
import { normalizeClientReleases } from '../clientReleaseLogic.js';
import { apiFetch } from '../platform/apiClient.js';
import { openExternal } from '../platform/files.js';

const emptyReleases = normalizeClientReleases();

function releaseMeta(release) {
  return [
    release.version ? `版本 ${release.version}` : '暂未发布',
    release.size,
    release.publishedAt,
  ].filter(Boolean).join(' · ');
}

export default function ClientDownloadsDialog({ open, onClose }) {
  const [state, setState] = useState({ loading: false, error: '', releases: emptyReleases });
  const requestIdRef = useRef(0);

  async function loadReleases() {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const response = await apiFetch('/api/client-releases');
      if (!response.ok) throw new Error(`版本信息读取失败：${response.status}`);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error('暂时无法读取客户端版本信息');
      const payload = await response.json().catch(() => {
        throw new Error('暂时无法读取客户端版本信息');
      });
      if (requestIdRef.current !== requestId) return;
      setState({ loading: false, error: '', releases: normalizeClientReleases(payload) });
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || '暂时无法读取客户端版本信息',
      }));
    }
  }

  async function downloadRelease(url) {
    try {
      await openExternal(url);
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.message || '暂时无法打开客户端下载地址',
      }));
    }
  }

  useEffect(() => {
    if (open) loadReleases();
    return () => {
      requestIdRef.current += 1;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const platforms = [
    { key: 'windows', title: 'Windows 客户端', description: '适用于 Windows 10 与 Windows 11。' },
    { key: 'android', title: 'Android 客户端', description: '移动端版本将在后续开放。' },
  ];

  return (
    <div className="client-download-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="client-download-dialog" role="dialog" aria-modal="true" aria-labelledby="client-download-title">
        <header className="client-download-header">
          <div>
            <span>客户端下载</span>
            <h2 id="client-download-title">选择客户端版本</h2>
            <p>客户端与网页端共用云端业务数据。</p>
          </div>
          <button type="button" className="client-download-close" aria-label="关闭客户端下载窗口" onClick={onClose}>×</button>
        </header>

        {state.loading ? <div className="client-download-status">正在读取最新版本...</div> : null}
        {state.error ? (
          <div className="client-download-status error">
            <span>{state.error}</span>
            <button type="button" onClick={loadReleases}>重试</button>
          </div>
        ) : null}

        <div className="client-download-platforms" aria-busy={state.loading}>
          {platforms.map((platform) => {
            const release = state.releases[platform.key];
            return (
              <article key={platform.key} className={`client-download-card ${platform.key}`}>
                <div className="client-download-platform-icon" aria-hidden="true">
                  {platform.key === 'windows' ? 'PC' : 'APP'}
                </div>
                <div className="client-download-platform-copy">
                  <h3>{platform.title}</h3>
                  <p>{platform.description}</p>
                  <span>{releaseMeta(release)}</span>
                  {release.notes ? <small>{release.notes}</small> : null}
                </div>
                <button
                  type="button"
                  className={release.canDownload ? 'client-download-action primary' : 'client-download-action'}
                  disabled={!release.canDownload || state.loading}
                  onClick={() => downloadRelease(release.downloadUrl)}
                >
                  {state.loading ? '读取中...' : release.actionLabel}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
