/**
 * Steel flat bar (تسمه فولادی) identity catalog.
 * Operator schema (DDL-57): thickness + strip_width are required PRODUCT identity.
 * Kind is optional PRODUCT (type default فابریک) and not identity.
 * Meter length stays TRANSACTION (Type default 6 m) and is not stored on the Product.
 *
 * Mill thickness×width bands (operator 2026-09-08):
 * - ۳ تا ۵ میل → عرض ۱۰…۱۰۰
 * - ۶ تا ۱۰ میل → عرض ۲۰…۱۵۰ (بدون زیر ۲۰)
 * - ۱۲ تا ۲۰ میل → عرض ۳۰…۳۰۰ (پهن‌تر)
 */

export const STEEL_FLAT_TYPE_NAME = 'تسمه فولادی';

export const STEEL_FLAT_LOW_THICKNESSES = Object.freeze([3, 4, 5]);
export const STEEL_FLAT_LOW_WIDTHS = Object.freeze([
  10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100,
]);

export const STEEL_FLAT_MID_THICKNESSES = Object.freeze([6, 8, 10]);
export const STEEL_FLAT_MID_WIDTHS = Object.freeze([
  20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150,
]);

export const STEEL_FLAT_HEAVY_THICKNESSES = Object.freeze([12, 15, 20]);
export const STEEL_FLAT_HEAVY_WIDTHS = Object.freeze([
  30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300,
]);

function addBand(byKey, thicknesses, widths) {
  for (const thickness of thicknesses) {
    for (const width of widths) {
      const key = `${width}@${thickness}`;
      if (!byKey.has(key)) byKey.set(key, Object.freeze({ thickness, stripWidth: width }));
    }
  }
}

export function steelFlatIdentityRows() {
  const byKey = new Map();
  addBand(byKey, STEEL_FLAT_LOW_THICKNESSES, STEEL_FLAT_LOW_WIDTHS);
  addBand(byKey, STEEL_FLAT_MID_THICKNESSES, STEEL_FLAT_MID_WIDTHS);
  addBand(byKey, STEEL_FLAT_HEAVY_THICKNESSES, STEEL_FLAT_HEAVY_WIDTHS);
  return Object.freeze(
    [...byKey.values()].sort((a, b) => a.thickness - b.thickness || a.stripWidth - b.stripWidth),
  );
}

export default {
  STEEL_FLAT_TYPE_NAME,
  STEEL_FLAT_LOW_THICKNESSES,
  STEEL_FLAT_LOW_WIDTHS,
  STEEL_FLAT_MID_THICKNESSES,
  STEEL_FLAT_MID_WIDTHS,
  STEEL_FLAT_HEAVY_THICKNESSES,
  STEEL_FLAT_HEAVY_WIDTHS,
  steelFlatIdentityRows,
};
