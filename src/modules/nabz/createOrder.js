import { ORDER_TABS } from './config';
import { CURRENT_USER, DEFAULT_ORDER_TYPE, DEFAULT_SALE_TYPE, SALES_TYPES } from './constants';
import { getTodayJalali, getNowTimeFa, parseJalaliParts } from './dateUtils';
import { buildOrderCodeDashed } from './orderCode';
import { getCustomerById } from './customers';
import { getDisplayName } from '../kanoon/columns';
import { getDefaultQuoting } from './quotingConfig';
import {
  getSensitiveItemFieldChanges,
  updateGatewayOrderItemWithSensitivity,
} from './gatewayService';
import { isMozeneStage } from './orderStageService';

function resolveIsOfficialFromSaleType(saleType) {
  const type = saleType || DEFAULT_SALE_TYPE;
  return type === SALES_TYPES[0] || type === 'رسمی';
}

let lineIdCounter = 1;

export function createLineItemFromProduct(product) {
  return {
    lineId: lineIdCounter++,
    productId: product.id,
    name: product.title,
    description: product.description || '',
    size: product.specs?.size || product.specs?.thickness || '',
    preferredMill: product.specs?.preferredMill || '',
    qty: 1,
    unitPriceRial: null,
    weight: product.specs?.unitWeight || '',
    unit: product.unit,
  };
}

export function createLineItemsFromSelections(selections) {
  const lines = [];
  selections.forEach(({ product, repeat }) => {
    const count = Math.max(1, Number(repeat) || 1);
    for (let i = 0; i < count; i += 1) {
      lines.push(createLineItemFromProduct(product));
    }
  });
  return lines;
}

export function validateCreateOrder({ customerId, lineItems }) {
  if (!customerId) {
    return { valid: false, reason: 'مشتری را انتخاب کنید.' };
  }
  if (!lineItems.length) {
    return { valid: false, reason: 'حداقل یک کالا به سبد اضافه کنید.' };
  }
  if (lineItems.some((item) => !item.qty || item.qty <= 0)) {
    return { valid: false, reason: 'تعداد هر کالا باید بیشتر از صفر باشد.' };
  }
  return { valid: true, reason: '' };
}

export function buildNewOrder({
  orders, customerId, assignee, lineItems, orderType, saleType, generalNotes,
  requesterName, requesterMobile,
}) {
  const customer = getCustomerById(customerId);
  const registeredDate = getTodayJalali();
  const registeredTime = getNowTimeFa();
  const { yy, mm, dd } = parseJalaliParts(registeredDate);
  const code = buildOrderCodeDashed(orders, { yy, mm, dd });
  const itemCount = lineItems.length;
  const nextId = orders.reduce((max, o) => Math.max(max, o.id), 0) + 1;

  const resolvedSaleType = saleType || DEFAULT_SALE_TYPE;

  return {
    id: nextId,
    code,
    customerId,
    customer: customer ? getDisplayName(customer) : '—',
    assignee: assignee || CURRENT_USER,
    orderType: orderType || DEFAULT_ORDER_TYPE,
    saleType: resolvedSaleType,
    isOfficial: resolveIsOfficialFromSaleType(resolvedSaleType),
    generalNotes: (generalNotes || '').trim(),
    requesterName: (requesterName || '').trim() || undefined,
    requesterMobile: (requesterMobile || '').trim() || undefined,
    itemCount,
    amountRial: null,
    isPriced: false,
    stageId: 1,
    inquiryCompletedAt: null,
    status: ORDER_TABS.CURRENT,
    registeredDate,
    registeredTime,
    items: lineItems.map(({
      productId, name, description, size, preferredMill, qty, weight, unit,
    }) => ({
      productId,
      name,
      description,
      size: size || '',
      preferredMill: preferredMill || '',
      qty: Number(qty),
      unitPriceRial: null,
      weight,
      unit,
    })),
    quoting: getDefaultQuoting(),
    events: [],
  };
}

/** پیش‌نویس ویرایش از سفارش موجود (حفظ استعلام‌ها روی sourceIndex) */
export function orderToEditDraft(order) {
  const lineItems = (order.items || []).map((item, index) => ({
    lineId: item.lineId || `ord-${order.id}-line-${index}`,
    sourceIndex: index,
    productId: item.productId,
    name: item.name || '',
    description: item.description || '',
    size: item.size || '',
    preferredMill: item.preferredMill || '',
    qty: item.qty ?? 1,
    unitPriceRial: item.unitPriceRial ?? null,
    weight: item.weight || '',
    unit: item.unit || '',
  }));

  return {
    customerId: order.customerId ?? null,
    saleType: order.saleType || DEFAULT_SALE_TYPE,
    orderType: order.orderType || DEFAULT_ORDER_TYPE,
    generalNotes: order.generalNotes || '',
    requesterName: order.requesterName || '',
    requesterMobile: order.requesterMobile || '',
    lineItems,
  };
}

function draftLineToItemFields(line) {
  return {
    productId: line.productId,
    name: line.name,
    description: line.description || '',
    size: line.size || '',
    preferredMill: line.preferredMill || '',
    qty: Number(line.qty),
    unitPriceRial: line.unitPriceRial ?? null,
    weight: line.weight || '',
    unit: line.unit || '',
  };
}

export function orderEditNeedsInquiryWipe(order, lineItems) {
  if (!isMozeneStage(order)) return false;
  return (lineItems || []).some((line) => {
    if (line.sourceIndex == null) return false;
    const original = order.items?.[line.sourceIndex];
    if (!original || !(original.inquiries || []).length) return false;
    const patch = draftLineToItemFields(line);
    return getSensitiveItemFieldChanges(original, patch).length > 0;
  });
}

/**
 * اعمال ویرایش کلی سفارش توسط شوالیه.
 * مشتری/نوع فروش/توضیحات و اقلام به‌روز می‌شوند؛ استعلام‌ها حفظ می‌شوند مگر پاکسازی حساس مظنه.
 */
export function applyOrderEdit(order, {
  customerId,
  lineItems,
  orderType,
  saleType,
  generalNotes,
  requesterName,
  requesterMobile,
}, { wipeConfirmed = false } = {}) {
  const customer = getCustomerById(customerId);
  const previousItems = order.items || [];

  if (orderEditNeedsInquiryWipe(order, lineItems) && !wipeConfirmed) {
    return { ok: false, needsWipeConfirm: true, order };
  }

  let next = {
    ...order,
    customerId,
    customer: customer ? getDisplayName(customer) : order.customer,
    orderType: orderType || order.orderType || DEFAULT_ORDER_TYPE,
    saleType: saleType || order.saleType || DEFAULT_SALE_TYPE,
    isOfficial: resolveIsOfficialFromSaleType(saleType || order.saleType || DEFAULT_SALE_TYPE),
    generalNotes: (generalNotes || '').trim(),
    requesterName: (requesterName || '').trim() || undefined,
    requesterMobile: (requesterMobile || '').trim() || undefined,
    itemCount: lineItems.length,
  };

  const rebuilt = [];
  lineItems.forEach((line) => {
    const fields = draftLineToItemFields(line);
    if (line.sourceIndex == null || !previousItems[line.sourceIndex]) {
      rebuilt.push({ ...fields, inquiries: [] });
      return;
    }
    const original = previousItems[line.sourceIndex];
    rebuilt.push({
      ...original,
      ...fields,
      inquiries: original.inquiries || [],
      targetInquiryId: original.targetInquiryId,
    });
  });

  next = { ...next, items: rebuilt };

  rebuilt.forEach((_, index) => {
    const line = lineItems[index];
    if (line?.sourceIndex == null) return;
    const original = previousItems[line.sourceIndex];
    if (!original) return;
    const patch = draftLineToItemFields(line);
    const changed = getSensitiveItemFieldChanges(original, patch);
    if (!changed.length || !(original.inquiries || []).length) return;
    if (!isMozeneStage(order)) return;
    next = updateGatewayOrderItemWithSensitivity(next, index, patch, {
      wipeConfirmed: true,
      forceWipe: true,
      changedFields: changed,
    });
  });

  return { ok: true, needsWipeConfirm: false, order: next };
}
