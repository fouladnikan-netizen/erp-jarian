/**
 * Square/rectangular hollow section (پروفیل) identity catalog.
 * Operator schema: width_profile + length_profile + thickness are required
 * PRODUCT identity. Inactive dimensions ENUM is not stored.
 * Length stays TRANSACTION and is not stored on the Product.
 */

export const PROFILE_TYPE_NAME = 'پروفیل';

function row(width, height, thickness) {
  return Object.freeze({ width, height, thickness });
}

export const PROFILE_ROWS = Object.freeze([
  row(20, 20, 1.8), row(20, 30, 1.8), row(20, 40, 1.8),
  row(25, 25, 1.8),
  row(30, 30, 1.8), row(30, 40, 1.8), row(30, 50, 1.8), row(30, 60, 1.8),
  row(40, 40, 1.8), row(40, 60, 1.8), row(40, 80, 1.8), row(40, 100, 1.8),
  row(50, 50, 1.8), row(50, 100, 1.8),
  row(60, 60, 1.8), row(60, 80, 1.8),

  row(20, 20, 2), row(20, 30, 2), row(20, 40, 2),
  row(25, 25, 2), row(25, 50, 2),
  row(30, 30, 2), row(30, 40, 2), row(30, 50, 2), row(30, 60, 2),
  row(35, 35, 2),
  row(40, 40, 2), row(40, 50, 2), row(40, 60, 2), row(40, 80, 2), row(40, 100, 2),
  row(50, 50, 2), row(50, 60, 2), row(50, 100, 2),
  row(60, 60, 2), row(60, 80, 2), row(60, 100, 2), row(60, 120, 2),
  row(70, 70, 2),
  row(80, 80, 2), row(80, 100, 2),
  row(90, 90, 2),
  row(100, 100, 2),

  row(20, 20, 2.5), row(20, 30, 2.5), row(20, 40, 2.5),
  row(25, 50, 2.5),
  row(30, 30, 2.5), row(30, 40, 2.5), row(30, 50, 2.5), row(30, 60, 2.5),
  row(40, 40, 2.5), row(40, 50, 2.5), row(40, 60, 2.5), row(40, 80, 2.5), row(40, 100, 2.5),
  row(50, 50, 2.5), row(50, 60, 2.5), row(50, 100, 2.5),
  row(60, 60, 2.5), row(60, 80, 2.5), row(60, 100, 2.5), row(60, 120, 2.5),
  row(70, 70, 2.5),
  row(80, 80, 2.5), row(80, 100, 2.5),
  row(90, 90, 2.5),
  row(100, 100, 2.5),
  row(110, 110, 2.5),
  row(120, 120, 2.5),
  row(130, 130, 2.5),
  row(140, 140, 2.5),

  row(20, 40, 3),
  row(30, 30, 3), row(30, 40, 3), row(30, 50, 3), row(30, 60, 3),
  row(40, 40, 3), row(40, 60, 3), row(40, 80, 3), row(40, 100, 3),
  row(50, 50, 3), row(50, 100, 3),
  row(60, 60, 3), row(60, 80, 3), row(60, 100, 3), row(60, 120, 3),
  row(70, 70, 3),
  row(80, 80, 3), row(80, 100, 3),
  row(90, 90, 3),
  row(100, 100, 3),
  row(120, 120, 3),

  row(30, 30, 4), row(30, 40, 4), row(30, 50, 4), row(30, 60, 4),
  row(40, 40, 4), row(40, 60, 4), row(40, 80, 4), row(40, 100, 4),
  row(50, 50, 4), row(50, 100, 4),
  row(60, 60, 4), row(60, 80, 4), row(60, 100, 4), row(60, 120, 4),
  row(70, 70, 4),
  row(80, 80, 4), row(80, 100, 4),
  row(90, 90, 4),
  row(100, 100, 4),
  row(120, 120, 4),
  row(140, 140, 4),
]);

export function profileIdentityRows() {
  return PROFILE_ROWS.map((item) => Object.freeze({
    width: item.width,
    height: item.height,
    thickness: item.thickness,
  }));
}

export default {
  PROFILE_TYPE_NAME,
  PROFILE_ROWS,
  profileIdentityRows,
};
