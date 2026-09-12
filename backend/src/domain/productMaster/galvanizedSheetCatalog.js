/**
 * Galvanized sheet (ورق گالوانیزه) identity catalog.
 * Operator schema: thickness + width are required PRODUCT identity.
 * Length / supply form / forming stay TRANSACTION and are not stored on the Product.
 * Mill-sheet millimetre length is `sheet_length` (DDL-56), not meter `length`.
 */

export const GALVANIZED_SHEET_TYPE_NAME = 'ورق گالوانیزه';

export const GALVANIZED_SHEET_THICKNESSES = Object.freeze([
  0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 2, 2.5, 3, 4,
]);

export const GALVANIZED_SHEET_WIDTHS = Object.freeze([1000, 1250]);

export function galvanizedSheetIdentityRows() {
  return GALVANIZED_SHEET_THICKNESSES.flatMap((thickness) => (
    GALVANIZED_SHEET_WIDTHS.map((width) => Object.freeze({ thickness, width }))
  ));
}

export default {
  GALVANIZED_SHEET_TYPE_NAME,
  GALVANIZED_SHEET_THICKNESSES,
  GALVANIZED_SHEET_WIDTHS,
  galvanizedSheetIdentityRows,
};
