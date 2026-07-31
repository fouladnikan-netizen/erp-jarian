import { getDefaultQuoting, MARGIN_MODES } from './quotingConfig';
import { DEFAULT_SALE_TYPE, SALES_TYPES } from './constants';
import { parseMoneyInput } from './orderCode';
import { canEditProfitMargin } from './orderEditPermissions';

function parseNumber(value) {
  if (value === '' || value == null) return null;
  const fromMoney = parseMoneyInput(value);
  if (fromMoney != null) return fromMoney;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function roundRial(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

function isOfficialSaleType(saleType) {
  return saleType === SALES_TYPES[0] || saleType === 'رسمی';
}

/** Canonical Official flag — prefers `order.isOfficial`, else derives from `saleType`. */
export function resolveOrderIsOfficial(order) {
  if (typeof order?.isOfficial === 'boolean') return order.isOfficial;
  return isOfficialSaleType(order?.saleType || DEFAULT_SALE_TYPE);
}

const VAT_MULTIPLIER = 1.1;
const VAT_RATE = 0.1;

export function getOrderQuoting(order) {
  return { ...getDefaultQuoting(), ...(order.quoting || {}) };
}

export function getTargetInquiry(item) {
  const inquiries = item.inquiries || [];
  if (item?.targetInquiryId) {
    return inquiries.find((inq) => inq.id === item.targetInquiryId) || null;
  }
  if (inquiries.length === 1) return inquiries[0];
  return null;
}

export function getItemsMissingTarget(order) {
  return (order.items || [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      const inquiries = item.inquiries || [];
      if (inquiries.length <= 1) return false;
      return !item.targetInquiryId
        || !inquiries.some((inq) => inq.id === item.targetInquiryId);
    });
}

export function getMissingTargetItemNames(order) {
  return getItemsMissingTarget(order).map(({ item }) => item.name || '—');
}

export function getMissingTargetMessage(order) {
  const names = getMissingTargetItemNames(order);
  if (!names.length) return '';
  return `برای سطرهای (${names.join('، ')})، استعلام هدف انتخاب نشده است. لطفاً ابتدا استعلام موردنظر را انتخاب کنید.`;
}

export function hasQuotingBlockers(order) {
  return getItemsMissingTarget(order).length > 0;
}

function getTargetUnitPrice(item) {
  const target = getTargetInquiry(item);
  return target ? toNumber(target.unitPrice) : 0;
}

function getLineMarginInputValue(quoting, index, unitProfit) {
  if (quoting.marginMode === MARGIN_MODES.ORDER_FIXED_PERCENT
    || quoting.marginMode === MARGIN_MODES.ORDER_FIXED_RIAL) {
    const orderMargin = parseNumber(quoting.orderMarginValue);
    return orderMargin == null ? '' : `${orderMargin}`;
  }

  const raw = parseNumber(quoting.lineMargins?.[index]);
  return raw == null ? '' : `${raw}`;
}

/** حاشیه سود واحد هر سطر (profit) */
function computeRowUnitProfit(quoting, index, quotePrice) {
  const orderMargin = parseNumber(quoting.orderMarginValue);
  const qPrice = toNumber(quotePrice);

  if (quoting.marginMode === MARGIN_MODES.ORDER_FIXED_RIAL && orderMargin != null) {
    return toNumber(orderMargin);
  }

  if (quoting.marginMode === MARGIN_MODES.ORDER_FIXED_PERCENT && orderMargin != null) {
    return qPrice * (toNumber(orderMargin) / 100);
  }

  if (quoting.marginMode === MARGIN_MODES.LINE_FIXED_RIAL) {
    const raw = parseNumber(quoting.lineMargins?.[index]);
    return raw == null ? 0 : toNumber(raw);
  }

  if (quoting.marginMode === MARGIN_MODES.LINE_FIXED_PERCENT) {
    const raw = parseNumber(quoting.lineMargins?.[index]);
    return raw == null ? 0 : qPrice * (toNumber(raw) / 100);
  }

  return 0;
}

/** محاسبه سطح سطر طبق شبه‌کد رسمی/غیررسمی */
function calculateRowPricing({ quotePrice, profit, qty, saleType }) {
  const qPrice = toNumber(quotePrice);
  const unitProfit = toNumber(profit);
  const q = toNumber(qty);

  // BasePrice (قبل از مالیات): مبنای Visual Math برای هر دو حالت نمایش
  const rawBasePrice = isOfficialSaleType(saleType)
    ? (qPrice + unitProfit) / VAT_MULTIPLIER
    : qPrice + unitProfit;
  const basePrice = Math.round(rawBasePrice);

  return {
    basePrice,
    lineProfitRial: Math.round(unitProfit * q),
    unitMarginRial: unitProfit,
  };
}

/**
 * Visual Math — جمع آنچه در جدول دیده می‌شود باید دقیقاً با جمع کل یکی باشد.
 *
 * Inclusive (روشن): unit = round(base×1.1)، row = round(qty×unit)، grand = Σ rows
 * Exclusive (خاموش): unit = round(base)، row = round(qty×unit)،
 *   subtotal = Σ rows، tax = round(subtotal×0.1)، grand = subtotal + tax
 */
export function calculateQuotingPreview(order, options = {}) {
  const quoting = getOrderQuoting(order);
  const items = order.items || [];
  const saleType = order.saleType || DEFAULT_SALE_TYPE;
  const isOfficial = resolveOrderIsOfficial(order);
  // Official exclusive mode only; unofficial always rolls 10% VAT into unit price.
  const vatInclusive = options.forceVatExclusive
    ? false
    : Boolean(quoting.vatInclusive) && isOfficial;
  const rollVatIntoUnit = !isOfficial || vatInclusive;

  const lines = items.map((item, index) => {
    const target = getTargetInquiry(item);
    const quotePrice = target ? toNumber(target.unitPrice) : 0;
    const qty = toNumber(item.qty);
    const unitProfit = computeRowUnitProfit(quoting, index, quotePrice);
    const pricing = calculateRowPricing({
      quotePrice,
      profit: unitProfit,
      qty,
      saleType: isOfficial ? SALES_TYPES[0] : (saleType || 'غیر رسمی'),
    });

    const saleUnitPrice = rollVatIntoUnit
      ? Math.round(pricing.basePrice * VAT_MULTIPLIER)
      : pricing.basePrice;
    const lineTotal = Math.round(qty * saleUnitPrice);

    return {
      itemIndex: index,
      name: item.name,
      qty,
      targetUnitPrice: quotePrice,
      baseTotal: Math.round(quotePrice * qty),
      marginInputValue: getLineMarginInputValue(quoting, index, unitProfit),
      marginTotalRial: pricing.lineProfitRial,
      unitMarginRial: pricing.unitMarginRial,
      lineProfitRial: pricing.lineProfitRial,
      saleUnitPrice,
      lineSubtotal: lineTotal,
      lineTotal,
      hasTarget: Boolean(target),
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + toNumber(line.lineTotal), 0);
  const totalProfit = lines.reduce((sum, line) => sum + toNumber(line.lineProfitRial), 0);
  const showVatBreakdown = isOfficial && !vatInclusive;
  const vatAmount = showVatBreakdown ? Math.round(subtotal * VAT_RATE) : 0;
  const orderTotal = subtotal + vatAmount;
  const baseTotal = lines.reduce((sum, line) => sum + toNumber(line.baseTotal), 0);

  return {
    lines,
    baseTotal,
    subtotal,
    totalProfit,
    vatAmount,
    orderTotal,
    marginMode: quoting.marginMode,
    saleType,
    isOfficial,
    vatInclusive,
    showVatBreakdown,
  };
}

export function applyQuotingToOrder(order) {
  const preview = calculateQuotingPreview(order);
  const items = (order.items || []).map((item, index) => {
    const line = preview.lines[index];
    return {
      ...item,
      quoteBaseTotalRial: roundRial(line.baseTotal),
      quoteMarginRial: roundRial(line.marginTotalRial),
      quoteMarginUnitRial: roundRial(line.unitMarginRial),
      quoteTargetUnitPriceRial: roundRial(line.targetUnitPrice),
      quoteSaleUnitPriceRial: roundRial(line.saleUnitPrice),
      quoteFinalUnitPriceRial: roundRial(line.saleUnitPrice),
      quoteLineSubtotalRial: roundRial(line.lineSubtotal),
      quoteLineTotalRial: roundRial(line.lineTotal),
    };
  });

  return {
    ...order,
    items,
    amountRial: preview.orderTotal > 0 ? roundRial(preview.orderTotal) : order.amountRial,
    totalProfitRial: preview.totalProfit > 0 ? roundRial(preview.totalProfit) : 0,
    vatAmountRial: preview.vatAmount > 0 ? roundRial(preview.vatAmount) : 0,
    subtotalAmountRial: preview.subtotal > 0 ? roundRial(preview.subtotal) : 0,
    isPriced: preview.subtotal > 0,
    quoting: getOrderQuoting(order),
  };
}

export function setTargetInquiryOnOrder(order, itemIndex, inquiryId) {
  const items = (order.items || []).map((item, idx) => {
    if (idx !== itemIndex) return item;
    const exists = (item.inquiries || []).some((inq) => inq.id === inquiryId);
    if (!exists) return item;
    return { ...item, targetInquiryId: inquiryId };
  });
  return applyQuotingToOrder({ ...order, items });
}

export function updateOrderQuoting(order, patch) {
  if (!canEditProfitMargin()) {
    return order;
  }
  const quoting = {
    ...getOrderQuoting(order),
    ...patch,
    lineMargins: {
      ...getOrderQuoting(order).lineMargins,
      ...(patch.lineMargins || {}),
    },
  };
  return applyQuotingToOrder({ ...order, quoting });
}

export function ensureTargetOnAppend(order, itemIndex, inquiryId) {
  const item = order.items[itemIndex];
  if (!item) return order;
  const inquiries = item.inquiries || [];
  if (inquiries.length === 1) {
    return setTargetInquiryOnOrder(order, itemIndex, inquiryId);
  }
  return order;
}

export function canCompleteOrderInquiries(order) {
  const items = order.items || [];
  if (!items.length) return false;

  // بعد از به‌روزرسانی پیش‌فاکتور: هر سطر باید حداقل یک استعلام جدید داشته باشد
  const baseline = order.proformaUpdate?.baselineInquiryIds;
  if (baseline) {
    return items.every((item, index) => {
      const prior = new Set(baseline[index] || baseline[String(index)] || []);
      return (item.inquiries || []).some((inq) => !prior.has(inq.id));
    });
  }

  return items.every((item) => (item.inquiries || []).length > 0);
}

export function marginTypeToMode(marginType) {
  return marginType === 'percent'
    ? MARGIN_MODES.LINE_FIXED_PERCENT
    : MARGIN_MODES.LINE_FIXED_RIAL;
}

export function allLinesHaveSavedMargin(order) {
  const quoting = getOrderQuoting(order);
  const items = order.items || [];
  if (!items.length) return false;

  const isOrderLevel = quoting.marginMode === MARGIN_MODES.ORDER_FIXED_PERCENT
    || quoting.marginMode === MARGIN_MODES.ORDER_FIXED_RIAL;

  if (isOrderLevel) {
    const margin = parseNumber(quoting.orderMarginValue);
    if (margin == null) return false;
    return items.every((item) => Boolean(getTargetInquiry(item)));
  }

  return items.every((item, index) => {
    if (!getTargetInquiry(item)) return false;
    return parseNumber(quoting.lineMargins?.[index]) != null;
  });
}

/**
 * ذخیره حاشیه سود یک سطر و محاسبه قیمت فروش (خرید + سود) و جمع سطر.
 * @param {number} itemIndex — اندیس سطر (itemId)
 * @param {string|number} marginValue — مقدار سود
 * @param {'percent'|'rial'} marginType — واحد سود
 */
export function saveItemMargin(order, itemIndex, marginValue, marginType) {
  if (!canEditProfitMargin()) {
    return order;
  }
  const mode = marginTypeToMode(marginType);
  const updated = updateOrderQuoting(order, {
    marginMode: mode,
    lineMargins: { [itemIndex]: marginValue },
  });

  const line = calculateQuotingPreview(updated).lines[itemIndex];

  const items = (updated.items || []).map((it, idx) => {
    if (idx !== itemIndex) return it;
    return {
      ...it,
      marginSaved: {
        value: marginValue,
        type: marginType,
        purchaseUnitPrice: line?.targetUnitPrice ?? 0,
        unitSalePrice: line?.saleUnitPrice ?? 0,
        lineTotal: line?.lineTotal ?? 0,
        unitMarginRial: line?.unitMarginRial ?? 0,
      },
    };
  });

  return { ...updated, items };
}

export function canCompleteQuoting(order) {
  if (!canCompleteOrderInquiries(order)) return false;
  if (hasQuotingBlockers(order)) return false;
  if (!allLinesHaveSavedMargin(order)) return false;
  return true;
}
