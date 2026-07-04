const ORDER_COLUMNS = [
  'id',
  'date',
  'time',
  'plate',
  'customer',
  'phone',
  'car',
  'insurer',
  'type',
  'status',
  'labor',
  'material',
  'amount',
  'record',
  'staff',
  'delivery',
  'vin',
  'claim_no',
  'accident_type',
  'payment_method',
  'remark',
  'settlement_date',
  'settlement_time',
  'settlement_remark',
];

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
}

function toOrder(row) {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    plate: row.plate,
    customer: row.customer,
    phone: row.phone,
    car: row.car,
    insurer: row.insurer,
    type: row.type,
    status: row.status,
    labor: Number(row.labor) || 0,
    material: Number(row.material) || 0,
    amount: Number(row.amount) || 0,
    record: row.record,
    staff: row.staff,
    delivery: row.delivery,
    vin: row.vin || '',
    claimNo: row.claim_no || '',
    accidentType: row.accident_type || '',
    paymentMethod: row.payment_method || '',
    remark: row.remark || '',
    settlementDate: row.settlement_date || '',
    settlementTime: row.settlement_time || '',
    settlementRemark: row.settlement_remark || '',
  };
}

function cleanText(value) {
  return String(value || '').trim();
}

function normalizeMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalizeOrder(input) {
  const labor = normalizeMoney(input.labor);
  const material = normalizeMoney(input.material);
  const amount = normalizeMoney(input.amount) || labor + material;

  return {
    id: cleanText(input.id),
    date: cleanText(input.date),
    time: cleanText(input.time),
    plate: cleanText(input.plate),
    customer: cleanText(input.customer),
    phone: cleanText(input.phone),
    car: cleanText(input.car),
    insurer: cleanText(input.insurer) || '人保财险',
    type: cleanText(input.type) || '标的车',
    status: cleanText(input.status) || '在修中',
    labor,
    material,
    amount,
    record: cleanText(input.record),
    staff: cleanText(input.staff) || '张工',
    delivery: cleanText(input.delivery) || '待确认',
    vin: cleanText(input.vin),
    claim_no: cleanText(input.claimNo),
    accident_type: cleanText(input.accidentType) || '常规维修',
    payment_method: cleanText(input.paymentMethod) || '待确认',
    remark: cleanText(input.remark),
    settlement_date: cleanText(input.settlementDate),
    settlement_time: cleanText(input.settlementTime),
    settlement_remark: cleanText(input.settlementRemark),
  };
}

function validateOrder(order) {
  const requiredFields = ['id', 'date', 'time', 'plate', 'customer', 'phone', 'car', 'record'];
  const missing = requiredFields.filter((field) => !order[field]);
  if (missing.length > 0) {
    return `缺少必填字段：${missing.join(', ')}`;
  }
  return '';
}

export async function onRequestGet({ env }) {
  const result = await env.DB.prepare(
    'SELECT * FROM repair_orders ORDER BY date DESC, time DESC, created_at DESC',
  ).all();
  return json({ orders: result.results.map(toOrder) });
}

export async function onRequestPost({ request, env }) {
  const payload = await request.json();
  const order = normalizeOrder(payload.order || payload);
  const validationError = validateOrder(order);
  if (validationError) {
    return json({ error: validationError }, { status: 400 });
  }

  const placeholders = ORDER_COLUMNS.map(() => '?').join(', ');
  const updates = ORDER_COLUMNS
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ');

  await env.DB.prepare(`
    INSERT INTO repair_orders (${ORDER_COLUMNS.join(', ')}, updated_at)
    VALUES (${placeholders}, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET ${updates}, updated_at = CURRENT_TIMESTAMP
  `).bind(...ORDER_COLUMNS.map((column) => order[column])).run();

  return json({ order: toOrder(order) });
}
