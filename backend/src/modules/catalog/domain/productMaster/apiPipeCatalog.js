/**
 * API pipe (لوله API) identity catalog.
 * Operator schema: size_pipe (اینچ) + thickness are required PRODUCT identity.
 * Length stays TRANSACTION (Type default ۶ m) and is not stored on the Product.
 * unitWeight is kg per ۶ m branch (DDL-47), not identity.
 *
 * Size is the nominal inch (DECIMAL). Pairs are closed mill combinations
 * (operator 2026-09-08), not a cartesian grid.
 */

export const API_PIPE_TYPE_NAME = 'لوله API';

export const API_PIPE_ROWS = Object.freeze([
  Object.freeze({ size: 0.5, thickness: 2.8, unitWeight: 7.66 }),
  Object.freeze({ size: 0.5, thickness: 3.2, unitWeight: 8.57 }),
  Object.freeze({ size: 0.75, thickness: 2.9, unitWeight: 10.21 }),
  Object.freeze({ size: 0.75, thickness: 3.2, unitWeight: 11.13 }),
  Object.freeze({ size: 1, thickness: 3.2, unitWeight: 14.3 }),
  Object.freeze({ size: 1, thickness: 4, unitWeight: 17.4 }),
  Object.freeze({ size: 1.25, thickness: 3.6, unitWeight: 20.56 }),
  Object.freeze({ size: 1.25, thickness: 4, unitWeight: 22.61 }),
  Object.freeze({ size: 1.5, thickness: 3.7, unitWeight: 24.42 }),
  Object.freeze({ size: 1.5, thickness: 4, unitWeight: 26.22 }),
  Object.freeze({ size: 2, thickness: 3.9, unitWeight: 32.55 }),
  Object.freeze({ size: 2, thickness: 4.5, unitWeight: 37.16 }),
  Object.freeze({ size: 2.5, thickness: 5.2, unitWeight: 52.17 }),
  Object.freeze({ size: 2.5, thickness: 5.6, unitWeight: 55.85 }),
  Object.freeze({ size: 3, thickness: 5.5, unitWeight: 67.87 }),
  Object.freeze({ size: 3, thickness: 6, unitWeight: 73.6 }),
  Object.freeze({ size: 4, thickness: 4, unitWeight: 65.28 }),
  Object.freeze({ size: 4, thickness: 6, unitWeight: 96.15 }),
  Object.freeze({ size: 5, thickness: 4.8, unitWeight: 96.95 }),
  Object.freeze({ size: 5, thickness: 6.4, unitWeight: 127.75 }),
  Object.freeze({ size: 6, thickness: 4.8, unitWeight: 116.13 }),
  Object.freeze({ size: 6, thickness: 7.1, unitWeight: 169.35 }),
  Object.freeze({ size: 8, thickness: 6, unitWeight: 189.19 }),
  Object.freeze({ size: 8, thickness: 8.2, unitWeight: 255.89 }),
]);

export function apiPipeIdentityRows() {
  return API_PIPE_ROWS;
}

export default {
  API_PIPE_TYPE_NAME,
  API_PIPE_ROWS,
  apiPipeIdentityRows,
};
