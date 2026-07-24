import {
  buildCreateOrderPayload,
  mapOrderCreationFieldErrors,
  validateOrderCreationStep,
} from './orderCreationLogic.js';

const EDITABLE_FIELDS = [
  'customer', 'phone', 'plate', 'car', 'vin', 'staff',
  'insuranceExpiry', 'insurer', 'type', 'accidentType', 'claimNo',
  'record', 'laborCents', 'materialCents', 'delivery', 'remark',
];

export function createInitialOrderEditState(detail, metadata) {
  const baseSnapshot = snapshotFromDetail(detail);
  return {
    step: 0,
    orderId: String(detail?.id || ''),
    metadata: clone(metadata),
    baseSnapshot,
    expectedVersion: Number(detail?.version) || 0,
    fields: formFieldsFromSnapshot(baseSnapshot),
    fieldErrors: {},
    dirty: false,
    submitState: 'idle',
    operationId: '',
    latest: null,
    conflictingFields: [],
  };
}

export function orderEditReducer(state, action) {
  switch (action.type) {
    case 'fieldChanged': {
      const fieldErrors = { ...state.fieldErrors };
      delete fieldErrors[action.field];
      return {
        ...state,
        fields: { ...state.fields, [action.field]: action.value },
        fieldErrors,
        dirty: true,
      };
    }
    case 'restoreDraft':
      return restoreDraft(state, action.draft);
    case 'next': {
      const fieldErrors = validateOrderCreationStep(state, state.step);
      return Object.keys(fieldErrors).length
        ? { ...state, fieldErrors: { ...state.fieldErrors, ...fieldErrors } }
        : { ...state, step: Math.min(3, state.step + 1), fieldErrors: {} };
    }
    case 'back':
      return { ...state, step: Math.max(0, state.step - 1), fieldErrors: {} };
    case 'submitting':
      return { ...state, submitState: 'submitting', operationId: action.operationId };
    case 'serverErrors':
      return {
        ...state,
        submitState: 'idle',
        fieldErrors: mapOrderCreationFieldErrors(action.fieldErrors || {}),
      };
    case 'unknownResult':
      return { ...state, submitState: 'confirming' };
    case 'submitFailed':
      return { ...state, submitState: 'idle' };
    case 'conflict':
      return {
        ...state,
        submitState: 'conflict',
        latest: clone(action.latest),
        conflictingFields: [...(action.conflictingFields || [])],
      };
    case 'rebase': {
      if (!state.latest) return state;
      return {
        ...state,
        baseSnapshot: snapshotFromDetail(state.latest),
        expectedVersion: Number(state.latest.version) || 0,
        submitState: 'idle',
        operationId: '',
        latest: null,
        conflictingFields: [],
        fieldErrors: {},
        dirty: true,
      };
    }
    default:
      return state;
  }
}

export function buildEditOrderPayload(state, operationId) {
  const built = buildCreateOrderPayload(state, operationId);
  return built.payload
    ? {
        payload: {
          ...built.payload,
          expectedVersion: state.expectedVersion,
        },
        fieldErrors: {},
      }
    : built;
}

function restoreDraft(state, draft) {
  const operationId = typeof draft?.operationId === 'string' ? draft.operationId.trim() : '';
  return {
    ...state,
    step: Math.min(3, Math.max(0, Number(draft?.step) || 0)),
    metadata: draft?.metadata ? clone(draft.metadata) : state.metadata,
    baseSnapshot: draft?.baseSnapshot ? clone(draft.baseSnapshot) : state.baseSnapshot,
    expectedVersion: Number(draft?.expectedVersion) || state.expectedVersion,
    fields: { ...state.fields, ...(draft?.fields || {}) },
    operationId,
    submitState: operationId && draft?.submitState === 'confirming' ? 'confirming' : 'idle',
    dirty: true,
  };
}

function snapshotFromDetail(detail) {
  return Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, canonicalValue(detail?.[field], field)]));
}

function canonicalValue(value, field) {
  if (field === 'laborCents' || field === 'materialCents') {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }
  return String(value ?? '');
}

function formFieldsFromSnapshot(snapshot) {
  const fields = { ...snapshot };
  fields.labor = centsToMoneyText(snapshot.laborCents);
  fields.material = centsToMoneyText(snapshot.materialCents);
  delete fields.laborCents;
  delete fields.materialCents;
  return fields;
}

function centsToMoneyText(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function clone(value) {
  if (value === undefined || value === null) return value;
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}
