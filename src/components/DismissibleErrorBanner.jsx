import { useEffect } from 'react';
import { TRANSIENT_ERROR_DURATION_MS } from '../transientErrorLogic.js';

export default function DismissibleErrorBanner({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onDismiss, TRANSIENT_ERROR_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div className="cloud-banner error dismissible-error-banner" role="alert">
      <span>{message}</span>
      <button type="button" className="dismissible-error-close" onClick={onDismiss} aria-label="关闭错误提示">×</button>
    </div>
  );
}
