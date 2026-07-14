export function normalizeCloudRecord(record, companyId) {
  if (!record || typeof record !== 'object' || !String(record.id || '').trim()) {
    throw new Error('RECORD_ID_REQUIRED');
  }
  return { ...record, id: String(record.id).trim(), companyId };
}

export function parseCloudRows(rows = []) {
  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.record_json)];
    } catch {
      return [];
    }
  });
}
