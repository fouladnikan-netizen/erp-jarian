/**
 * Stainless equal-leg angle (نبشی استیل) identity catalog.
 *
 * Binding shape matches carbon `نبشی` (`angleCatalog.js`): required PRODUCT
 * identity is `leg1` / `leg2` (بال ۱ / بال ۲ ENUM, equal values) + `thickness`.
 * Identity helper fields are `height` / `height2` / `thickness` — the same
 * names carbon `angleIdentityRows()` uses when posting to those bindings.
 *
 * Grade lives in the Product Type name — never a Product/SKU attribute.
 * Length is TRANSACTION (Type default 6 m, optional) and is not stored.
 * Unequal-leg (بال‌نابرابر) is out of scope; rows never store a second size.
 */

export const STAINLESS_ANGLE_TYPE_NAMES = Object.freeze([
  'نبشی استیل ۳۰۴',
  'نبشی استیل ۳۱۶',
]);

export const STAINLESS_ANGLE_DEFAULT_LENGTH_M = '6';

/** Closed mill pairs: equal-leg size mm → thicknesses mm. Not a cartesian. */
export const STAINLESS_ANGLE_ROWS = Object.freeze([
  Object.freeze({ size: 20, thickness: 2 }),
  Object.freeze({ size: 20, thickness: 3 }),
  Object.freeze({ size: 25, thickness: 3 }),
  Object.freeze({ size: 30, thickness: 3 }),
  Object.freeze({ size: 40, thickness: 3 }),
  Object.freeze({ size: 40, thickness: 4 }),
  Object.freeze({ size: 50, thickness: 4 }),
  Object.freeze({ size: 50, thickness: 5 }),
  Object.freeze({ size: 60, thickness: 5 }),
  Object.freeze({ size: 60, thickness: 6 }),
  Object.freeze({ size: 70, thickness: 6 }),
  Object.freeze({ size: 70, thickness: 7 }),
  Object.freeze({ size: 80, thickness: 6 }),
  Object.freeze({ size: 80, thickness: 8 }),
  Object.freeze({ size: 100, thickness: 8 }),
  Object.freeze({ size: 100, thickness: 10 }),
]);

export const STAINLESS_ANGLE_LEG_VALUES = Object.freeze(
  [...new Set(STAINLESS_ANGLE_ROWS.map((row) => String(row.size)))],
);

export function stainlessAngleIdentityRows() {
  return STAINLESS_ANGLE_ROWS.map((row) => Object.freeze({
    height: String(row.size),
    height2: String(row.size),
    thickness: row.thickness,
  }));
}

/**
 * Carbon `نبشی` live tokens: type + بال۱ × بال۲ + ضخامت + شاخه + طول.
 * TRANSACTION length is displayed from the Type default, not Product storage.
 */
export function stainlessAngleDisplayNameRule({
  heightId,
  height2Id,
  thicknessId,
  lengthId,
} = {}) {
  return {
    separator: ' ',
    tokens: [
      { sourceType: 'type', includeLabel: false },
      heightId
        ? { sourceType: 'attribute', attributeId: heightId, includeLabel: false, includeUnit: true }
        : null,
      { sourceType: 'literal', literalId: 'times' },
      height2Id
        ? { sourceType: 'attribute', attributeId: height2Id, includeLabel: false, includeUnit: true }
        : null,
      thicknessId
        ? { sourceType: 'attribute', attributeId: thicknessId, includeLabel: true, includeUnit: true }
        : null,
      { sourceType: 'literal', literalId: 'branch' },
      lengthId
        ? { sourceType: 'attribute', attributeId: lengthId, includeLabel: false, includeUnit: true }
        : null,
    ].filter(Boolean),
  };
}

export default {
  STAINLESS_ANGLE_TYPE_NAMES,
  STAINLESS_ANGLE_DEFAULT_LENGTH_M,
  STAINLESS_ANGLE_ROWS,
  STAINLESS_ANGLE_LEG_VALUES,
  stainlessAngleIdentityRows,
  stainlessAngleDisplayNameRule,
};
