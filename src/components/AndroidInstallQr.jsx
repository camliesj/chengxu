import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { androidInstallQrState } from '../clientReleaseLogic.js';
import { apiFetch } from '../platform/apiClient.js';
import { openExternal } from '../platform/files.js';

const initialState = { status: 'loading', release: null };

export default function AndroidInstallQr({ onOpenDownloads }) {
  const [state, setState] = useState(initialState);
  const requestIdRef = useRef(0);

  const loadRelease = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState(initialState);
    try {
      const response = await apiFetch('/api/client-releases');
      if (!response.ok) throw new Error(`RELEASE_READ_${response.status}`);
      const payload = await response.json();
      if (requestIdRef.current === requestId) setState(androidInstallQrState(payload));
    } catch (error) {
      if (requestIdRef.current === requestId) setState(androidInstallQrState({}, error));
    }
  }, []);

  useEffect(() => {
    loadRelease();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadRelease]);

  async function openDownload() {
    if (!state.release) return;
    try {
      await openExternal(state.release.downloadUrl);
    } catch {
      setState({ status: 'error', release: null });
    }
  }

  if (state.status === 'loading') {
    return <div className="android-install-qr pending" aria-live="polite">正在读取 Android 安装包信息…</div>;
  }

  if (state.status === 'ready') {
    const { release } = state;
    return (
      <section className="android-install-qr" aria-labelledby="android-install-qr-title">
        <div className="android-install-qr-code" aria-label="扫描二维码下载智纬 Android APP">
          <QRCodeSVG value={release.downloadUrl} size={116} marginSize={2} bgColor="#ffffff" fgColor="#1d242b" level="M" />
        </div>
        <div className="android-install-qr-copy">
          <strong id="android-install-qr-title">扫码安装 Android APP</strong>
          <span>{[release.version ? `版本 ${release.version}` : '', release.size].filter(Boolean).join(' · ')}</span>
          <button type="button" onClick={openDownload}>下载 Android APP</button>
        </div>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="android-install-qr unavailable" role="status">
        <span>无法读取安装包信息</span>
        <button type="button" onClick={loadRelease}>重试</button>
      </div>
    );
  }

  return (
    <div className="android-install-qr unavailable" role="status">
      <span>Android 安装包发布中</span>
      <button type="button" onClick={onOpenDownloads}>查看客户端下载</button>
    </div>
  );
}
