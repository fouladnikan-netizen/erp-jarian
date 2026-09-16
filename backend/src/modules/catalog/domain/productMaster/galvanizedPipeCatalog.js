/**
 * Galvanized pipe (لوله گالوانیزه) identity catalog.
 * Operator schema: size_pipe (اینچ) + thickness are required PRODUCT identity.
 * Length stays TRANSACTION (Type default ۶ m) and is not stored on the Product.
 * unitWeight is kg per ۶ m branch (DDL-47), not identity.
 * weightClass (سبک/متوسط/سنگین) is mill grade of the pair — not a third identity axis.
 *
 * Size is the nominal inch (DECIMAL). Pairs are closed mill combinations
 * (operator 2026-09-08), not a cartesian grid.
 */

export const GALVANIZED_PIPE_TYPE_NAME = 'لوله گالوانیزه';

export const GALVANIZED_PIPE_ROWS = Object.freeze([
  Object.freeze({ size: 0.5, thickness: 2, unitWeight: 5.71, weightClass: 'سبک' }),
  Object.freeze({ size: 0.5, thickness: 2.6, unitWeight: 7.19, weightClass: 'متوسط' }),
  Object.freeze({ size: 0.75, thickness: 2.3, unitWeight: 8.37, weightClass: 'سبک' }),
  Object.freeze({ size: 0.75, thickness: 2.6, unitWeight: 9.35, weightClass: 'متوسط' }),
  Object.freeze({ size: 1, thickness: 2.6, unitWeight: 11.96, weightClass: 'سبک' }),
  Object.freeze({ size: 1, thickness: 3.2, unitWeight: 14.44, weightClass: 'متوسط' }),
  Object.freeze({ size: 1.25, thickness: 2.9, unitWeight: 16.95, weightClass: 'متوسط' }),
  Object.freeze({ size: 1.25, thickness: 3.2, unitWeight: 18.56, weightClass: 'سنگین' }),
  Object.freeze({ size: 1.5, thickness: 2.9, unitWeight: 19.48, weightClass: 'متوسط' }),
  Object.freeze({ size: 1.5, thickness: 3.2, unitWeight: 21.35, weightClass: 'سنگین' }),
  Object.freeze({ size: 2, thickness: 3.2, unitWeight: 27.04, weightClass: 'متوسط' }),
  Object.freeze({ size: 2, thickness: 3.6, unitWeight: 30.2, weightClass: 'سنگین' }),
]);

export function galvanizedPipeIdentityRows() {
  return GALVANIZED_PIPE_ROWS;
}

export default {
  GALVANIZED_PIPE_TYPE_NAME,
  GALVANIZED_PIPE_ROWS,
  galvanizedPipeIdentityRows,
};
