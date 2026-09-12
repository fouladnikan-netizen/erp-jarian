/**
 * Steel wire (سیم فولادی) identity catalog.
 * Operator schema: size is required PRODUCT identity (diameter, میل).
 * Count unit is حلقه; not stored on the Product.
 */

export const STEEL_WIRE_TYPE_NAME = 'سیم فولادی';
export const STEEL_WIRE_GROUP_NAME = 'مقاطع فولادی';
export const STEEL_WIRE_CATEGORY_NAME = 'مفتول و محصولات مفتولی';

export const STEEL_WIRE_SIZES_MM = Object.freeze([1.5, 2.5]);

export function steelWireIdentityRows() {
  return STEEL_WIRE_SIZES_MM.map((size) => Object.freeze({ size }));
}

export default {
  STEEL_WIRE_TYPE_NAME,
  STEEL_WIRE_GROUP_NAME,
  STEEL_WIRE_CATEGORY_NAME,
  STEEL_WIRE_SIZES_MM,
  steelWireIdentityRows,
};
