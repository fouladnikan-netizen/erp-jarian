/**
 * IPE beam (تیرآهن IPE) identity catalog.
 * Operator schema: size is required PRODUCT identity. Kind is unbound/inactive.
 * Length stays TRANSACTION (Type default) and is not stored on the Product.
 */

export const IPE_BEAM_TYPE_NAME = 'تیرآهن IPE';
export const IPE_BEAM_GROUP_NAME = 'مقاطع فولادی';

export const IPE_BEAM_SIZES = Object.freeze([
  10, 12, 14, 16, 18, 20, 22, 24, 27, 30,
]);

export function ipeBeamIdentityRows() {
  return IPE_BEAM_SIZES.map((size) => Object.freeze({ size }));
}

export default {
  IPE_BEAM_TYPE_NAME,
  IPE_BEAM_GROUP_NAME,
  IPE_BEAM_SIZES,
  ipeBeamIdentityRows,
};
