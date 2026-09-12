/**
 * Plain rebar (میلگرد ساده) identity catalog.
 * Size is Product identity; the Type's only allowed grade is A1 (DDL-51).
 * Length is not listed here.
 */

export const PLAIN_REBAR_TYPE_NAME = 'میلگرد ساده';
export const PLAIN_REBAR_GROUP_NAME = 'مقاطع فولادی';
export const PLAIN_REBAR_DEFAULT_LENGTH_M = '6';
export const PLAIN_REBAR_GRADE = 'A1';

export const PLAIN_REBAR_SIZES = Object.freeze([
  8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32, 36, 40,
]);

export function plainRebarIdentityRows() {
  return PLAIN_REBAR_SIZES.map((size) => Object.freeze({ size, grade: PLAIN_REBAR_GRADE }));
}

export default {
  PLAIN_REBAR_TYPE_NAME,
  PLAIN_REBAR_GROUP_NAME,
  PLAIN_REBAR_DEFAULT_LENGTH_M,
  PLAIN_REBAR_GRADE,
  PLAIN_REBAR_SIZES,
  plainRebarIdentityRows,
};
