import React, { useEffect, useMemo, useReducer, useState } from 'react';
import {
  buildCreateOrderPayload,
  createInitialOrderCreationState,
  mapOrderCreationFieldErrors,
  moneyTextToCents,
  orderCreationReducer,
} from '../orderCreationLogic.js';
import {
  fetchOrderCreationMetadata,
  queryCreateOrderOperation,
} from '../orderCreationApi.js';
import { createBrowserOrderCreationDraftStore } from '../orderCreationDraftStore.js';

const STEPS = ['客户与车辆', '保险与事故', '维修与费用', '确认提交'];
const ERROR_TEXT = {
  'order.customer.required': '请输入客户姓名',
  'order.phone.required': '请输入手机号',
  'order.plate.required': '请输入车牌号',
  'order.car.required': '请输入车型',
  'order.insuranceExpiry.required': '请选择保险到期日',
  'order.insuranceExpiry.invalid_date': '保险到期日格式不正确',
  'order.record.required': '请输入维修项目',
  'order.laborCents.non_negative': '工时费不能为负数',
  'order.laborCents.max_two_decimals': '工时费最多保留两位小数',
  'order.materialCents.non_negative': '材料费不能为负数',
  'order.materialCents.max_two_decimals': '材料费最多保留两位小数',
};

export default function OrderCreationWizard({ session, companyId, actor, isOffline, onCreateOrder, onCreated, onClose }) {
  const [state, dispatch] = useReducer(orderCreationReducer, undefined, createInitialOrderCreationState);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const draftStore = useMemo(() => createBrowserOrderCreationDraftStore(), []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    Promise.all([
      fetchOrderCreationMetadata(session, { signal: controller.signal }),
      draftStore.load(actor, companyId),
    ]).then(([metadataResult, draft]) => {
      if (!active) return;
      if (metadataResult.kind !== 'success') {
        setMessage('无法加载新增工单配置，请检查网络后重试');
        setLoading(false);
        return;
      }
      dispatch({
        type: 'metadataLoaded',
        metadata: metadataResult.value.metadata,
        canCreate: metadataResult.value.canCreate,
      });
      if (draft?.fields) dispatch({ type: 'restoreDraft', draft });
      setLoading(false);
    }).catch((error) => {
      if (error?.name !== 'AbortError' && active) {
        setMessage('无法加载新增工单配置，请稍后重试');
        setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [actor, companyId, draftStore, session]);

  useEffect(() => {
    if (!state.dirty || !state.metadata) return undefined;
    const timer = window.setTimeout(() => {
      draftStore.save(actor, companyId, currentDraft()).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timer);
  }, [actor, companyId, draftStore, state.dirty, state.fields, state.metadata, state.step]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') requestClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  function currentDraft() {
    return {
      step: state.step,
      fields: state.fields,
      contractVersion: state.metadata?.contractVersion || '',
      operationId: state.operationId,
      submitState: state.submitState,
    };
  }

  function requestClose() {
    if (state.dirty) setLeaveConfirm(true);
    else onClose();
  }

  async function saveCurrentDraft() {
    if (!state.dirty || !state.metadata) {
      setMessage('当前没有可保存的草稿');
      return;
    }
    try {
      await draftStore.save(actor, companyId, currentDraft());
      setMessage('草稿已加密保存在本机');
    } catch {
      setMessage('草稿保存失败，请稍后重试');
    }
  }

  async function submit() {
    const operationId = state.operationId || crypto.randomUUID();
    const built = buildCreateOrderPayload(state, operationId);
    if (!built.payload) {
      dispatch({ type: 'serverErrors', fieldErrors: built.fieldErrors });
      setMessage('请检查标记的必填项');
      return;
    }
    dispatch({ type: 'submitting', operationId });
    setMessage('');
    const result = await onCreateOrder(built.payload);
    if (result.kind === 'success') {
      await draftStore.delete(actor, companyId);
      onCreated(result.value.order);
      return;
    }
    if (result.kind === 'validationFailure') {
      dispatch({ type: 'serverErrors', fieldErrors: mapOrderCreationFieldErrors(result.fieldErrors) });
      setMessage('请检查标记的字段');
      return;
    }
    if (['unknownResult', 'networkUnavailable', 'malformedResponse', 'serverFailure'].includes(result.kind)) {
      dispatch({ type: 'unknownResult' });
      await draftStore.save(actor, companyId, {
        ...currentDraft(),
        operationId,
        submitState: 'confirming',
      }).catch(() => {});
      setMessage('提交结果正在确认，请勿重复新增');
      return;
    }
    dispatch({ type: 'submitFailed' });
    setMessage(result.kind === 'forbidden' ? '当前账号或企业未启用新增工单权限' : '新增失败，请稍后重试');
  }

  async function confirmUnknownResult() {
    const result = await queryCreateOrderOperation(state.operationId, session);
    if (result.kind === 'success') {
      await draftStore.delete(actor, companyId);
      onCreated(result.value.order);
    } else {
      setMessage(result.kind === 'unknownResult' ? '服务端仍在处理，请稍后再次确认' : '暂时无法确认结果，请保留当前页面');
    }
  }

  const total = (moneyTextToCents(state.fields.labor).value || 0) + (moneyTextToCents(state.fields.material).value || 0);
  const disabled = loading || isOffline || !state.canCreate || state.submitting;

  return (
    <div className="modal-backdrop order-wizard-backdrop" role="presentation" onClick={requestClose}>
      <section className="order-wizard" role="dialog" aria-modal="true" aria-labelledby="order-wizard-title" onClick={(event) => event.stopPropagation()}>
        <header className="order-wizard-header">
          <div><span>新增维修工单</span><h2 id="order-wizard-title">{STEPS[state.step]}</h2><p>正式工单号将在提交成功后由系统生成</p></div>
          <button type="button" onClick={requestClose}>关闭</button>
        </header>
        <ol className="order-wizard-progress" aria-label="新增工单进度">
          {STEPS.map((label, index) => <li key={label} className={index === state.step ? 'active' : index < state.step ? 'done' : ''}><b>{index + 1}</b><span>{label}</span></li>)}
        </ol>
        <div className="order-wizard-body">
          {loading ? <div className="wizard-status">正在加载企业字典与权限…</div> : null}
          {!loading && state.step === 0 ? <StepCustomer state={state} dispatch={dispatch} /> : null}
          {!loading && state.step === 1 ? <StepInsurance state={state} dispatch={dispatch} /> : null}
          {!loading && state.step === 2 ? <StepRepair state={state} dispatch={dispatch} /> : null}
          {!loading && state.step === 3 ? <StepConfirm state={state} total={total} /> : null}
          {isOffline ? <div className="wizard-message" role="status">当前离线：可以继续填写并保存本地草稿，联网后才能提交。</div> : null}
          {!state.canCreate && !loading ? <div className="wizard-message error" role="alert">当前企业未启用新增工单能力。</div> : null}
          {message ? <div className="wizard-message" role="status">{message}</div> : null}
        </div>
        <footer className="order-wizard-footer">
          <button type="button" onClick={() => dispatch({ type: 'back' })} disabled={state.step === 0 || state.submitting}>上一步</button>
          <span>第 {state.step + 1} / 4 步</span>
          <button type="button" onClick={saveCurrentDraft} disabled={!state.dirty || loading || state.submitting}>保存草稿</button>
          {state.submitState === 'confirming' ? <button type="button" className="primary" onClick={confirmUnknownResult} disabled={isOffline}>确认提交结果</button> : state.step < 3 ? <button type="button" className="primary" onClick={() => dispatch({ type: 'next' })} disabled={loading}>下一步</button> : <button type="button" className="primary" onClick={submit} disabled={disabled}>{state.submitting ? '正在提交…' : '确认并创建'}</button>}
        </footer>
        {leaveConfirm ? <div className="wizard-leave" role="alertdialog" aria-modal="true" aria-labelledby="wizard-leave-title"><div><h3 id="wizard-leave-title">保留当前填写内容？</h3><p>草稿仅保存在当前设备，尚未同步为正式工单。</p><div><button type="button" onClick={() => setLeaveConfirm(false)}>继续编辑</button><button type="button" onClick={async () => { await draftStore.delete(actor, companyId); onClose(); }}>放弃草稿</button><button type="button" className="primary" onClick={async () => { await draftStore.save(actor, companyId, currentDraft()); onClose(); }}>保存草稿并退出</button></div></div></div> : null}
      </section>
    </div>
  );
}

function Field({ state, dispatch, name, label, children, ...inputProps }) {
  const error = state.fieldErrors[name];
  const id = `create-${name}`;
  return <label className={error ? 'wizard-field error' : 'wizard-field'} htmlFor={id}><span>{label}</span>{children || <input id={id} value={state.fields[name]} onChange={(event) => dispatch({ type: 'fieldChanged', field: name, value: event.target.value })} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...inputProps} />}{error ? <small id={`${id}-error`}>{ERROR_TEXT[error] || '请检查此项'}</small> : null}</label>;
}

function SelectField({ state, dispatch, name, label, options }) {
  const error = state.fieldErrors[name];
  return <Field state={state} dispatch={dispatch} name={name} label={label}><select id={`create-${name}`} value={state.fields[name]} onChange={(event) => dispatch({ type: 'fieldChanged', field: name, value: event.target.value })} aria-invalid={Boolean(error)} aria-describedby={error ? `create-${name}-error` : undefined}>{options.map((option) => <option key={typeof option === 'string' ? option : option.name} value={typeof option === 'string' ? option : option.name}>{typeof option === 'string' ? option : `${option.name} · ${option.title}`}</option>)}</select></Field>;
}

function StepCustomer({ state, dispatch }) { const options = state.metadata.options; return <div className="wizard-grid"><Field state={state} dispatch={dispatch} name="customer" label="客户姓名 *" autoFocus /><Field state={state} dispatch={dispatch} name="phone" label="手机号 *" inputMode="tel" /><Field state={state} dispatch={dispatch} name="plate" label="车牌号 *" /><Field state={state} dispatch={dispatch} name="car" label="车型 *" /><Field state={state} dispatch={dispatch} name="vin" label="VIN / 车架号" /><SelectField state={state} dispatch={dispatch} name="staff" label="负责人" options={options.staff || []} /></div>; }
function StepInsurance({ state, dispatch }) { const options = state.metadata.options; return <div className="wizard-grid"><Field state={state} dispatch={dispatch} name="insuranceExpiry" label="保险到期日 *" type="date" /><SelectField state={state} dispatch={dispatch} name="insurer" label="保险公司" options={options.insurers || []} /><SelectField state={state} dispatch={dispatch} name="type" label="车辆类型" options={options.vehicleTypes || []} /><SelectField state={state} dispatch={dispatch} name="accidentType" label="事故类型" options={options.accidentTypes || []} /><Field state={state} dispatch={dispatch} name="claimNo" label="保险案件号" /></div>; }
function StepRepair({ state, dispatch }) { const recordError = state.fieldErrors.record; return <div className="wizard-grid"><Field state={state} dispatch={dispatch} name="record" label="维修项目 *"><textarea id="create-record" value={state.fields.record} onChange={(event) => dispatch({ type: 'fieldChanged', field: 'record', value: event.target.value })} rows="4" aria-invalid={Boolean(recordError)} aria-describedby={recordError ? 'create-record-error' : undefined} /></Field><Field state={state} dispatch={dispatch} name="labor" label="工时费" inputMode="decimal" /><Field state={state} dispatch={dispatch} name="material" label="材料费" inputMode="decimal" /><Field state={state} dispatch={dispatch} name="delivery" label="预计交车" placeholder="例如：明日下午或 07-22 18:00" /><Field state={state} dispatch={dispatch} name="remark" label="接待备注"><textarea id="create-remark" value={state.fields.remark} onChange={(event) => dispatch({ type: 'fieldChanged', field: 'remark', value: event.target.value })} rows="3" /></Field></div>; }
function StepConfirm({ state, total }) { const f = state.fields; return <div className="wizard-confirm"><section><h3>客户与车辆</h3><dl><div><dt>客户</dt><dd>{f.customer}</dd></div><div><dt>联系电话</dt><dd>{f.phone}</dd></div><div><dt>车辆</dt><dd>{f.plate} · {f.car}</dd></div><div><dt>负责人</dt><dd>{f.staff || '待分配'}</dd></div></dl></section><section><h3>保险与维修</h3><dl><div><dt>保险</dt><dd>{f.insurer} · {f.insuranceExpiry}</dd></div><div><dt>事故类型</dt><dd>{f.accidentType}</dd></div><div className="wide"><dt>维修项目</dt><dd>{f.record}</dd></div><div><dt>预计交车</dt><dd>{f.delivery || '待确认'}</dd></div></dl></section><div className="wizard-total"><span>预计总金额</span><strong>¥{(total / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong></div></div>; }
