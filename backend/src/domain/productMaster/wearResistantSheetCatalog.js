/**
 * Wear-resistant sheet (ورق ضد سایش) identity catalog.
 * Operator schema: thickness + kind (سختی) + width are required PRODUCT identity.
 * Length / supply form stay TRANSACTION and are not stored on the Product.
 *
 * Size matrix (operator 2026-09-08):
 * - ۶ تا ۳۰ میل × عرض ۱۵۰۰ و ۲۰۰۰
 * - سختی ۴۰۰ / ۴۵۰ / ۵۰۰
 * Mill thicknesses after 10 میل match the hot-rolled sheet steps.
 */

import { hotRolledSheetThicknessesBetween } from './hotRolledSheetCatalog.js';

export const WEAR_RESISTANT_SHEET_TYPE_NAME = 'ورق ضد سایش';

export const WEAR_RESISTANT_SHEET_KINDS = Object.freeze(['سختی ۴۰۰', 'سختی ۴۵۰', 'سختی ۵۰۰']);
export const WEAR_RESISTANT_SHEET_WIDTHS = Object.freeze([1500, 2000]);

export function wearResistantSheetIdentityRows() {
  const thicknesses = hotRolledSheetThicknessesBetween(6, 30);
  return Object.freeze(
    thicknesses.flatMap((thickness) => (
      WEAR_RESISTANT_SHEET_WIDTHS.flatMap((width) => (
        WEAR_RESISTANT_SHEET_KINDS.map((kind) => Object.freeze({ thickness, width, kind }))
      ))
    )),
  );
}

export default {
  WEAR_RESISTANT_SHEET_TYPE_NAME,
  WEAR_RESISTANT_SHEET_KINDS,
  WEAR_RESISTANT_SHEET_WIDTHS,
  wearResistantSheetIdentityRows,
};
