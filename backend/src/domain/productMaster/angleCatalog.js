/**
 * Equal-leg angle (نبشی) identity catalog.
 * Operator schema: leg1 + leg2 + thickness are required PRODUCT identity.
 * Length stays TRANSACTION (Type default 6 m) and is not stored on the Product.
 *
 * Both legs are equal. Unequal angles belong to a different Type if/when loaded.
 */

export const ANGLE_TYPE_NAME = 'نبشی';

export const ANGLE_ROWS = Object.freeze([
  Object.freeze({ leg: 20, thickness: 2 }),
  Object.freeze({ leg: 30, thickness: 2.5 }),
  Object.freeze({ leg: 30, thickness: 3 }),
  Object.freeze({ leg: 40, thickness: 2.5 }),
  Object.freeze({ leg: 40, thickness: 3 }),
  Object.freeze({ leg: 40, thickness: 4 }),
  Object.freeze({ leg: 50, thickness: 3 }),
  Object.freeze({ leg: 50, thickness: 4 }),
  Object.freeze({ leg: 50, thickness: 5 }),
  Object.freeze({ leg: 60, thickness: 4 }),
  Object.freeze({ leg: 60, thickness: 5 }),
  Object.freeze({ leg: 60, thickness: 6 }),
  Object.freeze({ leg: 70, thickness: 5 }),
  Object.freeze({ leg: 70, thickness: 6 }),
  Object.freeze({ leg: 70, thickness: 7 }),
  Object.freeze({ leg: 80, thickness: 6 }),
  Object.freeze({ leg: 80, thickness: 7 }),
  Object.freeze({ leg: 80, thickness: 8 }),
  Object.freeze({ leg: 90, thickness: 7 }),
  Object.freeze({ leg: 90, thickness: 8 }),
  Object.freeze({ leg: 90, thickness: 9 }),
  Object.freeze({ leg: 100, thickness: 10 }),
  Object.freeze({ leg: 100, thickness: 8 }),
  Object.freeze({ leg: 100, thickness: 9 }),
  Object.freeze({ leg: 120, thickness: 10 }),
  Object.freeze({ leg: 120, thickness: 12 }),
  Object.freeze({ leg: 120, thickness: 8 }),
]);

export function angleIdentityRows() {
  return ANGLE_ROWS.map((row) => Object.freeze({
    height: String(row.leg),
    height2: String(row.leg),
    thickness: row.thickness,
  }));
}

export default {
  ANGLE_TYPE_NAME,
  ANGLE_ROWS,
  angleIdentityRows,
};
