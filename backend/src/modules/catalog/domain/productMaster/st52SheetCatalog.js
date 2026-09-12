/**
 * ST52 sheet (ورق ST52) identity catalog.
 * Operator schema: thickness + width are required PRODUCT identity.
 * Length / supply form stay TRANSACTION and are not stored on the Product.
 *
 * Size bands (operator 2026-09-08):
 * - ۲ میل → عرض ۱۲۵۰ و ۱۵۰۰
 * - ۳ تا ۴۰ میل → عرض ۱۵۰۰
 * - ۸ تا ۱۰۰ میل → عرض ۲۰۰۰
 * Mill thicknesses after 10 میل match the hot-rolled sheet steps.
 *
 * Operator typed «عرض ۲۰۰۰۰» for the 8–100 band; mill-sheet width is ۲۰۰۰.
 */

import { hotRolledSheetThicknessesBetween } from './hotRolledSheetCatalog.js';

export const ST52_SHEET_TYPE_NAME = 'ورق ST52';
export const ST52_SHEET_CLONE_TYPE_NAMES = Object.freeze(['ورق A516']);

export const ST52_SHEET_THIN_THICKNESS = 2;
export const ST52_SHEET_THIN_WIDTHS = Object.freeze([1250, 1500]);
export const ST52_SHEET_MID_WIDTH = 1500;
export const ST52_SHEET_HEAVY_WIDTH = 2000;

function addRow(byKey, thickness, width) {
  const key = `${width}@${thickness}`;
  if (!byKey.has(key)) byKey.set(key, Object.freeze({ thickness, width }));
}

export function st52SheetIdentityRows() {
  const byKey = new Map();
  for (const width of ST52_SHEET_THIN_WIDTHS) {
    addRow(byKey, ST52_SHEET_THIN_THICKNESS, width);
  }
  for (const thickness of hotRolledSheetThicknessesBetween(3, 40)) {
    addRow(byKey, thickness, ST52_SHEET_MID_WIDTH);
  }
  for (const thickness of hotRolledSheetThicknessesBetween(8, 100)) {
    addRow(byKey, thickness, ST52_SHEET_HEAVY_WIDTH);
  }
  return Object.freeze(
    [...byKey.values()].sort((a, b) => a.thickness - b.thickness || a.width - b.width),
  );
}

export default {
  ST52_SHEET_TYPE_NAME,
  ST52_SHEET_CLONE_TYPE_NAMES,
  ST52_SHEET_THIN_THICKNESS,
  ST52_SHEET_THIN_WIDTHS,
  ST52_SHEET_MID_WIDTH,
  ST52_SHEET_HEAVY_WIDTH,
  st52SheetIdentityRows,
};
