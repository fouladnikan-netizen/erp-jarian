import { CURRENT_USER } from './constants';
import { ORDER_TABS, STAGE_TADAROK_ID } from './config';
import { getTodayJalali, getNowTimeFa, isValidJalaliDate } from './dateUtils';
import { parseMoneyInput } from './orderCode';
import { calculateQuotingPreview, getTargetInquiry } from './quotingService';
import { OPERATIONAL_PHASES } from './phase2Config';
import { advanceOperationalPhase, getOrderOperationalPhase } from './phase2Service';
import { getSupplierName } from './suppliers';
import {
  PAYMENT_TERM_TYPES,
  TADAROK_LINE_STATUS,
  TADAROK_LINE_STATUS_LABEL,
} from './tadarokStageConfig';

export function isTadarokStageLive(order, operationalViewPhase) {
  return order.status === ORDER_TABS.SUCCESS
    && order.stageId === STAGE_TADAROK_ID
    && getOrderOperationalPhase(order) === OPERATIONAL_PHASES.TADAROK
    && operationalViewPhase === OPERATIONAL_PHASES.TADAROK;
}

function getLineKavoshContext(order, line, preview) {
  const item = order.items?.[line.sourceItemIndex];
  const target = item ? getTargetInquiry(item) : null;
  const previewLine = preview?.lines?.[line.sourceItemIndex];
  const kavoshSupplierId = target?.supplierId || '';
  return {
    inquiryUnitPriceRial: Number(target?.unitPrice) || 0,
    kavoshSupplierId,
    kavoshSupplierName: kavoshSupplierId ? getSupplierName(kavoshSupplierId) : '',
    kavoshSupplyType: target?.supplyType || 'رسمی',
    saleUnitPriceRial: previewLine?.saleUnitPrice || 0,
  };
}

function buildInitialTadarokLines(order) {
  return (order.items || []).map((item, index) => {
    const target = getTargetInquiry(item);
    const inquiryPrice = Number(target?.unitPrice) || 0;
    return {
      id: `tl-${order.id}-${index}`,
      sourceItemIndex: index,
      splitParentId: null,
      name: item.name || '—',
      description: item.description || '',
      qty: Number(item.qty) || 0,
      unit: item.unit || 'تن',
      estimatedUnitPriceRial: Math.round(inquiryPrice),
      status: TADAROK_LINE_STATUS.PENDING,
      purchaseOrder: null,
    };
  });
}

export function getTadarokLines(order) {
  if (order.tadarokLines?.length) return order.tadarokLines;
  return buildInitialTadarokLines(order);
}

export function getTadarokProcurementRows(order) {
  const preview = calculateQuotingPreview(order);
  const lines = getTadarokLines(order);
  return lines.map((line, index) => {
    const kavosh = getLineKavoshContext(order, line, preview);
    const finalPurchasePrice = line.purchaseOrder?.agreedUnitPriceRial;
    const hasFinalPurchase = line.status === TADAROK_LINE_STATUS.PO_ISSUED
      && finalPurchasePrice != null
      && finalPurchasePrice !== '';
    const finalProfitRial = hasFinalPurchase
      ? kavosh.saleUnitPriceRial - Number(finalPurchasePrice)
      : null;
    const po = line.purchaseOrder;
    const supplyUnitPriceRial = hasFinalPurchase
      ? Number(finalPurchasePrice)
      : kavosh.inquiryUnitPriceRial;
    const supplySupplierName = hasFinalPurchase && po?.supplierId
      ? getSupplierName(po.supplierId)
      : (kavosh.kavoshSupplierName || '');

    return {
      ...line,
      ...kavosh,
      estimatedUnitPriceRial: kavosh.inquiryUnitPriceRial,
      supplyUnitPriceRial,
      supplySupplierName,
      rowNumber: index + 1,
      statusLabel: TADAROK_LINE_STATUS_LABEL[line.status] || '—',
      isSplitChild: Boolean(line.splitParentId),
      canSplit: line.status === TADAROK_LINE_STATUS.PENDING,
      canIssuePo: line.status === TADAROK_LINE_STATUS.PENDING,
      finalProfitRial,
      supplierLabel: supplySupplierName || '—',
    };
  });
}

export function getTadarokProgress(order) {
  const lines = getTadarokLines(order);
  const issued = lines.filter((line) => line.status === TADAROK_LINE_STATUS.PO_ISSUED).length;
  return { total: lines.length, issued, allIssued: lines.length > 0 && issued === lines.length };
}

export function getDefaultSupplierIdForLine(order, line) {
  const item = order.items?.[line.sourceItemIndex];
  const target = item ? getTargetInquiry(item) : null;
  return target?.supplierId || '';
}

function validatePaymentTerms(paymentTerms) {
  const type = paymentTerms?.type;
  if (!type) return 'شرایط تسویه را انتخاب کنید.';

  if (type === PAYMENT_TERM_TYPES.PREPAYMENT) {
    if (!isValidJalaliDate(paymentTerms.prepaymentDate)) return 'تاریخ پیش‌پرداخت معتبر نیست.';
    if (!parseMoneyInput(paymentTerms.prepaymentAmountRial)) return 'مبلغ پیش‌پرداخت را وارد کنید.';
  }

  if (type === PAYMENT_TERM_TYPES.ON_DELIVERY) {
    if (!isValidJalaliDate(paymentTerms.deliveryTime)) return 'تاریخ تحویل معتبر نیست.';
  }

  if (type === PAYMENT_TERM_TYPES.DEFERRED) {
    if (!isValidJalaliDate(paymentTerms.dueDate)) return 'تاریخ سررسید معتبر نیست.';
  }

  if (type === PAYMENT_TERM_TYPES.COMBINED) {
    const stages = paymentTerms.combinedStages || [];
    if (stages.length < 1) return 'حداقل یک مرحله تسویه لازم است.';
    for (let i = 0; i < stages.length; i += 1) {
      if (!isValidJalaliDate(stages[i].date)) {
        return `تاریخ مرحله ${i + 1} معتبر نیست.`;
      }
      if (!parseMoneyInput(stages[i].amountRial)) {
        return `مبلغ مرحله ${i + 1} را وارد کنید.`;
      }
    }
  }

  return '';
}

export function validatePurchaseOrderDraft(draft, line) {
  if (!draft.supplierId) return 'تامین‌کننده را انتخاب کنید.';
  if (!draft.supplyType?.trim()) return 'نوع تامین را انتخاب کنید.';
  const qty = Number(draft.purchaseQty);
  if (!qty || qty <= 0) return 'مقدار خرید معتبر نیست.';
  if (Math.abs(qty - line.qty) > 0.001) {
    return `مقدار خرید باید برابر ${line.qty} ${line.unit} باشد.`;
  }
  if (!parseMoneyInput(draft.agreedUnitPriceRial)) return 'قیمت توافقی را وارد کنید.';
  if (!draft.warehouseId) return 'انبار را انتخاب کنید.';
  return validatePaymentTerms(draft.paymentTerms);
}

export function splitTadarokLine(order, lineId, quantities) {
  const lines = [...getTadarokLines(order)];
  const line = lines.find((entry) => entry.id === lineId);
  if (!line) return { accepted: false, reason: 'سطر یافت نشد.' };
  if (line.status === TADAROK_LINE_STATUS.PO_ISSUED) {
    return { accepted: false, reason: 'برای سطر دارای سفارش خرید امکان تفکیک وجود ندارد.' };
  }

  const normalized = quantities.map((qty) => Number(qty)).filter((qty) => qty > 0);
  if (normalized.length < 2) {
    return { accepted: false, reason: 'حداقل دو زیرسطر برای تفکیک لازم است.' };
  }

  const sum = normalized.reduce((acc, qty) => acc + qty, 0);
  if (Math.abs(sum - line.qty) > 0.001) {
    return {
      accepted: false,
      reason: `مجموع مقادیر (${sum}) باید برابر ${line.qty} ${line.unit} باشد.`,
    };
  }

  const parentId = line.id;
  const lineIndex = lines.findIndex((entry) => entry.id === lineId);
  const children = normalized.map((qty, index) => ({
    ...line,
    id: `${parentId}-s${index + 1}`,
    splitParentId: parentId,
    qty,
    status: TADAROK_LINE_STATUS.PENDING,
    purchaseOrder: null,
  }));

  const nextLines = [
    ...lines.slice(0, lineIndex),
    ...children,
    ...lines.slice(lineIndex + 1),
  ];
  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;

  return {
    accepted: true,
    order: {
      ...order,
      tadarokLines: nextLines,
      events: [
        ...(order.events || []),
        {
          id: Date.now(),
          type: 'tadarok_line_split',
          at,
          by: CURRENT_USER,
          summary: `تفکیک ${line.name} به ${children.length} زیرسطر`,
        },
      ],
    },
  };
}

function normalizePurchaseOrderPayload(draft, existingPo = null) {
  return {
    ...draft,
    supplierId: Number(draft.supplierId),
    purchaseQty: Number(draft.purchaseQty),
    agreedUnitPriceRial: parseMoneyInput(draft.agreedUnitPriceRial) || 0,
    warehouseVoucherCode: (draft.warehouseVoucherCode || '').trim(),
    poNumber: existingPo?.poNumber,
    issuedAt: existingPo?.issuedAt,
    issuedBy: existingPo?.issuedBy,
  };
}

export function issuePurchaseOrder(order, lineId, draft) {
  const lines = [...getTadarokLines(order)];
  const lineIndex = lines.findIndex((entry) => entry.id === lineId);
  if (lineIndex < 0) return { accepted: false, reason: 'سطر یافت نشد.' };

  const line = lines[lineIndex];
  if (line.status === TADAROK_LINE_STATUS.PO_ISSUED) {
    return { accepted: false, reason: 'سفارش خرید این سطر قبلاً صادر شده است.' };
  }

  const validationError = validatePurchaseOrderDraft(draft, line);
  if (validationError) return { accepted: false, reason: validationError };

  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  const poNumber = `HV-${order.code.slice(-6)}-${lineIndex + 1}-${Date.now().toString().slice(-4)}`;
  const purchaseOrder = {
    ...normalizePurchaseOrderPayload(draft),
    poNumber,
    issuedAt: at,
    issuedBy: CURRENT_USER,
  };

  lines[lineIndex] = {
    ...line,
    status: TADAROK_LINE_STATUS.PO_ISSUED,
    purchaseOrder,
  };

  const supplierName = getSupplierName(purchaseOrder.supplierId);
  return {
    accepted: true,
    order: {
      ...order,
      tadarokLines: lines,
      events: [
        ...(order.events || []),
        {
          id: Date.now(),
          type: 'purchase_order_issued',
          at,
          by: CURRENT_USER,
          summary: `صدور سفارش خرید ${poNumber} — ${line.name} — ${supplierName}`,
        },
      ],
    },
  };
}

export function updatePurchaseOrder(order, lineId, draft) {
  const lines = [...getTadarokLines(order)];
  const lineIndex = lines.findIndex((entry) => entry.id === lineId);
  if (lineIndex < 0) return { accepted: false, reason: 'سطر یافت نشد.' };

  const line = lines[lineIndex];
  if (line.status !== TADAROK_LINE_STATUS.PO_ISSUED || !line.purchaseOrder) {
    return { accepted: false, reason: 'سفارش خریدی برای ویرایش یافت نشد.' };
  }

  const validationError = validatePurchaseOrderDraft(draft, line);
  if (validationError) return { accepted: false, reason: validationError };

  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  const purchaseOrder = {
    ...normalizePurchaseOrderPayload(draft, line.purchaseOrder),
    updatedAt: at,
    updatedBy: CURRENT_USER,
  };

  lines[lineIndex] = {
    ...line,
    purchaseOrder,
  };

  const supplierName = getSupplierName(purchaseOrder.supplierId);
  return {
    accepted: true,
    order: {
      ...order,
      tadarokLines: lines,
      events: [
        ...(order.events || []),
        {
          id: Date.now(),
          type: 'purchase_order_updated',
          at,
          by: CURRENT_USER,
          summary: `ویرایش سفارش خرید ${purchaseOrder.poNumber || ''} — ${line.name} — ${supplierName}`.trim(),
        },
      ],
    },
  };
}

export function completeTadarokProcurement(order) {
  const progress = getTadarokProgress(order);
  if (!progress.allIssued) {
    return {
      accepted: false,
      reason: 'برای تکمیل تدارک، سفارش خرید همه سطرها باید صادر شود.',
    };
  }
  return advanceOperationalPhase(order, OPERATIONAL_PHASES.TAJHIZ);
}
