/**
 * Coil rebar (میلگرد کلاف) identity catalog.
 * Operator schema: grade + size are required PRODUCT identity.
 */

export const COIL_REBAR_TYPE_NAME = 'میلگرد کلاف';
export const COIL_REBAR_GROUP_NAME = 'مقاطع فولادی';

export const COIL_REBAR_GRADES = Object.freeze([
  'RST34-2',
  'RST37-2',
  'SAE1006',
  'SAE1008',
  '3SP',
  'A1',
  'A2',
  'A3',
]);

export const COIL_REBAR_SIZES_MM = Object.freeze([
  5.5, 6.5, 8, 10, 12, 14, 16,
]);

export function coilRebarIdentityRows() {
  return COIL_REBAR_GRADES.flatMap((grade) => (
    COIL_REBAR_SIZES_MM.map((size) => Object.freeze({ grade, size }))
  ));
}

export default {
  COIL_REBAR_TYPE_NAME,
  COIL_REBAR_GROUP_NAME,
  COIL_REBAR_GRADES,
  COIL_REBAR_SIZES_MM,
  coilRebarIdentityRows,
};
