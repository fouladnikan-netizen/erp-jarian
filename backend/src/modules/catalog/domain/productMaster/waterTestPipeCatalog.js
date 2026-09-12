/**
 * Water-test pipe (لوله تست آب) identity catalog.
 * Operator schema: size_pipe (اینچ) + thickness are required PRODUCT identity.
 * Length stays TRANSACTION (Type default ۶ m) and is not stored on the Product.
 * unitWeight is kg per ۶ m branch (DDL-47), not identity.
 * weightClass (سبک/متوسط/سنگین) is mill grade of the pair — not a third identity axis.
 *
 * Size is the nominal inch (DECIMAL). Pairs are closed mill combinations
 * (operator 2026-09-08), not a cartesian grid.
 */

export const WATER_TEST_PIPE_TYPE_NAME = 'لوله تست آب';

export const WATER_TEST_PIPE_ROWS = Object.freeze([
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
  Object.freeze({ size: 2.5, thickness: 3.6, unitWeight: 38.62, weightClass: 'متوسط' }),
  Object.freeze({ size: 2.5, thickness: 4, unitWeight: 42.67, weightClass: 'سنگین' }),
  Object.freeze({ size: 3, thickness: 3.6, unitWeight: 45.44, weightClass: 'متوسط' }),
  Object.freeze({ size: 3, thickness: 4, unitWeight: 50.25, weightClass: 'سنگین' }),
  Object.freeze({ size: 4, thickness: 4, unitWeight: 65.28, weightClass: 'متوسط' }),
  Object.freeze({ size: 4, thickness: 4.5, unitWeight: 73.11, weightClass: 'سنگین' }),
  Object.freeze({ size: 5, thickness: 4.5, unitWeight: 90.02, weightClass: 'متوسط' }),
  Object.freeze({ size: 5, thickness: 5, unitWeight: 99.65, weightClass: 'سنگین' }),
  Object.freeze({ size: 6, thickness: 4.5, unitWeight: 106.93, weightClass: 'متوسط' }),
  Object.freeze({ size: 6, thickness: 5, unitWeight: 118.44, weightClass: 'سنگین' }),
]);

export function waterTestPipeIdentityRows() {
  return WATER_TEST_PIPE_ROWS;
}

export default {
  WATER_TEST_PIPE_TYPE_NAME,
  WATER_TEST_PIPE_ROWS,
  waterTestPipeIdentityRows,
};
