const ACTION_LABELS = {
  create_order: '新增工单',
  update_order: '编辑工单',
  change_order_status: '切换维修状态',
  settle_order: '完成结算',
  reverse_settlement: '返结算',
  void_order: '作废工单',
  upload_receipt: '上传到账回执',
  delete_receipt: '删除到账回执',
  create_account: '新增账号',
  update_account: '编辑账号',
  delete_account: '删除账号',
  create_dictionary: '新增字典项',
  update_dictionary: '编辑字典项',
  delete_dictionary: '删除字典项',
  update_access_code: '修改访问码',
  delete_access_code: '删除访问码',
  unlock_access_code_panel: '查看访问码管理',
};

const ACTION_PRIORITY = {
  settle_order: 100,
  reverse_settlement: 100,
  void_order: 95,
  change_order_status: 90,
  create_order: 85,
  update_order: 80,
  delete_receipt: 60,
  upload_receipt: 50,
};

function utcDate(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text.replace(' ', 'T')}Z`;
  const date = new Date(zoned);
  return Number.isNaN(date.getTime()) ? null : date;
}

function actorKey(log) {
  return String(log.label || log.role || '');
}

function actionPriority(action) {
  return ACTION_PRIORITY[action] || 10;
}

export function auditActionLabel(action) {
  return ACTION_LABELS[action] || String(action || '系统操作');
}

export function formatAuditTime(createdAt) {
  const date = utcDate(createdAt);
  if (!date) return String(createdAt || '');
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

export function parseAuditChanges(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function groupAuditLogs(logs) {
  const groups = [];
  const eventGroups = new Map();
  const sortedLogs = [...logs].sort((left, right) => Number(right.id || 0) - Number(left.id || 0));

  for (const log of sortedLogs) {
    const eventId = String(log.event_id || '');
    let group = eventId ? eventGroups.get(eventId) : null;

    if (!group && !eventId) {
      const currentTime = utcDate(log.created_at)?.getTime();
      group = groups.find((candidate) => {
        if (candidate.eventId) return false;
        if (candidate.targetId !== String(log.target_id || '') || candidate.actor !== actorKey(log)) return false;
        const candidateTime = utcDate(candidate.createdAt)?.getTime();
        return Number.isFinite(currentTime) && Number.isFinite(candidateTime) && Math.abs(candidateTime - currentTime) <= 5000;
      });
    }

    if (!group) {
      group = {
        id: eventId || `legacy-${log.id}`,
        eventId,
        createdAt: log.created_at,
        actor: actorKey(log),
        role: log.role || '',
        targetId: String(log.target_id || ''),
        targetType: log.target_type || '',
        action: log.action || '',
        summary: log.summary || log.detail || auditActionLabel(log.action),
        changes: parseAuditChanges(log.changes),
        steps: [],
      };
      groups.push(group);
      if (eventId) eventGroups.set(eventId, group);
    }

    group.steps.push(log);
    if (actionPriority(log.action) > actionPriority(group.action)) {
      group.action = log.action;
      group.summary = log.summary || log.detail || auditActionLabel(log.action);
      group.changes = parseAuditChanges(log.changes);
    }
  }

  return groups;
}
