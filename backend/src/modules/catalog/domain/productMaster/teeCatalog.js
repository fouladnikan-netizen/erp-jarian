/**
 * Tee section (سپری) identity catalog.
 * Operator schema: size is required PRODUCT identity. Kind is unbound.
 * Length stays TRANSACTION (Type default 6 m) and is not stored on the Product.
 */

export const TEE_TYPE_NAME = 'سپری';

export const TEE_SIZES = Object.freeze([3, 4, 5, 6]);

export function teeIdentityRows() {
  return TEE_SIZES.map((size) => Object.freeze({ size }));
}

export default {
  TEE_TYPE_NAME,
  TEE_SIZES,
  teeIdentityRows,
};
