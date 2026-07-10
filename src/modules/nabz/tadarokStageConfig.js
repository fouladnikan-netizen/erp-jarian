export const TADAROK_LINE_STATUS = {
  PENDING: 'pending',
  PO_ISSUED: 'po_issued',
};

export const TADAROK_LINE_STATUS_LABEL = {
  [TADAROK_LINE_STATUS.PENDING]: 'در انتظار حواله',
  [TADAROK_LINE_STATUS.PO_ISSUED]: 'حواله صادر شد',
};

export const PAYMENT_TERM_TYPES = {
  PREPAYMENT: 'پیش‌پرداخت',
  ON_DELIVERY: 'تسویه هنگام تحویل',
  DEFERRED: 'تسویه مدت‌دار',
  COMBINED: 'ترکیبی',
};

export const PAYMENT_TERM_OPTIONS = [
  { value: PAYMENT_TERM_TYPES.PREPAYMENT, label: PAYMENT_TERM_TYPES.PREPAYMENT },
  { value: PAYMENT_TERM_TYPES.ON_DELIVERY, label: PAYMENT_TERM_TYPES.ON_DELIVERY },
  { value: PAYMENT_TERM_TYPES.DEFERRED, label: PAYMENT_TERM_TYPES.DEFERRED },
  { value: PAYMENT_TERM_TYPES.COMBINED, label: PAYMENT_TERM_TYPES.COMBINED },
];

export function getEmptyPaymentTerms() {
  return {
    type: PAYMENT_TERM_TYPES.PREPAYMENT,
    prepaymentDate: '',
    prepaymentAmountRial: '',
    deliveryTime: '',
    dueDate: '',
    combinedStages: [{ date: '', amountRial: '' }],
  };
}

export function getEmptyPurchaseOrderDraft(line) {
  return {
    supplierId: '',
    supplyType: 'رسمی',
    purchaseQty: line?.qty != null ? String(line.qty) : '',
    agreedUnitPriceRial: line?.estimatedUnitPriceRial ?? '',
    warehouseVoucherCode: '',
    warehouseId: '',
    warehouseAddress: '',
    importantNotes: '',
    discrepancyNotes: '',
    paymentTerms: getEmptyPaymentTerms(),
  };
}

export function getPurchaseOrderDraftFromLine(line) {
  const po = line?.purchaseOrder;
  if (!po) return getEmptyPurchaseOrderDraft(line);

  const paymentTerms = {
    ...getEmptyPaymentTerms(),
    ...(po.paymentTerms || {}),
    combinedStages: po.paymentTerms?.combinedStages?.length
      ? po.paymentTerms.combinedStages.map((stage) => ({
        date: stage.date || '',
        amountRial: stage.amountRial != null ? String(stage.amountRial) : '',
      }))
      : [{ date: '', amountRial: '' }],
  };

  return {
    supplierId: po.supplierId != null ? String(po.supplierId) : '',
    supplyType: po.supplyType || 'رسمی',
    purchaseQty: po.purchaseQty != null ? String(po.purchaseQty) : (line?.qty != null ? String(line.qty) : ''),
    agreedUnitPriceRial: po.agreedUnitPriceRial != null
      ? String(po.agreedUnitPriceRial)
      : (line?.estimatedUnitPriceRial ?? ''),
    warehouseVoucherCode: po.warehouseVoucherCode || '',
    warehouseId: po.warehouseId || '',
    warehouseAddress: po.warehouseAddress || '',
    importantNotes: po.importantNotes || '',
    discrepancyNotes: po.discrepancyNotes || '',
    paymentTerms,
  };
}
