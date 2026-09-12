/**
 * Furniture / light profile (پروفیل مبلی) identity catalog.
 * Operator schema: width_profile + length_profile + thickness are required
 * PRODUCT identity. Length stays TRANSACTION and is not stored on the Product.
 */

export const FURNITURE_PROFILE_TYPE_NAME = 'پروفیل مبلی';

export const FURNITURE_PROFILE_SIZES = Object.freeze([
  Object.freeze([10, 10]),
  Object.freeze([15, 15]),
  Object.freeze([16, 16]),
  Object.freeze([20, 10]),
  Object.freeze([20, 20]),
  Object.freeze([20, 30]),
  Object.freeze([20, 40]),
  Object.freeze([25, 25]),
  Object.freeze([30, 30]),
  Object.freeze([30, 50]),
  Object.freeze([30, 60]),
  Object.freeze([40, 20]),
  Object.freeze([40, 40]),
  Object.freeze([50, 30]),
  Object.freeze([60, 30]),
  Object.freeze([60, 60]),
  Object.freeze([80, 40]),
]);

export const FURNITURE_PROFILE_THICKNESSES = Object.freeze([0.5, 0.6, 1, 1.25, 1.4, 1.5]);

export function furnitureProfileIdentityRows() {
  return FURNITURE_PROFILE_THICKNESSES.flatMap((thickness) => (
    FURNITURE_PROFILE_SIZES.map(([width, height]) => Object.freeze({ width, height, thickness }))
  ));
}

export default {
  FURNITURE_PROFILE_TYPE_NAME,
  FURNITURE_PROFILE_SIZES,
  FURNITURE_PROFILE_THICKNESSES,
  furnitureProfileIdentityRows,
};
