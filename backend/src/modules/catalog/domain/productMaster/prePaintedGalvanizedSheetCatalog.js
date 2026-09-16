/**
 * Pre-painted galvanized sheet (ورق گالوانیزه رنگی) identity catalog.
 * Operator schema: thickness + width are required PRODUCT identity.
 * RAL / length / supply form / forming stay off mill Products
 * (RAL is optional PRODUCT; the rest are TRANSACTION).
 */

import { GALVANIZED_SHEET_WIDTHS } from './galvanizedSheetCatalog.js';

export const PRE_PAINTED_GALVANIZED_SHEET_TYPE_NAME = 'ورق گالوانیزه رنگی';

export const PRE_PAINTED_GALVANIZED_SHEET_THICKNESSES = Object.freeze([
  0.48, 0.5, 0.6, 0.7, 0.8,
]);

export const PRE_PAINTED_GALVANIZED_SHEET_WIDTHS = GALVANIZED_SHEET_WIDTHS;

export function prePaintedGalvanizedSheetIdentityRows() {
  return PRE_PAINTED_GALVANIZED_SHEET_THICKNESSES.flatMap((thickness) => (
    PRE_PAINTED_GALVANIZED_SHEET_WIDTHS.map((width) => Object.freeze({ thickness, width }))
  ));
}

export default {
  PRE_PAINTED_GALVANIZED_SHEET_TYPE_NAME,
  PRE_PAINTED_GALVANIZED_SHEET_THICKNESSES,
  PRE_PAINTED_GALVANIZED_SHEET_WIDTHS,
  prePaintedGalvanizedSheetIdentityRows,
};
