/**
 * Cold-rolled sheet (ورق روغنی) identity catalog.
 * Operator schema: thickness + width are required PRODUCT identity.
 * Grade is optional and not identity. Length / supply form stay TRANSACTION
 * and are not stored on the Product.
 * Size matrix matches galvanized sheet through 2.5 mm.
 */

import {
  GALVANIZED_SHEET_THICKNESSES,
  GALVANIZED_SHEET_WIDTHS,
} from './galvanizedSheetCatalog.js';

export const COLD_ROLLED_SHEET_TYPE_NAME = 'ورق روغنی';

export const COLD_ROLLED_SHEET_MAX_THICKNESS = 2.5;

export const COLD_ROLLED_SHEET_THICKNESSES = Object.freeze(
  GALVANIZED_SHEET_THICKNESSES.filter((thickness) => thickness <= COLD_ROLLED_SHEET_MAX_THICKNESS),
);

export const COLD_ROLLED_SHEET_WIDTHS = GALVANIZED_SHEET_WIDTHS;

export function coldRolledSheetIdentityRows() {
  return COLD_ROLLED_SHEET_THICKNESSES.flatMap((thickness) => (
    COLD_ROLLED_SHEET_WIDTHS.map((width) => Object.freeze({ thickness, width }))
  ));
}

export default {
  COLD_ROLLED_SHEET_TYPE_NAME,
  COLD_ROLLED_SHEET_MAX_THICKNESS,
  COLD_ROLLED_SHEET_THICKNESSES,
  COLD_ROLLED_SHEET_WIDTHS,
  coldRolledSheetIdentityRows,
};
