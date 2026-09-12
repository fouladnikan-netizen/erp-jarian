/**
 * Well-casing pipe (لوله جدار چاه) identity catalog.
 * Operator schema: size_pipe (اینچ) + thickness are required PRODUCT identity.
 * Length stays TRANSACTION (Type default ۱۲ m) and is not stored on the Product.
 * slot_type stays TRANSACTION Offer Variant.
 * unitWeight is kg per ۶ m branch (operator catalog, approximate), not identity.
 *
 * Size is the nominal inch (DECIMAL). Pairs are closed mill combinations
 * (operator 2026-09-08), not a cartesian grid.
 */

import { WELL_CASING_TYPE_NAME } from './wellCasingSlotType.js';

export { WELL_CASING_TYPE_NAME };

export const WELL_CASING_PIPE_ROWS = Object.freeze([
  Object.freeze({ size: 6, thickness: 4, unitWeight: 99 }),
  Object.freeze({ size: 6, thickness: 5, unitWeight: 123 }),
  Object.freeze({ size: 8, thickness: 4, unitWeight: 127 }),
  Object.freeze({ size: 8, thickness: 5, unitWeight: 158 }),
  Object.freeze({ size: 10, thickness: 4.5, unitWeight: 181 }),
  Object.freeze({ size: 10, thickness: 5, unitWeight: 200 }),
  Object.freeze({ size: 12, thickness: 4.5, unitWeight: 215 }),
  Object.freeze({ size: 12, thickness: 5, unitWeight: 239 }),
  Object.freeze({ size: 12, thickness: 6, unitWeight: 286 }),
  Object.freeze({ size: 14, thickness: 5, unitWeight: 263 }),
  Object.freeze({ size: 14, thickness: 6, unitWeight: 315 }),
  Object.freeze({ size: 16, thickness: 5, unitWeight: 301 }),
  Object.freeze({ size: 16, thickness: 6, unitWeight: 361 }),
]);

export function wellCasingPipeIdentityRows() {
  return WELL_CASING_PIPE_ROWS;
}

export default {
  WELL_CASING_TYPE_NAME,
  WELL_CASING_PIPE_ROWS,
  wellCasingPipeIdentityRows,
};
