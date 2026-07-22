import { ORDER_TABS } from './config';
import { CURRENT_USER, DEFAULT_ORDER_TYPE, DEFAULT_SALE_TYPE } from './constants';
import { getTodayJalali, getNowTimeFa, parseJalaliParts } from './dateUtils';
import { buildOrderCodeDashed } from './orderCode';
import { getCustomerById } from './customers';
import { getDisplayName } from '../kanoon/columns';
import { getDefaultQuoting } from './quotingConfig';

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

  return {
    id: nextId,
    code,
    customerId,
    customer: customer ? getDisplayName(customer) : '—',
    assignee: assignee || CURRENT_USER,
    orderType: orderType || DEFAULT_ORDER_TYPE,
    saleType: saleType || DEFAULT_SALE_TYPE,
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
