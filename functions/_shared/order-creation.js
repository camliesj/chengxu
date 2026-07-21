const REQUIRED_FIELDS = ['customer', 'phone', 'plate', 'car', 'insuranceExpiry', 'record'];
const VEHICLE_TYPES = ['标的车', '三者车'];
const ACCIDENT_TYPES = [
  '喷漆维修（无换件）',
  '钣喷维修（有换件）',
  '机电维修保养',
  '数据修复',
];
const DELIVERY_STATUSES = ['待确认', '今日交车', '明日交车'];
const MAX_LENGTHS = {
  customer: 80,
  phone: 40,
  plate: 24,
  car: 120,
  vin: 64,
  staff: 80,
  insuranceExpiry: 10,
  insurer: 80,
  type: 40,
  accidentType: 120,
  claimNo: 120,
  record: 2000,
  delivery: 80,
  remark: 2000,
};

export function buildOrderCreationMetadata(dictionaryRows = []) {
  const activeRows = [...dictionaryRows].sort(
    (left, right) => (Number(left.sort_order) || 0) - (Number(right.sort_order) || 0),
  );
  const insurers = unique(
    activeRows.filter((row) => row.category === 'insurer').map((row) => cleanText(row.value)),
  );
  const staff = activeRows
    .filter((row) => row.category === 'staff')
    .map((row) => ({
      id: cleanText(row.id),
      name: cleanText(row.extra),
      title: cleanText(row.value),
    }))
    .filter((row) => row.id && row.name);
  const insurerOptions = insurers.length > 0 ? insurers : ['人保财险'];

  return {
    contractVersion: 1,
    requiredFields: [...REQUIRED_FIELDS],
    defaults: {
      insurer: insurerOptions[0],
      staff: staff[0]?.name || '',
      type: VEHICLE_TYPES[0],
      accidentType: ACCIDENT_TYPES[0],
      delivery: DELIVERY_STATUSES[0],
      laborCents: 0,
      materialCents: 0,
      remark: '',
    },
    options: {
      insurers: insurerOptions,
      staff,
      vehicleTypes: [...VEHICLE_TYPES],
      accidentTypes: [...ACCIDENT_TYPES],
      deliveryStatuses: [...DELIVERY_STATUSES],
    },
    maxLengths: { ...MAX_LENGTHS },
  };
}

export function normalizeCreateOrderCommand(input = {}, metadata = buildOrderCreationMetadata()) {
  const source = input && typeof input === 'object' ? input : {};
  const fieldErrors = {};
  const value = {
    customer: cleanText(source.customer),
    phone: cleanText(source.phone),
    plate: cleanText(source.plate),
    car: cleanText(source.car),
    vin: cleanText(source.vin),
    staff: cleanText(source.staff) || metadata.defaults.staff,
    insuranceExpiry: cleanText(source.insuranceExpiry),
    insurer: cleanText(source.insurer) || metadata.defaults.insurer,
    type: cleanText(source.type) || metadata.defaults.type,
    accidentType: cleanText(source.accidentType) || metadata.defaults.accidentType,
    claimNo: cleanText(source.claimNo),
    record: cleanText(source.record),
    laborCents: source.laborCents ?? metadata.defaults.laborCents,
    materialCents: source.materialCents ?? metadata.defaults.materialCents,
    delivery: cleanText(source.delivery) || metadata.defaults.delivery,
    remark: cleanText(source.remark),
  };

  for (const field of REQUIRED_FIELDS) {
    if (!value[field]) fieldErrors[field] = `order.${field}.required`;
  }
  for (const [field, limit] of Object.entries(metadata.maxLengths || MAX_LENGTHS)) {
    if (typeof value[field] === 'string' && value[field].length > limit) {
      fieldErrors[field] = `order.${field}.too_long`;
    }
  }
  if (value.insuranceExpiry && !isValidDateOnly(value.insuranceExpiry)) {
    fieldErrors.insuranceExpiry = 'order.insuranceExpiry.invalid_date';
  }
  validateOption(fieldErrors, 'insurer', value.insurer, metadata.options.insurers);
  validateOption(fieldErrors, 'type', value.type, metadata.options.vehicleTypes);
  validateOption(fieldErrors, 'accidentType', value.accidentType, metadata.options.accidentTypes);
  validateOption(fieldErrors, 'delivery', value.delivery, metadata.options.deliveryStatuses);
  if (value.staff) {
    validateOption(fieldErrors, 'staff', value.staff, metadata.options.staff.map((row) => row.name));
  }
  validateMoney(fieldErrors, 'laborCents', value.laborCents);
  validateMoney(fieldErrors, 'materialCents', value.materialCents);

  if (Object.keys(fieldErrors).length > 0) return { value: null, fieldErrors };
  return {
    value: {
      ...value,
      amountCents: value.laborCents + value.materialCents,
      status: '在修中',
      version: 1,
    },
    fieldErrors,
  };
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function validateOption(errors, field, value, options = []) {
  if (value && !options.includes(value)) errors[field] = `order.${field}.invalid_option`;
}

function validateMoney(errors, field, value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    errors[field] = `order.${field}.non_negative_integer`;
  }
}

function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
