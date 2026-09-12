/**
 * Pickled sheet (ورق اسید شویی) identity catalog.
 * Operator schema: thickness + width are required PRODUCT identity.
 * Length / supply form stay TRANSACTION and are not stored on the Product.
 *
 * Size matrix (operator 2026-09-08): ۲ تا ۵ میل در عرض ۱۰۰۰ و ۱۲۵۰.
 * Mill thicknesses: 2, 2.5, 3, 3.5, 4, 4.5, 5.
 */

export const PICKLED_SHEET_TYPE_NAME = 'ورق اسید شویی';

export const PICKLED_SHEET_THICKNESSES = Object.freeze([2, 2.5, 3, 3.5, 4, 4.5, 5]);
export const PICKLED_SHEET_WIDTHS = Object.freeze([1000, 1250]);

export function pickledSheetIdentityRows() {
  return PICKLED_SHEET_THICKNESSES.flatMap((thickness) => (
    PICKLED_SHEET_WIDTHS.map((width) => Object.freeze({ thickness, width }))
  ));
}

export default {
  PICKLED_SHEET_TYPE_NAME,
  PICKLED_SHEET_THICKNESSES,
  PICKLED_SHEET_WIDTHS,
  pickledSheetIdentityRows,
};
