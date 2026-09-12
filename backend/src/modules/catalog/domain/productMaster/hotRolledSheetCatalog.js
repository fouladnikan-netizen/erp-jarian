/**
 * Hot-rolled sheet (ورق ساده فولادی / ورق سیاه) identity catalog.
 * Operator schema: thickness + width are required PRODUCT identity.
 * Length / supply form stay TRANSACTION and are not stored on the Product.
 *
 * Size bands (operator 2026-09-08):
 * - 1.5 / 1.8 / 2 / 2.5 میل → عرض ۱۰۰۰ و ۱۲۵۰
 * - 3 / 4 / 5 / 6 / 8 / 10 میل → عرض ۱۰۰۰، ۱۲۵۰، ۱۵۰۰
 * - ۶ تا ۱۵ میل → عرض ۱۲۰۰
 * - ۸ تا ۴۰ میل → عرض ۱۲۵۰ و ۱۵۰۰
 * - ۸ تا ۱۰۰ میل → عرض ۲۰۰۰
 * Thicknesses after 10 میل: 12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100.
 */

export const HOT_ROLLED_SHEET_TYPE_NAME = 'ورق ساده فولادی';
export const ASTM_HOT_ROLLED_SHEET_TYPE_NAMES = Object.freeze(['ورق A283', 'ورق A36']);

export const HOT_ROLLED_SHEET_THIN_THICKNESSES = Object.freeze([1.5, 1.8, 2, 2.5]);
export const HOT_ROLLED_SHEET_THIN_WIDTHS = Object.freeze([1000, 1250]);

export const HOT_ROLLED_SHEET_MID_THICKNESSES = Object.freeze([3, 4, 5, 6, 8, 10]);
export const HOT_ROLLED_SHEET_MID_WIDTHS = Object.freeze([1000, 1250, 1500]);

export const HOT_ROLLED_SHEET_AFTER_10_THICKNESSES = Object.freeze([
  12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100,
]);

const ALL_THICKNESSES = Object.freeze([
  ...HOT_ROLLED_SHEET_THIN_THICKNESSES,
  ...HOT_ROLLED_SHEET_MID_THICKNESSES,
  ...HOT_ROLLED_SHEET_AFTER_10_THICKNESSES,
]);

export function hotRolledSheetThicknessesBetween(min, max) {
  return ALL_THICKNESSES.filter((thickness) => thickness >= min && thickness <= max);
}

function addRow(byKey, thickness, width) {
  const key = `${width}@${thickness}`;
  if (!byKey.has(key)) byKey.set(key, Object.freeze({ thickness, width }));
}

export function hotRolledSheetIdentityRows() {
  const byKey = new Map();
  for (const thickness of HOT_ROLLED_SHEET_THIN_THICKNESSES) {
    for (const width of HOT_ROLLED_SHEET_THIN_WIDTHS) addRow(byKey, thickness, width);
  }
  for (const thickness of HOT_ROLLED_SHEET_MID_THICKNESSES) {
    for (const width of HOT_ROLLED_SHEET_MID_WIDTHS) addRow(byKey, thickness, width);
  }
  for (const thickness of hotRolledSheetThicknessesBetween(6, 15)) {
    addRow(byKey, thickness, 1200);
  }
  for (const thickness of hotRolledSheetThicknessesBetween(8, 40)) {
    addRow(byKey, thickness, 1250);
    addRow(byKey, thickness, 1500);
  }
  for (const thickness of hotRolledSheetThicknessesBetween(8, 100)) {
    addRow(byKey, thickness, 2000);
  }
  return Object.freeze(
    [...byKey.values()].sort((a, b) => a.thickness - b.thickness || a.width - b.width),
  );
}

export default {
  HOT_ROLLED_SHEET_TYPE_NAME,
  ASTM_HOT_ROLLED_SHEET_TYPE_NAMES,
  HOT_ROLLED_SHEET_THIN_THICKNESSES,
  HOT_ROLLED_SHEET_THIN_WIDTHS,
  HOT_ROLLED_SHEET_MID_THICKNESSES,
  HOT_ROLLED_SHEET_MID_WIDTHS,
  HOT_ROLLED_SHEET_AFTER_10_THICKNESSES,
  hotRolledSheetThicknessesBetween,
  hotRolledSheetIdentityRows,
};
