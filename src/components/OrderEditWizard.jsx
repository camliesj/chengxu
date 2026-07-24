import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { ORDER_FORM_STEPS } from './OrderCreationWizard.jsx';
import { moneyTextToCents } from '../orderCreationLogic.js';
import { buildEditOrderPayload, createInitialOrderEditState, orderEditReducer } from '../orderEditLogic.js';
import { queryEditOperation } from '../orderEditApi.js';
import { createBrowserOrderEditDraftStore } from '../orderEditDraftStore.js';

export default function OrderEditWizard({ detail, metadata, session, companyId, actor, isOffline, canEdit, onEdit, onUpdated, onClose }) {
  const [state, dispatch] = useReducer(orderEditReducer, undefined, () => createInitialOrderEditState(detail, metadata));
  const [message, setMessage] = useState('');
  const [leaving, setLeaving] = useState(false);
  const store = useMemo(() => createBrowserOrderEditDraftStore(), []);

  useEffect(() => {
    let active = true;
    store.load(actor, companyId, detail.id).then((draft) => {
      if (active && draft?.fields) dispatch({ type: 'restoreDraft', draft });
    }).catch(() => {});
    return () => { active = false; };
  }, [actor, companyId, detail.id, store]);

  useEffect(() => {
    if (!state.dirty) return undefined;
    const timer = window.setTimeout(() => saveDraft(), 500);
    return () => window.clearTimeout(timer);
  }, [state.dirty, state.fields, state.step, state.expectedVersion]);

  function draft() {
    return { step: state.step, fields: state.fields, metadata: state.metadata, baseSnapshot: state.baseSnapshot, expectedVersion: state.expectedVersion, operationId: state.operationId, submitState: state.submitState };
  }
  async function saveDraft() {
    if (!state.dirty) return;
    try { await store.save(actor, companyId, detail.id, draft()); } catch { setMessage('草稿保存失败，请稍后重试'); }
  }
  function requestClose() { state.dirty ? setLeaving(true) : onClose(); }
  async function submit() {
    const operationId = crypto.randomUUID();
    const built = buildEditOrderPayload(state, operationId);
    if (!built.payload) { dispatch({ type: 'serverErrors', fieldErrors: built.fieldErrors }); return; }
    dispatch({ type: 'submitting', operationId }); setMessage('');
    const result = await onEdit(built.payload);
    if (result.kind === 'success') { await store.delete(actor, companyId, detail.id); onUpdated(result.value.order); return; }
    if (result.kind === 'validationFailure') { dispatch({ type: 'serverErrors', fieldErrors: result.fieldErrors }); return; }
    if (result.kind === 'conflict') { dispatch({ type: 'conflict', latest: result.latest, conflictingFields: result.conflictingFields }); return; }
    if (['unknownResult', 'networkUnavailable', 'serverFailure', 'malformedResponse'].includes(result.kind)) {
      dispatch({ type: 'unknownResult' }); await store.save(actor, companyId, detail.id, { ...draft(), operationId, submitState: 'confirming' }).catch(() => {}); setMessage('提交结果正在确认，请勿重复编辑'); return;
    }
    dispatch({ type: 'submitFailed' }); setMessage(result.kind === 'notEditable' ? '工单当前状态不可编辑' : '编辑失败，请稍后重试');
  }
  async function confirm() {
    const result = await queryEditOperation(state.operationId, session);
    if (result.kind === 'success') { await store.delete(actor, companyId, detail.id); onUpdated(result.value.order); }
    else setMessage(result.kind === 'unknownResult' ? '服务端仍在处理，请稍后再次确认' : '暂时无法确认结果，请保留当前页面');
  }
  const disabled = isOffline || !canEdit || state.submitState !== 'idle';
  const total = (moneyTextToCents(state.fields.labor).value || 0) + (moneyTextToCents(state.fields.material).value || 0);
  const field = (name, label, props = {}) => <label className="wizard-field" key={name}><span>{label}</span><input id={`edit-${name}`} value={state.fields[name] || ''} onChange={(event) => dispatch({ type: 'fieldChanged', field: name, value: event.target.value })} {...props} />{state.fieldErrors[name] ? <small>{state.fieldErrors[name]}</small> : null}</label>;
  const select = (name, label, options) => <label className="wizard-field" key={name}><span>{label}</span><select id={`edit-${name}`} value={state.fields[name] || ''} onChange={(event) => dispatch({ type: 'fieldChanged', field: name, value: event.target.value })}>{(options || []).map((item) => { const value = typeof item === 'string' ? item : item.name; return <option key={value} value={value}>{typeof item === 'string' ? item : `${item.name} · ${item.title}`}</option>; })}</select></label>;
  const options = state.metadata?.options || {};
  return <div className="modal-backdrop order-wizard-backdrop" role="presentation" onClick={requestClose}>
    <section className="order-wizard" role="dialog" aria-modal="true" aria-label="编辑维修工单" onClick={(event) => event.stopPropagation()}>
      <header className="order-wizard-header"><div><span>编辑维修工单</span><h2 id="order-edit-wizard-title">{ORDER_FORM_STEPS[state.step]}</h2><p>状态只能通过专用状态操作变更</p></div><button type="button" onClick={requestClose}>关闭</button></header>
      <ol className="order-wizard-progress" aria-label="编辑工单进度">{ORDER_FORM_STEPS.map((label, index) => <li key={label} className={index === state.step ? 'active' : index < state.step ? 'done' : ''}><b>{index + 1}</b><span>{label}</span></li>)}</ol>
      <div className="order-wizard-body">
        {state.step === 0 ? <div className="wizard-grid">{field('customer', '客户姓名 *')}{field('phone', '手机号 *')}{field('plate', '车牌号 *')}{field('car', '车型 *')}{field('vin', 'VIN / 车架号')}{select('staff', '负责人', options.staff)}</div> : null}
        {state.step === 1 ? <div className="wizard-grid">{field('insuranceExpiry', '保险到期日 *', { type: 'date' })}{select('insurer', '保险公司', options.insurers)}{select('type', '车辆类型', options.vehicleTypes)}{select('accidentType', '事故类型', options.accidentTypes)}{field('claimNo', '保险案件号')}</div> : null}
        {state.step === 2 ? <div className="wizard-grid">{field('record', '维修项目 *')}{field('labor', '工时费', { inputMode: 'decimal' })}{field('material', '材料费', { inputMode: 'decimal' })}{field('delivery', '预计交车')}{field('remark', '接待备注')}</div> : null}
        {state.step === 3 ? <div className="wizard-confirm"><p>{state.fields.customer} · {state.fields.plate}</p><p>维修项目：{state.fields.record}</p><div className="wizard-total"><span>预计总金额</span><strong>¥{(total / 100).toFixed(2)}</strong></div></div> : null}
        {isOffline ? <div className="wizard-message" role="status">当前离线：可保存草稿，联网后才能提交。</div> : null}{message ? <div className="wizard-message" role="status">{message}</div> : null}
        {state.submitState === 'conflict' ? <Conflict state={state} onReturn={async () => { await store.delete(actor, companyId, detail.id); onUpdated(state.latest); }} onRebase={() => dispatch({ type: 'rebase' })} /> : null}
      </div>
      <footer className="order-wizard-footer"><button type="button" onClick={() => dispatch({ type: 'back' })} disabled={state.step === 0 || state.submitState !== 'idle'}>上一步</button><span>第 {state.step + 1} / 4 步</span><button type="button" onClick={async () => { await saveDraft(); setMessage('草稿已加密保存在本机'); }} disabled={!state.dirty}>保存草稿</button>{state.submitState === 'confirming' ? <button type="button" className="primary" onClick={confirm} disabled={isOffline}>确认提交结果</button> : state.submitState === 'conflict' ? null : state.step < 3 ? <button type="button" className="primary" onClick={() => dispatch({ type: 'next' })}>下一步</button> : <button type="button" className="primary" onClick={submit} disabled={disabled}>确认并保存</button>}</footer>
      {leaving ? <div className="wizard-leave" role="alertdialog" aria-modal="true" aria-label="保留当前编辑内容？"><div><h3>保留当前编辑内容？</h3><div><button onClick={() => setLeaving(false)}>继续编辑</button><button onClick={async () => { await store.delete(actor, companyId, detail.id); onClose(); }}>放弃草稿</button><button className="primary" onClick={async () => { await saveDraft(); onClose(); }}>保存草稿并退出</button></div></div></div> : null}
    </section>
  </div>;
}

function Conflict({ state, onReturn, onRebase }) {
  return <section className="wizard-message error" aria-label="编辑冲突"><strong>工单已被其他人更新</strong>{state.conflictingFields.map((field) => <p key={field}>{field}：服务器「{String(state.latest?.[field] ?? '')}」/ 本地「{String(state.fields[field] ?? '')}」</p>)}<button type="button" onClick={onReturn}>返回最新详情</button><button type="button" className="primary" onClick={onRebase}>基于最新版本继续编辑</button></section>;
}
