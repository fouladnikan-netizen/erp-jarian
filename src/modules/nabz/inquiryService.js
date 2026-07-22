import { CURRENT_USER } from './constants';
import { getStageLabel, STAGE_MOZENE_ID, STAGE_PISHKESH_ID } from './config';
import { getTodayJalali, getNowTimeFa } from './dateUtils';
import {
  isDiscrepancySupplyType,
  INQUIRY_STATUS,
  ITEM_INQUIRY_STATUS,
} from './inquiryConfig';
import { canEditInquiryPrices } from './orderEditPermissions';
import { getSupplierName } from './suppliers';
import { formatAmountRial, parseMoneyInput } from './orderCode';
import {
  ensureTargetOnAppend,
  applyQuotingToOrder,
  calculateQuotingPreview,
  canCompleteOrderInquiries,
  canCompleteQuoting,
} from './quotingService';

export {
  allLinesHaveSavedMargin,
  canCompleteQuoting,
  calculateQuotingPreview,
  getMissingTargetMessage,
  getOrderQuoting,
  getTargetInquiry,
  hasQuotingBlockers,
  saveItemMargin,
  setTargetInquiryOnOrder,
  updateOrderQuoting,
  canCompleteOrderInquiries,
} from './quotingService';

let inquiryIdCounter = 100;
let eventIdCounter = 1;

export function getEmptyInquiryDraft() {
  return {
    supplyType: 'رسمی',
    supplierId: '',
    unitPrice: '',
    notes: '',
    discrepancyDescription: '',
    discrepancyWeight: '',
    discrepancyUnitPrice: '',
  };
}

export function getEmptyQuickInquiryDraft() {
  return {
    supplyType: 'رسمی',
    supplierId: '',
    unitPrice: '',
    notes: '',
    discrepancyDescription: '',
    discrepancyWeight: '',
    discrepancyUnitPrice: '',
  };
}

export function countOrderLineItems(order) {
  return (order.items || []).length;
}

export function validateQuickInquiryDraft(draft) {
  if (!draft.supplierId) {
    return { valid: false, reason: 'تامین‌کننده را انتخاب کنید.' };
  }
  if (!draft.unitPrice && draft.unitPrice !== 0) {
    return { valid: false, reason: 'فی را وارد کنید.' };
  }
  return { valid: true, reason: '' };
}

export function validateInquiryDraft(draft) {
  if (!draft.supplierId) {
    return { valid: false, reason: 'تامین‌کننده را انتخاب کنید.' };
  }
  if (!draft.unitPrice && draft.unitPrice !== 0) {
    return { valid: false, reason: 'فی را وارد کنید.' };
  }
  if (isDiscrepancySupplyType(draft.supplyType)) {
    if (!draft.discrepancyDescription?.trim()) {
      return { valid: false, reason: 'شرح مغایرت الزامی است.' };
    }
    if (!draft.discrepancyWeight && draft.discrepancyWeight !== 0) {
      return { valid: false, reason: 'وزن مغایر را وارد کنید.' };
    }
    if (!draft.discrepancyUnitPrice && draft.discrepancyUnitPrice !== 0) {
      return { valid: false, reason: 'فی مغایر را وارد کنید.' };
    }
  }
  return { valid: true, reason: '' };
}

export function buildInquiryFromDraft(
  draft,
  registeredBy = CURRENT_USER,
  status = INQUIRY_STATUS.DRAFT,
) {
  const base = {
    id: inquiryIdCounter++,
    supplyType: draft.supplyType,
    supplierId: Number(draft.supplierId),
    unitPrice: parseMoneyInput(draft.unitPrice) || 0,
    notes: (draft.notes || '').trim(),
    status,
    registeredAt: `${getTodayJalali()} · ${getNowTimeFa()}`,
    registeredBy,
  };

  if (isDiscrepancySupplyType(draft.supplyType)) {
    const discrepancyDescription = (draft.discrepancyDescription ?? '').trim();
    const discrepancyWeight = draft.discrepancyWeight;
    const discrepancyUnitPrice = draft.discrepancyUnitPrice;
    const inquiry = { ...base };

    if (discrepancyDescription) {
      inquiry.discrepancyDescription = discrepancyDescription;
    }
    if (discrepancyWeight !== '' && discrepancyWeight != null) {
      inquiry.discrepancyWeight = Number(discrepancyWeight);
    }
    if (discrepancyUnitPrice !== '' && discrepancyUnitPrice != null) {
      inquiry.discrepancyUnitPrice = parseMoneyInput(discrepancyUnitPrice) || 0;
    }

    return inquiry;
  }

  return base;
}

export function inquiryToQuickDraft(inquiry) {
  return {
    supplyType: inquiry.supplyType,
    supplierId: inquiry.supplierId,
    unitPrice: inquiry.unitPrice,
    notes: inquiry.notes || '',
    discrepancyDescription: inquiry.discrepancyDescription || '',
    discrepancyWeight: inquiry.discrepancyWeight ?? '',
    discrepancyUnitPrice: inquiry.discrepancyUnitPrice ?? '',
  };
}

function applyDraftToInquiry(inquiry, draft) {
  const updated = {
    ...inquiry,
    supplyType: draft.supplyType,
    supplierId: Number(draft.supplierId),
    unitPrice: parseMoneyInput(draft.unitPrice) || 0,
    notes: (draft.notes || '').trim(),
  };

  if (isDiscrepancySupplyType(draft.supplyType)) {
    const discrepancyDescription = (draft.discrepancyDescription ?? '').trim();
    const discrepancyWeight = draft.discrepancyWeight;
    const discrepancyUnitPrice = draft.discrepancyUnitPrice;

    if (discrepancyDescription) {
      updated.discrepancyDescription = discrepancyDescription;
    } else {
      delete updated.discrepancyDescription;
    }
    if (discrepancyWeight !== '' && discrepancyWeight != null) {
      updated.discrepancyWeight = Number(discrepancyWeight);
    } else {
      delete updated.discrepancyWeight;
    }
    if (discrepancyUnitPrice !== '' && discrepancyUnitPrice != null) {
      updated.discrepancyUnitPrice = parseMoneyInput(discrepancyUnitPrice) || 0;
    } else {
      delete updated.discrepancyUnitPrice;
    }
  } else {
    delete updated.discrepancyDescription;
    delete updated.discrepancyWeight;
    delete updated.discrepancyUnitPrice;
  }

  return updated;
}

export function updateInquiryOnOrder(order, itemIndex, inquiryId, draft) {
  if (!canEditInquiryPrices()) return order;
  const items = (order.items || []).map((item, idx) => {
    if (idx !== itemIndex) return item;
    return {
      ...item,
      inquiries: (item.inquiries || []).map((inq) => (
        inq.id === inquiryId ? applyDraftToInquiry(inq, draft) : inq
      )),
    };
  });

  return {
    ...order,
    items,
  };
}

export function formatInquirySummary(inquiry, itemName) {
  const supplier = getSupplierName(inquiry.supplierId);
  const statusLabel = inquiry.status === INQUIRY_STATUS.FINALIZED ? 'تکمیل‌شده' : 'پیش‌نویس';
  let text = `استعلام ${statusLabel} — ${inquiry.supplyType} — ${supplier} — ${itemName} — فی ${formatAmountRial(inquiry.unitPrice)} ریال`;
  if (inquiry.discrepancyDescription) {
    text += ` — مغایرت: ${inquiry.discrepancyDescription}`;
  }
  return text;
}

export function buildInquiryEvent(order, itemIndex, inquiry) {
  const item = order.items[itemIndex];
  return {
    id: eventIdCounter++,
    type: 'inquiry_registered',
    at: inquiry.registeredAt,
    by: inquiry.registeredBy,
    itemIndex,
    itemName: item?.name || '—',
    inquiryId: inquiry.id,
    supplyType: inquiry.supplyType,
    supplierName: getSupplierName(inquiry.supplierId),
    unitPrice: inquiry.unitPrice,
    notes: inquiry.notes,
    discrepancyDescription: inquiry.discrepancyDescription || null,
    discrepancyWeight: inquiry.discrepancyWeight ?? null,
    discrepancyUnitPrice: inquiry.discrepancyUnitPrice ?? null,
    summary: formatInquirySummary(inquiry, item?.name || '—'),
  };
}

export function appendInquiryToOrder(
  order,
  itemIndex,
  draft,
  registeredBy = CURRENT_USER,
  status = INQUIRY_STATUS.DRAFT,
) {
  if (!canEditInquiryPrices()) return order;
  const inquiry = buildInquiryFromDraft(draft, registeredBy, status);
  const event = buildInquiryEvent(order, itemIndex, inquiry);
  const items = (order.items || []).map((item, idx) => {
    if (idx !== itemIndex) return item;
    return {
      ...item,
      inquiries: [...(item.inquiries || []), inquiry],
    };
  });

  return ensureTargetOnAppend({
    ...order,
    items,
    events: [...(order.events || []), event],
  }, itemIndex, inquiry.id);
}

export function finalizeItemInquiries(order, itemIndex) {
  const item = order.items[itemIndex];
  const event = {
    id: eventIdCounter++,
    type: 'inquiry_item_finalized',
    at: `${getTodayJalali()} · ${getNowTimeFa()}`,
    by: CURRENT_USER,
    itemIndex,
    itemName: item?.name || '—',
    summary: `تکمیل استعلام — ${item?.name || '—'} — آماده برای مرحله بعدی`,
  };

  const items = (order.items || []).map((row, idx) => {
    if (idx !== itemIndex) return row;
    return {
      ...row,
      inquiryStatus: 'ready',
      inquiries: (row.inquiries || []).map((inq) => ({
        ...inq,
        status: INQUIRY_STATUS.FINALIZED,
      })),
    };
  });

  return {
    ...order,
    items,
    events: [...(order.events || []), event],
  };
}

export function finalizeSingleInquiry(order, itemIndex, inquiryId) {
  const item = order.items[itemIndex];
  const inquiry = (item?.inquiries || []).find((inq) => inq.id === inquiryId);
  if (!inquiry || inquiry.status === INQUIRY_STATUS.FINALIZED) return order;

  const event = {
    id: eventIdCounter++,
    type: 'inquiry_finalized',
    at: `${getTodayJalali()} · ${getNowTimeFa()}`,
    by: CURRENT_USER,
    itemIndex,
    itemName: item?.name || '—',
    inquiryId,
    summary: `تکمیل استعلام — ${item?.name || '—'} — ${inquiry.supplyType}`,
  };

  const items = (order.items || []).map((row, idx) => {
    if (idx !== itemIndex) return row;
    return {
      ...row,
      inquiries: (row.inquiries || []).map((inq) => (
        inq.id === inquiryId ? { ...inq, status: INQUIRY_STATUS.FINALIZED } : inq
      )),
    };
  });

  return {
    ...order,
    items,
    events: [...(order.events || []), event],
  };
}

export function completeOrderInquiries(order) {
  if (!canCompleteOrderInquiries(order)) {
    return order;
  }

  const pricedOrder = applyQuotingToOrder(order);
  const fromStageId = pricedOrder.stageId || 1;
  const nextStageId = STAGE_MOZENE_ID;

  const items = (pricedOrder.items || []).map((item) => ({
    ...item,
    inquiryStatus: ITEM_INQUIRY_STATUS.READY,
    inquiries: (item.inquiries || []).map((inq) => ({
      ...inq,
      status: INQUIRY_STATUS.FINALIZED,
    })),
  }));

  const preview = calculateQuotingPreview({ ...pricedOrder, items });
  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  const fromLabel = getStageLabel(fromStageId);
  const toLabel = getStageLabel(nextStageId);

  const event = {
    id: eventIdCounter++,
    type: 'inquiry_order_completed',
    at,
    by: CURRENT_USER,
    fromStageId,
    toStageId: nextStageId,
    fromStageLabel: fromLabel,
    toStageLabel: toLabel,
    orderTotalRial: preview.orderTotal,
    summary: `تکمیل کاوش سفارش ${pricedOrder.code} — انتقال به «${toLabel}»`,
  };

  return {
    ...pricedOrder,
    items,
    stageId: nextStageId,
    inquiryCompletedAt: at,
    amountRial: preview.orderTotal > 0 ? Math.round(preview.orderTotal) : pricedOrder.amountRial,
    isPriced: preview.orderTotal > 0,
    events: [...(pricedOrder.events || []), event],
  };
}

export function completeOrderQuoting(order) {
  if (!canCompleteQuoting(order)) {
    return order;
  }

  const pricedOrder = applyQuotingToOrder(order);
  const fromStageId = pricedOrder.stageId || STAGE_MOZENE_ID;
  const nextStageId = STAGE_PISHKESH_ID;
  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  const fromLabel = getStageLabel(fromStageId);
  const toLabel = getStageLabel(nextStageId);
  const preview = calculateQuotingPreview(pricedOrder);

  const event = {
    id: eventIdCounter++,
    type: 'quoting_completed',
    at,
    by: CURRENT_USER,
    fromStageId,
    toStageId: nextStageId,
    fromStageLabel: fromLabel,
    toStageLabel: toLabel,
    orderTotalRial: preview.orderTotal,
    summary: `تکمیل مظنه سفارش ${pricedOrder.code} — انتقال به «${toLabel}»`,
  };

  return {
    ...pricedOrder,
    stageId: nextStageId,
    amountRial: preview.orderTotal > 0 ? Math.round(preview.orderTotal) : pricedOrder.amountRial,
    isPriced: preview.orderTotal > 0,
    events: [...(pricedOrder.events || []), event],
  };
}
