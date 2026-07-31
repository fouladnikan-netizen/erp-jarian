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

/** چیپ‌های نمایشی ستون وضعیت کیفی — الگوی واحد جداول عملیاتی */
export const QC_CHIP_STATES = {
  pending: {
    id: 'pending',
    label: 'در انتظار',
    tone: 'pending',
  },
  approved: {
    id: 'approved',
    label: 'تایید شده',
    tone: 'approved',
  },
  conditional: {
    id: 'conditional',
    label: 'تایید مشروط',
    tone: 'pending',
  },
  rejected: {
    id: 'rejected',
    label: 'رد شده',
    tone: 'rejected',
  },
};

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
  const inspections = getOrderQcInspections(order);
  const primary = getQcRowKey(row);
  if (inspections[primary]) return inspections[primary];
  // سازگاری با کلیدهای قدیمی/جایگزین (shippingRowKey یا حواله انبار)
  if (row?.shippingRowKey && inspections[row.shippingRowKey]) {
    return inspections[row.shippingRowKey];
  }
  if (
    row?.warehouseVoucherCode
    && row.warehouseVoucherCode !== '—'
    && inspections[row.warehouseVoucherCode]
  ) {
    return inspections[row.warehouseVoucherCode];
  }
  return null;
}

export function getQcInspectionByKey(order, rowKey) {
  if (!rowKey) return null;
  return getOrderQcInspections(order)[rowKey] || null;
}

export function getQcVisualLabel(id) {
  return QC_VISUAL_HEALTH.find((item) => item.id === id)?.label || '—';
}

export function getQcStatusMeta(statusId) {
  return QC_FINAL_STATUS.find((item) => item.id === statusId) || null;
}

/**
 * وضعیت نمایشی چیپ QC از روی رکورد بازرسی
 * @returns {{ id: string, label: string, tone: 'pending'|'approved'|'rejected' }}
 */
export function resolveQcChipState(record) {
  const status = record?.itemStatus;
  if (!status) return QC_CHIP_STATES.pending;
  if (status === 'approved') return QC_CHIP_STATES.approved;
  if (status === 'conditional') return QC_CHIP_STATES.conditional;
  if (status === 'rejected') return QC_CHIP_STATES.rejected;
  return QC_CHIP_STATES.pending;
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
