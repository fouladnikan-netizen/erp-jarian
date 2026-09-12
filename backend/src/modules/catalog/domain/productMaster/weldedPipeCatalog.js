/**
 * Welded pipe (لوله درزدار) identity catalog.
 * Operator listed «لوله درزدار صنعتی»; live Product Type name is لوله درزدار.
 * Operator schema: size_pipe (اینچ) + thickness are required PRODUCT identity.
 * Length stays TRANSACTION (Type default ۶ m) and is not stored on the Product.
 * unitWeight is kg per ۶ m branch (DDL-47), not identity.
 *
 * Size is the nominal inch (DECIMAL). Pairs are closed mill combinations
 * (operator 2026-09-08), not a cartesian grid.
 */

export const WELDED_PIPE_TYPE_NAME = 'لوله درزدار';

export const WELDED_PIPE_ROWS = Object.freeze([
  Object.freeze({ size: 0.5, thickness: 2, unitWeight: 5.71 }),
  Object.freeze({ size: 0.5, thickness: 2.5, unitWeight: 6.95 }),
  Object.freeze({ size: 0.75, thickness: 2, unitWeight: 7.36 }),
  Object.freeze({ size: 0.75, thickness: 2.5, unitWeight: 9.03 }),
  Object.freeze({ size: 1, thickness: 2, unitWeight: 9.39 }),
  Object.freeze({ size: 1, thickness: 2.5, unitWeight: 11.55 }),
  Object.freeze({ size: 1, thickness: 3, unitWeight: 13.63 }),
  Object.freeze({ size: 1.25, thickness: 2.5, unitWeight: 14.81 }),
  Object.freeze({ size: 1.25, thickness: 3, unitWeight: 17.51 }),
  Object.freeze({ size: 1.5, thickness: 2.5, unitWeight: 17.01 }),
  Object.freeze({ size: 1.5, thickness: 3, unitWeight: 20.13 }),
  Object.freeze({ size: 1.5, thickness: 3.5, unitWeight: 23.2 }),
  Object.freeze({ size: 2, thickness: 3.5, unitWeight: 29.4 }),
  Object.freeze({ size: 2, thickness: 4, unitWeight: 33.3 }),
  Object.freeze({ size: 2.5, thickness: 4, unitWeight: 42.6 }),
  Object.freeze({ size: 3, thickness: 4, unitWeight: 50.2 }),
  Object.freeze({ size: 3, thickness: 5, unitWeight: 62.2 }),
  Object.freeze({ size: 4, thickness: 4, unitWeight: 65.2 }),
  Object.freeze({ size: 4, thickness: 5, unitWeight: 80.9 }),
  Object.freeze({ size: 5, thickness: 5, unitWeight: 99.6 }),
  Object.freeze({ size: 6, thickness: 5, unitWeight: 118.4 }),
  Object.freeze({ size: 6, thickness: 6, unitWeight: 141.3 }),
  Object.freeze({ size: 8, thickness: 6, unitWeight: 189.1 }),
  Object.freeze({ size: 8, thickness: 8, unitWeight: 249.7 }),
]);

export function weldedPipeIdentityRows() {
  return WELDED_PIPE_ROWS;
}

export default {
  WELDED_PIPE_TYPE_NAME,
  WELDED_PIPE_ROWS,
  weldedPipeIdentityRows,
};
