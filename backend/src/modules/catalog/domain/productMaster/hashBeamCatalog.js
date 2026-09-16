/**
 * H-beam (تیرآهن هاش) identity catalog.
 * Operator schema: size + kind are required PRODUCT identity.
 * kind سبک = HEA, kind سنگین = HEB.
 * Length stays TRANSACTION (Type default) and is not stored on the Product.
 *
 * Sizes 10–100 follow the mill series (27 like IPE; then 32/36 and 40–100
 * in 5 then 10 steps). Not every integer in between.
 */

export const HASH_BEAM_TYPE_NAME = 'تیرآهن هاش';
export const HASH_BEAM_GROUP_NAME = 'مقاطع فولادی';

export const HASH_BEAM_KINDS = Object.freeze(['سبک', 'سنگین']);

export const HASH_BEAM_SIZES = Object.freeze([
  10, 12, 14, 16, 18, 20, 22, 24, 27, 30,
  32, 36, 40, 45, 50, 55, 60, 65, 70, 80, 90, 100,
]);

export function hashBeamIdentityRows() {
  return HASH_BEAM_KINDS.flatMap((kind) => (
    HASH_BEAM_SIZES.map((size) => Object.freeze({ kind, size }))
  ));
}

export default {
  HASH_BEAM_TYPE_NAME,
  HASH_BEAM_GROUP_NAME,
  HASH_BEAM_KINDS,
  HASH_BEAM_SIZES,
  hashBeamIdentityRows,
};
