import React, { useState } from 'react';

export default function OrderStatusConfirmDialog({ order, targetStatus, onSubmit, onCheck, onSuccess, onConflict, onClose }) {
  const [state, setState] = useState('idle');
  const [operationId, setOperationId] = useState('');
  const [message, setMessage] = useState('');
  const [latest, setLatest] = useState(null);

  async function submit() {
    if (state !== 'idle') return;
    const nextOperationId = operationId || crypto.randomUUID();
    setOperationId(nextOperationId);
    setState('submitting');
    const result = await onSubmit({ operationId: nextOperationId, expectedVersion: order.version, targetStatus });
    handleResult(result);
  }

  async function check() {
    if (!operationId || state === 'checking') return;
    setState('checking');
    handleResult(await onCheck(operationId));
  }

  function handleResult(result) {
    if (result.kind === 'success') {
      onSuccess(result.value.order);
      onClose();
      return;
    }
    if (result.kind === 'conflict') {
      setLatest(result.latest || null);
      setState('conflict');
      onConflict?.(result.latest || null);
      return;
    }
    if (['unknownResult', 'networkUnavailable', 'serverFailure', 'malformedResponse'].includes(result.kind)) {
      setState('unknown');
      setMessage('提交结果正在确认，请勿重复提交。');
      return;
    }
    setState('idle');
    setMessage(result.kind === 'forbidden' ? '当前账号没有变更工单状态的权限。' : '状态变更失败，请稍后重试。');
  }

  const busy = state === 'submitting' || state === 'checking';
  return (
    <div className="modal-backdrop order-status-backdrop" role="presentation" onClick={busy ? undefined : onClose}>
      <section className="order-status-confirm" role="dialog" aria-modal="true" aria-labelledby="order-status-confirm-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <span>状态变更</span>
          <h2 id="order-status-confirm-title">确认工单状态变更</h2>
          <p>状态会同步到所有已登录的业务端，提交后不能撤销。</p>
        </header>
        {state === 'conflict' ? (
          <div className="order-status-conflict" role="alert">
            <strong>工单已被其他操作更新</strong>
            <p>最新状态：{latest?.status || '暂不可用'}。请返回详情后根据最新状态继续操作。</p>
          </div>
        ) : (
          <dl className="order-status-summary">
            <div><dt>工单号</dt><dd>{order.id}</dd></div>
            <div><dt>车牌号</dt><dd>{order.plate}</dd></div>
            <div><dt>当前状态</dt><dd>{order.status}</dd></div>
            <div><dt>目标状态</dt><dd>{targetStatus}</dd></div>
            <div className="impact"><dt>影响</dt><dd>工单将进入下一业务环节，后续可用操作将按新状态更新。</dd></div>
          </dl>
        )}
        {message ? <p className="order-status-message" role="status">{message}</p> : null}
        <footer className="modal-actions">
          {state === 'conflict' ? <button type="button" className="order-status-primary" onClick={onClose}>返回最新详情</button> : state === 'unknown' ? <><button type="button" onClick={onClose}>暂不确认</button><button type="button" className="order-status-primary" onClick={check}>确认提交结果</button></> : <><button type="button" onClick={onClose} disabled={busy}>取消</button><button type="button" className="order-status-primary" onClick={submit} disabled={busy}>{busy ? '正在提交…' : '确认切换'}</button></>}
        </footer>
      </section>
    </div>
  );
}
