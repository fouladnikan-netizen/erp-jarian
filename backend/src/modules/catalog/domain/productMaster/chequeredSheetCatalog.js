/**
 * Chequered sheet (ورق آجدار فولادی) identity catalog.
 * Operator schema: thickness + width are required PRODUCT identity.
 * Kind is optional PRODUCT (type default فابریک) and not identity.
 * Length / supply form stay TRANSACTION and are not stored on the Product.
 *
 * Size matrix (operator 2026-09-08):
 * - ۲ و ۲٫۵ میل → عرض ۱۰۰۰ و ۱۲۵۰ (بدون ۱۵۰۰)
 * - ۳ تا ۱۰ میل → عرض ۱۰۰۰، ۱۲۵۰، ۱۵۰۰
 * Mill thicknesses: 2, 2.5, 3, 4, 5, 6, 8, 10.
 */

export const CHEQUERED_SHEET_TYPE_NAME = 'ورق آجدار فولادی';

export const CHEQUERED_SHEET_THIN_THICKNESSES = Object.freeze([2, 2.5]);
export const CHEQUERED_SHEET_THIN_WIDTHS = Object.freeze([1000, 1250]);
export const CHEQUERED_SHEET_MID_THICKNESSES = Object.freeze([3, 4, 5, 6, 8, 10]);
export const CHEQUERED_SHEET_MID_WIDTHS = Object.freeze([1000, 1250, 1500]);

export const CHEQUERED_SHEET_THICKNESSES = Object.freeze([
  ...CHEQUERED_SHEET_THIN_THICKNESSES,
  ...CHEQUERED_SHEET_MID_THICKNESSES,
]);
export const CHEQUERED_SHEET_WIDTHS = CHEQUERED_SHEET_MID_WIDTHS;

export function chequeredSheetIdentityRows() {
  return Object.freeze([
    ...CHEQUERED_SHEET_THIN_THICKNESSES.flatMap((thickness) => (
      CHEQUERED_SHEET_THIN_WIDTHS.map((width) => Object.freeze({ thickness, width }))
    )),
    ...CHEQUERED_SHEET_MID_THICKNESSES.flatMap((thickness) => (
      CHEQUERED_SHEET_MID_WIDTHS.map((width) => Object.freeze({ thickness, width }))
    )),
  ]);
}

export default {
  CHEQUERED_SHEET_TYPE_NAME,
  CHEQUERED_SHEET_THIN_THICKNESSES,
  CHEQUERED_SHEET_THIN_WIDTHS,
  CHEQUERED_SHEET_MID_THICKNESSES,
  CHEQUERED_SHEET_MID_WIDTHS,
  CHEQUERED_SHEET_THICKNESSES,
  CHEQUERED_SHEET_WIDTHS,
  chequeredSheetIdentityRows,
};
