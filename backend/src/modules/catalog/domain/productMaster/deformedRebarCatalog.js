/**
 * Deformed rebar (میلگرد آجدار) identity catalog.
 * Size + grade are Product identity (DDL-51). Length is not listed here.
 *
 * 8–12: A2 and A3
 * 14–40: A3 and A4
 */

export const DEFORMED_REBAR_TYPE_NAME = 'میلگرد آجدار';
export const DEFORMED_REBAR_GROUP_NAME = 'مقاطع فولادی';
export const DEFORMED_REBAR_DEFAULT_LENGTH_M = '12';

export const DEFORMED_REBAR_SIZES = Object.freeze([
  8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32, 36, 40,
]);

export function gradesForDeformedRebarSize(size) {
  const n = Number(size);
  if (!Number.isFinite(n)) return Object.freeze([]);
  if (n <= 12) return Object.freeze(['A2', 'A3']);
  return Object.freeze(['A3', 'A4']);
}

export function deformedRebarIdentityRows() {
  return DEFORMED_REBAR_SIZES.flatMap((size) => (
    gradesForDeformedRebarSize(size).map((grade) => Object.freeze({ size, grade }))
  ));
}

export default {
  DEFORMED_REBAR_TYPE_NAME,
  DEFORMED_REBAR_GROUP_NAME,
  DEFORMED_REBAR_DEFAULT_LENGTH_M,
  DEFORMED_REBAR_SIZES,
  gradesForDeformedRebarSize,
  deformedRebarIdentityRows,
};
