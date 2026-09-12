/**
 * Product Type defaults → Product offer settings (DDL-47).
 * Count/sales units are UOM relations (Product.baseUomId / salesUomId).
 * Type default changes never rewrite existing Products.
 */
import { appError } from '../../../../lib/errors.js';

export function isBlank(value) {
  return value === undefined || value === null || value === '';
}

/** Accept countUnitId / salesUnitId aliases without parallel DB columns. */
export function aliasProductOfferInput(body = {}) {
  const next = { ...body };
  if (Object.prototype.hasOwnProperty.call(next, 'countUnitId')
      && !Object.prototype.hasOwnProperty.call(next, 'baseUomId')) {
    next.baseUomId = next.countUnitId;
  }
  if (Object.prototype.hasOwnProperty.call(next, 'salesUnitId')
      && !Object.prototype.hasOwnProperty.call(next, 'salesUomId')) {
    next.salesUomId = next.salesUnitId;
  }
  return next;
}

export function assertPositiveUnitWeight(value) {
  if (isBlank(value)) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw appError('UNIT_WEIGHT_INVALID', 'وزن واحد باید عدد مثبت باشد.', 400);
  }
  return n;
}

function hasOwn(input, key) {
  return Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined;
}

/**
 * Copy Type defaults onto a new Product when the caller omitted a field.
 * Missing key → copy. Explicit null/empty → persist empty. Explicit value wins.
 */
export function applyTypeOfferDefaults(type = {}, input = {}) {
  const baseUomId = hasOwn(input, 'countUnitId') || hasOwn(input, 'baseUomId')
    ? (input.countUnitId ?? input.baseUomId ?? null)
    : (type.defaultCountUnitId ?? null);
  const salesUomId = hasOwn(input, 'salesUnitId') || hasOwn(input, 'salesUomId')
    ? (input.salesUnitId ?? input.salesUomId ?? null)
    : (type.defaultSalesUnitId ?? null);
  const unitWeight = hasOwn(input, 'unitWeight')
    ? (input.unitWeight ?? null)
    : (type.defaultUnitWeight ?? null);
  const customLengthAllowed = hasOwn(input, 'customLengthAllowed')
    ? Boolean(input.customLengthAllowed)
    : Boolean(type.customLengthAllowed);
  return {
    baseUomId: baseUomId || null,
    salesUomId: salesUomId || null,
    unitWeight: unitWeight ?? null,
    customLengthAllowed,
  };
}
