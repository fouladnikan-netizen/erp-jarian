/**
 * Stainless round-bar (میلگرد استیل) identity catalog.
 * Grade lives in the Product Type name — never a Product/SKU attribute.
 * Identity is diameter `size` (mm) only. Length is TRANSACTION (DDL-55),
 * optional, Type default 6 m — not stored on Product, not identity.
 *
 * Distinct from construction deformed rebar (میلگرد آجدار), whose identity
 * is size×grade under one Type.
 */

export const STAINLESS_BAR_GROUP_NAME = 'استنلس استیل';
export const STAINLESS_BAR_CATEGORY_NAME = 'میلگرد استیل';
export const STAINLESS_BAR_DEFAULT_LENGTH_M = '6';

export const STAINLESS_BAR_TYPE_NAMES = Object.freeze([
  'میلگرد استیل ۳۰۴',
  'میلگرد استیل ۳۱۶',
  'میلگرد استیل ۳۲۱',
  'میلگرد استیل ۴۲۰',
]);

export const STAINLESS_BAR_SIZES_MM = Object.freeze([
  6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80,
]);

export function stainlessBarIdentityRows(_typeName) {
  return STAINLESS_BAR_SIZES_MM.map((size) => Object.freeze({ size }));
}

export function stainlessBarDisplayNameRule({ sizeId, lengthId } = {}) {
  return {
    separator: ' ',
    tokens: [
      { sourceType: 'type', includeLabel: false },
      sizeId
        ? { sourceType: 'attribute', attributeId: sizeId, includeLabel: false, includeUnit: true }
        : null,
      { sourceType: 'literal', literalId: 'branch' },
      lengthId
        ? { sourceType: 'attribute', attributeId: lengthId, includeLabel: false, includeUnit: true }
        : null,
    ].filter(Boolean),
  };
}

export default {
  STAINLESS_BAR_GROUP_NAME,
  STAINLESS_BAR_CATEGORY_NAME,
  STAINLESS_BAR_DEFAULT_LENGTH_M,
  STAINLESS_BAR_TYPE_NAMES,
  STAINLESS_BAR_SIZES_MM,
  stainlessBarIdentityRows,
  stainlessBarDisplayNameRule,
};
