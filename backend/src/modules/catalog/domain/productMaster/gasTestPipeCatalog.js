/**
 * Gas-test pipe (لوله تست گاز) identity catalog.
 * Operator schema: size_pipe (اینچ) + thickness are required PRODUCT identity.
 * Length stays TRANSACTION and is not stored on the Product.
 *
 * Size is the nominal inch (DECIMAL): 1/2 → 0.5, 3/4 → 0.75, 1 1/4 → 1.25.
 * Pairs are closed mill combinations (operator 2026-09-08), not a cartesian grid.
 */

export const GAS_TEST_PIPE_TYPE_NAME = 'لوله تست گاز';

export const GAS_TEST_PIPE_ROWS = Object.freeze([
  Object.freeze({ size: 0.5, thickness: 2.5 }),
  Object.freeze({ size: 0.5, thickness: 2.8 }),
  Object.freeze({ size: 0.75, thickness: 2.5 }),
  Object.freeze({ size: 0.75, thickness: 2.9 }),
  Object.freeze({ size: 1, thickness: 3 }),
  Object.freeze({ size: 1, thickness: 3.2 }),
  Object.freeze({ size: 1.25, thickness: 3.2 }),
  Object.freeze({ size: 1.25, thickness: 3.6 }),
  Object.freeze({ size: 1.5, thickness: 3.2 }),
  Object.freeze({ size: 1.5, thickness: 3.7 }),
  Object.freeze({ size: 2, thickness: 3.5 }),
  Object.freeze({ size: 2, thickness: 3.9 }),
  Object.freeze({ size: 2.5, thickness: 3.6 }),
  Object.freeze({ size: 2.5, thickness: 4.2 }),
  Object.freeze({ size: 3, thickness: 4 }),
  Object.freeze({ size: 3, thickness: 4.5 }),
]);

export function gasTestPipeIdentityRows() {
  return GAS_TEST_PIPE_ROWS;
}

export default {
  GAS_TEST_PIPE_TYPE_NAME,
  GAS_TEST_PIPE_ROWS,
  gasTestPipeIdentityRows,
};
