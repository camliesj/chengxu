export const EMPLOYEE_EDITABLE_STATUSES = ['在修中', '已完工', '待结算'];

const FORWARD_TRANSITIONS = new Set(['在修中->已完工', '已完工->待结算']);
const ADMINISTRATOR_BACKWARD_TRANSITIONS = new Set(['已完工->在修中', '待结算->已完工']);

export function canEmployeeSetOrderStatus(status) {
  return EMPLOYEE_EDITABLE_STATUSES.includes(status);
}

export function canTransitionOrderStatus(role, from, to) {
  const key = `${String(from || '').trim()}->${String(to || '').trim()}`;
  return FORWARD_TRANSITIONS.has(key)
    || (role === 'admin' && ADMINISTRATOR_BACKWARD_TRANSITIONS.has(key));
}
