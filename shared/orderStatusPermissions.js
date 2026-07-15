export const EMPLOYEE_EDITABLE_STATUSES = ['在修中', '已完工', '待结算'];

export function canEmployeeSetOrderStatus(status) {
  return EMPLOYEE_EDITABLE_STATUSES.includes(status);
}
