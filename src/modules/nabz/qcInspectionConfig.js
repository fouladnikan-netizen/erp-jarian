export const QC_VISUAL_HEALTH = [
  { id: 'black-healthy', label: 'کاملا مشکی و سالم' },
  { id: 'slight-yellow', label: 'کمی زرد ولی سالم' },
  { id: 'full-yellow', label: 'زرد کامل' },
  { id: 'rotted', label: 'پوسیده' },
];

export const QC_FINAL_STATUS = [
  { id: 'approved', label: 'تأیید', tone: 'ok' },
  { id: 'conditional', label: 'تأیید مشروط', tone: 'warn' },
  { id: 'rejected', label: 'رد', tone: 'danger' },
];

export function getQcRowKey(row) {
  return row.qcKey
    || row.warehouseVoucherCode
    || `row-${row.rowNumber}`;
}

export function getOrderQcInspections(order) {
  return order?.qcInspections && typeof order.qcInspections === 'object'
    ? order.qcInspections
    : {};
}

export function getQcInspectionForRow(order, row) {
  const key = getQcRowKey(row);
  return getOrderQcInspections(order)[key] || null;
}

export function getQcVisualLabel(id) {
  return QC_VISUAL_HEALTH.find((item) => item.id === id)?.label || '—';
}

export function getQcStatusMeta(statusId) {
  return QC_FINAL_STATUS.find((item) => item.id === statusId) || null;
}

export function saveQcInspection(order, rowKey, record) {
  return {
    ...order,
    qcInspections: {
      ...getOrderQcInspections(order),
      [rowKey]: record,
    },
  };
}

export function buildQcItemFromPurchaseRow(row) {
  return {
    id: getQcRowKey(row),
    label: row.name,
    description: row.description && row.description !== '—'
      ? `${row.name} — ${row.description}`
      : row.name,
    qty: row.qty,
    unit: row.unit || 'تن',
    supplierName: row.supplierName || '—',
  };
}

/**
 * Soft/hard gate helper: every fulfilled purchase row has a non-rejected QC record.
 */
export function isOrderQcComplete(order, purchaseRows = null) {
  const rows = purchaseRows || [];
  if (!rows.length) {
    const inspections = Object.values(getOrderQcInspections(order));
    return inspections.length > 0
      && inspections.every((item) => item?.itemStatus && item.itemStatus !== 'rejected');
  }
  return rows.every((row) => {
    const qc = getQcInspectionForRow(order, row);
    return Boolean(qc?.itemStatus) && qc.itemStatus !== 'rejected';
  });
}
