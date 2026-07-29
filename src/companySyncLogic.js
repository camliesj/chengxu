const storagePrefix = 'zhiwei:company-sync:';

export function companySyncStorageKey(companyId) {
  return `${storagePrefix}${String(companyId || '').trim()}`;
}

function storageRead(storage, key) {
  return typeof storage?.getItem === 'function' ? storage.getItem(key) : storage?.get?.(key);
}

function storageWrite(storage, key, value) {
  if (typeof storage?.setItem === 'function') storage.setItem(key, value);
  else storage?.set?.(key, value);
}

export function readCompanySyncAt(storage, companyId) {
  const value = storageRead(storage, companySyncStorageKey(companyId));
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : '';
}

export function writeCompanySyncAt(storage, companyId, at) {
  if (typeof at !== 'string' || Number.isNaN(Date.parse(at))) return;
  storageWrite(storage, companySyncStorageKey(companyId), at);
}

export async function runCompanyFullSync({ now, refreshOrders, refreshVehicles, refreshPolicies, refreshHistory }) {
  try {
    await Promise.all([refreshOrders(), refreshVehicles(), refreshPolicies(), refreshHistory()]);
    return { ok: true, at: now() };
  } catch (error) {
    return { ok: false, error: error?.message || '云端同步失败' };
  }
}
