const FIELD_LABELS = {
  plate: '车牌号',
  customer: '客户名称',
  phone: '手机号',
  car: '车型',
  insurer: '保险公司',
  insurance_expiry: '保险到期日',
  type: '车辆类型',
  labor: '工时费',
  material: '材料费',
  amount: '工单金额',
  record: '维修项目',
  staff: '业务员',
  delivery: '预计交车',
  vin: '车架号',
  claim_no: '案件号',
  accident_type: '事故类型',
  remark: '接待备注',
};

const MONEY_FIELDS = new Set(['labor', 'material', 'amount']);
const PROTECTED_ARCHIVE_FIELDS = [
  'status',
  'payment_method',
  'settlement_date',
  'settlement_time',
  'settlement_remark',
  'settlement_receipt_key',
  'settlement_receipt_name',
  'settlement_receipt_type',
  'settlement_receipt_size',
  'settlement_receipt_uploaded_at',
];

function comparable(value) {
  return value == null ? '' : String(value);
}

function displayValue(field, value) {
  const normalized = comparable(value) || '空';
  if (MONEY_FIELDS.has(field) && normalized !== '空') {
    const amount = Number(normalized);
    return Number.isFinite(amount) ? `¥${amount.toLocaleString('zh-CN')}` : normalized;
  }
  return normalized;
}

export function protectArchiveEdit(incoming, existing) {
  const protectedOrder = { ...incoming };
  for (const field of PROTECTED_ARCHIVE_FIELDS) {
    protectedOrder[field] = existing[field];
  }
  return protectedOrder;
}

export function settledEditAccessError(existing, role) {
  return existing?.status === '已结算' && role !== 'admin' ? 'ARCHIVE_EDIT_ADMIN_REQUIRED' : '';
}

export function buildOrderAuditEvent(existing, next) {
  if (!existing) {
    return {
      action: 'create_order',
      summary: `新增工单：${next?.plate || ''} ${next?.customer || ''}`.trim(),
      changes: [],
    };
  }

  const changes = Object.entries(FIELD_LABELS).flatMap(([field, label]) => {
    if (comparable(existing[field]) === comparable(next[field])) return [];
    return [{ field, label, before: existing[field] ?? '', after: next[field] ?? '' }];
  });

  if (comparable(existing.status) !== comparable(next.status)) {
    const statusChange = { field: 'status', label: '维修状态', before: existing.status || '', after: next.status || '' };
    const allChanges = [statusChange, ...changes];
    if (next.status === '已结算') {
      return { action: 'settle_order', summary: `完成结算：${next.plate || ''}，金额 ${displayValue('amount', next.amount)}`, changes: allChanges };
    }
    if (existing.status === '已结算') {
      return { action: 'reverse_settlement', summary: `返结算：${next.plate || ''}，已结算 → ${next.status || '待结算'}`, changes: allChanges };
    }
    return { action: 'change_order_status', summary: `切换维修状态：${existing.status || '未设置'} → ${next.status || '未设置'}`, changes: allChanges };
  }

  if (changes.length === 0) return null;
  const details = changes.slice(0, 4).map((change) => (
    `${change.label} ${displayValue(change.field, change.before)} → ${displayValue(change.field, change.after)}`
  ));
  if (changes.length > 4) details.push(`另有 ${changes.length - 4} 项变化`);
  return { action: 'update_order', summary: `编辑工单：${details.join('；')}`, changes };
}
