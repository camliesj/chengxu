const STEP_FIELDS = [
  ['customer', 'phone', 'plate', 'car', 'vin', 'staff'],
  ['insuranceExpiry', 'insurer', 'type', 'accidentType', 'claimNo'],
  ['record', 'labor', 'material', 'delivery', 'remark'],
  [],
];

export function createInitialOrderCreationState(metadata = null) {
  return {
    step: 0,
    metadata,
    canCreate: false,
    fields: fieldsFromMetadata(metadata),
    fieldErrors: {},
    dirty: false,
    submitting: false,
    submitState: 'idle',
    operationId: '',
  };
}

export function orderCreationReducer(state, action) {
  switch (action.type) {
    case 'metadataLoaded':
      return {
        ...state,
        metadata: action.metadata,
        canCreate: Boolean(action.canCreate),
        fields: state.dirty ? state.fields : fieldsFromMetadata(action.metadata),
      };
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
      return {
        ...state,
        step: Math.min(3, Math.max(0, Number(action.draft?.step) || 0)),
        fields: { ...state.fields, ...(action.draft?.fields || {}) },
        dirty: true,
      };
    case 'next': {
      const fieldErrors = validateOrderCreationStep(state, state.step);
      return Object.keys(fieldErrors).length > 0
        ? { ...state, fieldErrors: { ...state.fieldErrors, ...fieldErrors } }
        : { ...state, step: Math.min(3, state.step + 1), fieldErrors: {} };
    }
    case 'back':
      return { ...state, step: Math.max(0, state.step - 1), fieldErrors: {} };
    case 'submitting':
      return { ...state, submitting: true, submitState: 'submitting', operationId: action.operationId };
    case 'serverErrors':
      return { ...state, submitting: false, submitState: 'idle', fieldErrors: action.fieldErrors || {} };
    case 'unknownResult':
      return { ...state, submitting: false, submitState: 'confirming' };
    case 'submitFailed':
      return { ...state, submitting: false, submitState: 'idle' };
    case 'reset':
      return createInitialOrderCreationState(state.metadata);
    default:
      return state;
  }
}

export function validateOrderCreationStep(state, step) {
  const errors = {};
  const required = new Set(state.metadata?.requiredFields || []);
  for (const field of STEP_FIELDS[step] || []) {
    if (required.has(field) && !String(state.fields[field] ?? '').trim()) {
      errors[field] = `order.${field}.required`;
    }
  }
  if (step === 1 && state.fields.insuranceExpiry && !validDateOnly(state.fields.insuranceExpiry)) {
    errors.insuranceExpiry = 'order.insuranceExpiry.invalid_date';
  }
  if (step === 2) {
    for (const [field, centsField] of [['labor', 'laborCents'], ['material', 'materialCents']]) {
      const parsed = moneyTextToCents(state.fields[field]);
      if (parsed.error) errors[field] = parsed.error.replace('order.money', `order.${centsField}`);
    }
  }
  return errors;
}

export function moneyTextToCents(value) {
  const text = String(value ?? '').trim() || '0';
  if (text.startsWith('-')) return { value: null, error: 'order.money.non_negative' };
  if (!/^\d+(?:\.\d{0,2})?$/u.test(text)) {
    return { value: null, error: /^\d+\.\d{3,}$/u.test(text)
      ? 'order.money.max_two_decimals'
      : 'order.money.invalid' };
  }
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents)
    ? { value: cents, error: '' }
    : { value: null, error: 'order.money.out_of_range' };
}

export function buildCreateOrderPayload(state, operationId) {
  const fieldErrors = Object.assign(
    {},
    validateOrderCreationStep(state, 0),
    validateOrderCreationStep(state, 1),
    validateOrderCreationStep(state, 2),
  );
  const labor = moneyTextToCents(state.fields.labor);
  const material = moneyTextToCents(state.fields.material);
  if (Object.keys(fieldErrors).length > 0) return { payload: null, fieldErrors };
  const text = (field) => String(state.fields[field] ?? '').trim();
  return {
    payload: {
      operationId,
      order: {
        customer: text('customer'), phone: text('phone'), plate: text('plate'), car: text('car'),
        vin: text('vin'), staff: text('staff'), insuranceExpiry: text('insuranceExpiry'),
        insurer: text('insurer'), type: text('type'), accidentType: text('accidentType'),
        claimNo: text('claimNo'), record: text('record'), laborCents: labor.value,
        materialCents: material.value, delivery: text('delivery'), remark: text('remark'),
      },
    },
    fieldErrors: {},
  };
}

export function mapOrderCreationFieldErrors(fieldErrors = {}) {
  return Object.fromEntries(Object.entries(fieldErrors).map(([field, error]) => [
    field === 'laborCents' ? 'labor' : field === 'materialCents' ? 'material' : field,
    error,
  ]));
}

export function legacyOrderToCreatePayload(order, operationId) {
  const labor = moneyTextToCents(order?.labor);
  const material = moneyTextToCents(order?.material);
  return {
    operationId,
    order: {
      customer: String(order?.customer || '').trim(),
      phone: String(order?.phone || '').trim(),
      plate: String(order?.plate || '').trim(),
      car: String(order?.car || '').trim(),
      vin: String(order?.vin || '').trim(),
      staff: String(order?.staff || '').trim(),
      insuranceExpiry: String(order?.insuranceExpiry || '').trim(),
      insurer: String(order?.insurer || '').trim(),
      type: String(order?.type || '').trim(),
      accidentType: String(order?.accidentType || '').trim(),
      claimNo: String(order?.claimNo || '').trim(),
      record: String(order?.record || '').trim(),
      laborCents: labor.error ? 0 : labor.value,
      materialCents: material.error ? 0 : material.value,
      delivery: String(order?.delivery || '').trim(),
      remark: String(order?.remark || '').trim(),
    },
  };
}

function fieldsFromMetadata(metadata) {
  const defaults = metadata?.defaults || {};
  return {
    customer: '', phone: '', plate: '', car: '', vin: '', staff: defaults.staff || '',
    insuranceExpiry: '', insurer: defaults.insurer || '', type: defaults.type || '',
    accidentType: defaults.accidentType || '', claimNo: '', record: '',
    labor: centsToText(defaults.laborCents), material: centsToText(defaults.materialCents),
    delivery: defaults.delivery || '', remark: defaults.remark || '',
  };
}

function centsToText(value) {
  const cents = Number.isSafeInteger(value) && value >= 0 ? value : 0;
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

function validDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
