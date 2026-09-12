/**
 * Galvanized hollow section (پروفیل گالوانیزه) identity catalog.
 * Operator schema: width_profile + length_profile + thickness are required
 * PRODUCT identity. Inactive dimensions ENUM is not stored.
 * Length stays TRANSACTION and is not stored on the Product.
 */

export const GALVANIZED_PROFILE_TYPE_NAME = 'پروفیل گالوانیزه';

function row(width, height, thickness) {
  return Object.freeze({ width, height, thickness });
}

export const GALVANIZED_PROFILE_ROWS = Object.freeze([
  row(20, 20, 2), row(20, 30, 2), row(20, 40, 2),
  row(30, 30, 2), row(30, 50, 2),
  row(40, 40, 2), row(40, 60, 2), row(40, 80, 2),
  row(50, 50, 2),
  row(60, 60, 2),
  row(70, 70, 2),
  row(80, 80, 2),
  row(90, 90, 2),

  row(20, 40, 2.5),
  row(30, 30, 2.5), row(30, 50, 2.5),
  row(40, 40, 2.5), row(40, 60, 2.5), row(40, 80, 2.5),
  row(50, 50, 2.5),
  row(60, 60, 2.5),
  row(70, 70, 2.5),
  row(80, 80, 2.5),
  row(90, 90, 2.5),
  row(100, 100, 2.5),
]);

export function galvanizedProfileIdentityRows() {
  return GALVANIZED_PROFILE_ROWS.map((item) => Object.freeze({
    width: item.width,
    height: item.height,
    thickness: item.thickness,
  }));
}

export default {
  GALVANIZED_PROFILE_TYPE_NAME,
  GALVANIZED_PROFILE_ROWS,
  galvanizedProfileIdentityRows,
};
