import { json, requireSession, writeOperationLog } from '../_shared/auth.js';

const ORDER_COLUMNS = [
  'id',
  'company_id',
  'date',
  'time',
  'plate',
  'customer',
  'phone',
  'car',
  'insurer',
  'insurance_expiry',
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
  'settlement_receipt_key',
  'settlement_receipt_name',
  'settlement_receipt_type',
  'settlement_receipt_size',
  'settlement_receipt_uploaded_at',
  'voided',
  'voided_at',
  'void_reason',
];

function toOrder(row) {
  return {
    id: row.id,
    companyId: row.company_id || 'tongda',
    date: row.date,
    time: row.time,
    plate: row.plate,
    customer: row.customer,
    phone: row.phone,
    car: row.car,
    insurer: row.insurer,
    insuranceExpiry: row.insurance_expiry || '',
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
    settlementReceiptKey: row.settlement_receipt_key || '',
    settlementReceiptName: row.settlement_receipt_name || '',
    settlementReceiptType: row.settlement_receipt_type || '',
    settlementReceiptSize: Number(row.settlement_receipt_size) || 0,
    settlementReceiptUploadedAt: row.settlement_receipt_uploaded_at || '',
    voided: Number(row.voided) === 1,
    voidedAt: row.voided_at || '',
    voidReason: row.void_reason || '',
  };
}

function cleanText(value) {
  return String(value || '').trim();
}

function normalizeMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalizeOrder(input, session) {
  const labor = normalizeMoney(input.labor);
  const material = normalizeMoney(input.material);
  const amount = normalizeMoney(input.amount) || labor + material;

  return {
    id: cleanText(input.id),
    company_id: cleanText(input.companyId) || session?.company_id || 'tongda',
    date: cleanText(input.date),
    time: cleanText(input.time),
    plate: cleanText(input.plate),
    customer: cleanText(input.customer),
    phone: cleanText(input.phone),
    car: cleanText(input.car),
    insurer: cleanText(input.insurer) || '人保财险',
    insurance_expiry: cleanText(input.insuranceExpiry),
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
    settlement_receipt_key: cleanText(input.settlementReceiptKey),
    settlement_receipt_name: cleanText(input.settlementReceiptName),
    settlement_receipt_type: cleanText(input.settlementReceiptType),
    settlement_receipt_size: Number(input.settlementReceiptSize) || 0,
    settlement_receipt_uploaded_at: cleanText(input.settlementReceiptUploadedAt),
    voided: input.voided ? 1 : 0,
    voided_at: cleanText(input.voidedAt),
    void_reason: cleanText(input.voidReason),
  };
}

function validateOrder(order, existing) {
  const requiredFields = ['id', 'date', 'time', 'plate', 'customer', 'phone', 'car', 'record'];
  if (!existing) {
    requiredFields.push('insurance_expiry');
  }
  const missing = requiredFields.filter((field) => !order[field]);
  if (missing.length > 0) {
    return `缺少必填字段：${missing.join(', ')}`;
  }
  return '';
}

function validateSettlementPermission(order, existing, session) {
  if (session.role === 'admin') return '';
  const settlementStatuses = ['待结算', '已结算'];
  const isStatusChanged = !existing || order.status !== existing.status;
  if (isStatusChanged && (settlementStatuses.includes(order.status) || settlementStatuses.includes(existing?.status))) {
    return 'SETTLEMENT_ADMIN_REQUIRED';
  }
  return '';
}

export async function onRequestGet({ request, env }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;

  const result = await env.DB.prepare(
    'SELECT * FROM repair_orders WHERE voided = 0 AND company_id = ? ORDER BY date DESC, time DESC, created_at DESC',
  ).bind(session.company_id || 'tongda').all();
  return json({ orders: result.results.map(toOrder) });
}

export async function onRequestPost({ request, env }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;

  const payload = await request.json();
  const order = normalizeOrder(payload.order || payload, session);
  const existing = await env.DB.prepare('SELECT id, status FROM repair_orders WHERE id = ? AND company_id = ?')
    .bind(order.id, session.company_id || 'tongda')
    .first();
  const validationError = validateOrder(order, existing);
  if (validationError) {
    return json({ error: validationError }, { status: 400 });
  }
  const permissionError = validateSettlementPermission(order, existing, session);
  if (permissionError) {
    return json({ error: permissionError }, { status: 403 });
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

  const action = !existing
    ? 'create_order'
    : order.status === '已结算' && existing.status !== '已结算'
      ? 'settle_order'
      : existing.status === '已结算' && order.status !== '已结算'
        ? 'reverse_settlement'
        : 'update_order';
  await writeOperationLog(env, session, action, 'repair_order', order.id, `${order.plate} ${order.customer}`);

  return json({ order: toOrder(order) });
}
