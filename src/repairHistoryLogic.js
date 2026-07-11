export const SETTLED_STATUS = '已结算';

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function includesText(value, keyword) {
  const normalizedKeyword = normalizeText(keyword);
  return !normalizedKeyword || normalizeText(value).includes(normalizedKeyword);
}

export function isReceptionOrder(order) {
  return order?.status !== SETTLED_STATUS;
}

export function isHistoryOrder(order) {
  return order?.status === SETTLED_STATUS;
}

export function filterHistoryOrders(orders, filters) {
  return orders.filter((order) => {
    const settledAt = String(order.settlementDate || '');
    return isHistoryOrder(order)
      && (!filters.startDate || settledAt >= filters.startDate)
      && (!filters.endDate || settledAt <= filters.endDate)
      && includesText(order.plate, filters.plate)
      && includesText(order.customer, filters.customer)
      && includesText(order.phone, filters.phone)
      && (!filters.insurer || order.insurer === filters.insurer)
      && (!filters.type || order.type === filters.type)
      && (!filters.staff || order.staff === filters.staff);
  });
}

export function paginateRows(rows, requestedPage, pageSize) {
  const safePageSize = Math.max(1, Number(pageSize) || 20);
  const pageCount = Math.max(1, Math.ceil(rows.length / safePageSize));
  const page = Math.min(Math.max(1, Number(requestedPage) || 1), pageCount);
  const start = (page - 1) * safePageSize;
  return { rows: rows.slice(start, start + safePageSize), page, pageCount };
}
