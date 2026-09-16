/**
 * Spiral pipe (لوله اسپیرال) identity catalog.
 * Operator schema: size_pipe (اینچ) + thickness are required PRODUCT identity.
 * Length stays TRANSACTION (Type default ۱۲ m) and is not stored on the Product.
 * unitWeight is kg per ۶ m branch (operator catalog, approximate), not identity.
 *
 * Size is the nominal inch (DECIMAL). Pairs are closed mill combinations
 * (operator 2026-09-08), not a cartesian grid.
 */

export const SPIRAL_PIPE_TYPE_NAME = 'لوله اسپیرال';

export const SPIRAL_PIPE_ROWS = Object.freeze([
  Object.freeze({ size: 10, thickness: 5, unitWeight: 200 }),
  Object.freeze({ size: 12, thickness: 5, unitWeight: 239 }),
  Object.freeze({ size: 14, thickness: 5, unitWeight: 263 }),
  Object.freeze({ size: 16, thickness: 6, unitWeight: 361 }),
  Object.freeze({ size: 18, thickness: 6, unitWeight: 408 }),
  Object.freeze({ size: 20, thickness: 6, unitWeight: 455 }),
  Object.freeze({ size: 24, thickness: 6, unitWeight: 548 }),
  Object.freeze({ size: 24, thickness: 8, unitWeight: 726 }),
  Object.freeze({ size: 28, thickness: 8, unitWeight: 850 }),
  Object.freeze({ size: 30, thickness: 8, unitWeight: 912 }),
  Object.freeze({ size: 32, thickness: 8, unitWeight: 974 }),
]);

export function spiralPipeIdentityRows() {
  return SPIRAL_PIPE_ROWS;
}

export default {
  SPIRAL_PIPE_TYPE_NAME,
  SPIRAL_PIPE_ROWS,
  spiralPipeIdentityRows,
};
