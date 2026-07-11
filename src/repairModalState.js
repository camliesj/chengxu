export function closedRepairModalState() {
  return { kind: 'closed', orderId: '' };
}

export function openRepairModal(kind, orderId = '') {
  return { kind, orderId };
}
