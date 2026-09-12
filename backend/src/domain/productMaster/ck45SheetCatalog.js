/**
 * Ck45 sheet (ورق Ck45) identity catalog.
 * Operator schema: thickness + width are required PRODUCT identity.
 * Length / supply form stay TRANSACTION and are not stored on the Product.
 *
 * Size bands (operator 2026-09-08):
 * - ۳ تا ۱۵ میل → عرض ۱۵۰۰
 * - ۸ تا ۵۰ میل → عرض ۲۰۰۰
 * Mill thicknesses after 10 میل match the hot-rolled sheet steps.
 */

import { hotRolledSheetThicknessesBetween } from './hotRolledSheetCatalog.js';

export const CK45_SHEET_TYPE_NAME = 'ورق Ck45';
export const CK45_SHEET_MID_WIDTH = 1500;
export const CK45_SHEET_HEAVY_WIDTH = 2000;

function addRow(byKey, thickness, width) {
  const key = `${width}@${thickness}`;
  if (!byKey.has(key)) byKey.set(key, Object.freeze({ thickness, width }));
}

export function ck45SheetIdentityRows() {
  const byKey = new Map();
  for (const thickness of hotRolledSheetThicknessesBetween(3, 15)) {
    addRow(byKey, thickness, CK45_SHEET_MID_WIDTH);
  }
  for (const thickness of hotRolledSheetThicknessesBetween(8, 50)) {
    addRow(byKey, thickness, CK45_SHEET_HEAVY_WIDTH);
  }
  return Object.freeze(
    [...byKey.values()].sort((a, b) => a.thickness - b.thickness || a.width - b.width),
  );
}

export default {
  CK45_SHEET_TYPE_NAME,
  CK45_SHEET_MID_WIDTH,
  CK45_SHEET_HEAVY_WIDTH,
  ck45SheetIdentityRows,
};
