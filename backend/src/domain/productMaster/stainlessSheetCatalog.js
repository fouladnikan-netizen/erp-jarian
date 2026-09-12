/**
 * Stainless mill-sheet identity catalog.
 * Grade lives in the Product Type name — never a Product/SKU attribute.
 * Identity is thickness × width. Length / رول‌شیت stay TRANSACTION (DDL-56).
 *
 * Width bands (operator 2026-09-11):
 * - ۰٫۴ تا ۱ → ۱۰۰۰، ۱۲۵۰
 * - ۱٫۲۵ تا ۴ → ۱۰۰۰، ۱۲۵۰، ۱۵۰۰
 * - ۵ تا ۶ → ۱۰۰۰، ۱۲۵۰، ۱۵۰۰، ۲۰۰۰
 * - ۸ تا ۳۰ → ۱۲۵۰، ۱۵۰۰، ۲۰۰۰ (۲۵ و ۳۰ همان باند ۸–۲۰)
 *
 * ۴۳۰ / ۳۰۴L / ۳۱۶L: full matrix.
 * ۳۱۰ / ۳۲۱ / دابلکس ۲۲۰۵: thickness ≥ ۱٫۵ (no ۰٫۴–۱٫۲۵).
 * Grade ۲۰۱ is out of the stainless family (no Type, no SKUs).
 */

export const STAINLESS_SHEET_FULL_TYPE_NAMES = Object.freeze([
  'ورق استیل ۴۳۰',
  'ورق استیل ۳۰۴L',
  'ورق استیل ۳۱۶L',
]);

export const STAINLESS_SHEET_FROM_1_5_TYPE_NAMES = Object.freeze([
  'ورق استیل ۳۱۰',
  'ورق استیل ۳۲۱',
  'ورق استیل دابلکس ۲۲۰۵',
]);

export const STAINLESS_SHEET_TYPE_NAMES = Object.freeze([
  ...STAINLESS_SHEET_FULL_TYPE_NAMES,
  ...STAINLESS_SHEET_FROM_1_5_TYPE_NAMES,
]);

export const STAINLESS_SHEET_THICKNESSES = Object.freeze([
  0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30,
]);

export const STAINLESS_SHEET_INDUSTRIAL_MIN_THICKNESS = 1.5;

export function stainlessSheetWidthsForThickness(thickness) {
  const t = Number(thickness);
  if (!Number.isFinite(t)) return [];
  if (t >= 0.4 && t <= 1) return [1000, 1250];
  if (t >= 1.25 && t <= 4) return [1000, 1250, 1500];
  if (t >= 5 && t <= 6) return [1000, 1250, 1500, 2000];
  if (t >= 8 && t <= 30) return [1250, 1500, 2000];
  return [];
}

export function stainlessSheetMinThickness(typeName) {
  return STAINLESS_SHEET_FROM_1_5_TYPE_NAMES.includes(typeName)
    ? STAINLESS_SHEET_INDUSTRIAL_MIN_THICKNESS
    : 0;
}

export function stainlessSheetIdentityRows(typeName) {
  const minThickness = stainlessSheetMinThickness(typeName);
  const rows = [];
  for (const thickness of STAINLESS_SHEET_THICKNESSES) {
    if (thickness < minThickness) continue;
    for (const width of stainlessSheetWidthsForThickness(thickness)) {
      rows.push(Object.freeze({ thickness, width }));
    }
  }
  return Object.freeze(rows);
}

export function stainlessSheetDisplayNameRule({
  thicknessId,
  widthId,
  sheetLengthId,
  supplyFormId,
} = {}) {
  return {
    separator: ' ',
    tokens: [
      { sourceType: 'type', includeLabel: false },
      thicknessId
        ? { sourceType: 'attribute', attributeId: thicknessId, includeLabel: true, includeUnit: true }
        : null,
      { sourceType: 'literal', literalId: 'dims' },
      widthId
        ? { sourceType: 'attribute', attributeId: widthId, includeLabel: false, includeUnit: true }
        : null,
      { sourceType: 'literal', literalId: 'times' },
      sheetLengthId
        ? { sourceType: 'attribute', attributeId: sheetLengthId, includeLabel: false, includeUnit: false }
        : null,
      supplyFormId
        ? { sourceType: 'attribute', attributeId: supplyFormId, includeLabel: true, includeUnit: true }
        : null,
    ].filter(Boolean),
  };
}

export default {
  STAINLESS_SHEET_FULL_TYPE_NAMES,
  STAINLESS_SHEET_FROM_1_5_TYPE_NAMES,
  STAINLESS_SHEET_TYPE_NAMES,
  STAINLESS_SHEET_THICKNESSES,
  STAINLESS_SHEET_INDUSTRIAL_MIN_THICKNESS,
  stainlessSheetWidthsForThickness,
  stainlessSheetMinThickness,
  stainlessSheetIdentityRows,
  stainlessSheetDisplayNameRule,
};
