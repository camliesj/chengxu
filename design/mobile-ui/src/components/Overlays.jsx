import React from 'react';
import { AlertTriangle, ArrowDownToLine, Check, X } from 'lucide-react';

export function BottomSheet({ title, subtitle, actions, children }) {
  return (
    <div className="overlay-layer">
      <section className="bottom-sheet" data-overlay="bottom-sheet" role="dialog" aria-modal="true">
        <header className="overlay-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </header>
        <div className="overlay-body">{children}</div>
        {actions ? <div className="overlay-actions overlay-actions--split">{actions}</div> : null}
      </section>
    </div>
  );
}

export function FullScreenModal({ title, subtitle, actions, children }) {
  const hasHeader = title || subtitle;
  return (
    <div className="overlay-layer overlay-layer--full">
      <section
        className={`full-screen-modal${hasHeader ? '' : ' full-screen-modal--headerless'}`}
        data-overlay="full-screen-modal"
        data-mobile-shell
        role="dialog"
        aria-modal="true"
      >
        {hasHeader ? (
          <header className="overlay-header">
            <div>
              <h2>{title}</h2>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
          </header>
        ) : null}
        <div className="overlay-body">{children}</div>
        {actions ? <div className="overlay-actions">{actions}</div> : null}
      </section>
    </div>
  );
}

export function ConfirmDialog({
  title,
  description,
  tone = 'neutral',
  confirmLabel,
  cancelLabel = '取消',
}) {
  const icon = tone === 'danger' ? (
    <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
  ) : (
    <Check size={18} strokeWidth={2} aria-hidden="true" />
  );

  return (
    <div className="overlay-layer overlay-layer--center">
      <section
        className="confirm-dialog"
        data-overlay="confirm-dialog"
        data-tone={tone}
        role="dialog"
        aria-modal="true"
      >
        <header className="confirm-dialog__header">
          <span className="confirm-dialog__icon" aria-hidden="true">
            {icon}
          </span>
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </header>
        <div className="overlay-actions overlay-actions--stack">
          <button type="button" className={`atlas-button atlas-button--${tone}`}>
            {confirmLabel}
          </button>
          <button type="button" className="atlas-button atlas-button--secondary">
            <X size={16} strokeWidth={2} aria-hidden="true" />
            <span>{cancelLabel}</span>
          </button>
        </div>
      </section>
    </div>
  );
}

export function UploadHint() {
  return (
    <div className="inline-alert" role="alert">
      <ArrowDownToLine size={16} strokeWidth={2} aria-hidden="true" />
      <span>上传未成功前不可完成结算</span>
    </div>
  );
}
