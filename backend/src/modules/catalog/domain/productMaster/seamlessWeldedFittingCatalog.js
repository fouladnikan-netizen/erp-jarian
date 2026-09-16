/**
 * Seamless welded fittings (اتصالات جوشی مانیسمان).
 * Identity is Type shape + required PRODUCT `fitting_material` (DDL-62).
 * Size / schedule stay TRANSACTION — no size×sch cartesian SKUs.
 *
 * Shared materials, sch, size range, and family binding plans live in
 * `weldedFittingCatalog.js` (also the contract seamed fittings will reuse).
 */

import {
  FITTING_MATERIAL_VALUES,
  WELDED_FITTING_FAMILY,
  weldedFittingBindingPlan,
  weldedFittingDisplayNameRule,
} from './weldedFittingCatalog.js';

export const SEAMLESS_WELDED_FITTING_GROUP_NAME = 'اتصالات فولادی';
export const SEAMLESS_WELDED_FITTING_CATEGORY_NAME = 'اتصالات جوشی مانیسمان';

export const SEAMLESS_WELDED_FITTING_TYPE_NAMES = Object.freeze([
  'زانو ۹۰ درجه مانیسمان',
  'زانو ۴۵ درجه مانیسمان',
  'زانو ۱۸۰ درجه مانیسمان (U-Bend)',
  'سه راهی مساوی مانیسمان',
  'سه راهی تبدیلی مانیسمان',
  'تبدیل هم‌مرکز مانیسمان',
  'تبدیل غیرهم‌مرکز مانیسمان',
  'کپ مانیسمان (درپوش)',
  'تبدیل لبه‌دار (استب اند)',
]);

export const SEAMLESS_WELDED_FITTING_ELBOW_TYPE_NAMES = Object.freeze([
  'زانو ۹۰ درجه مانیسمان',
  'زانو ۴۵ درجه مانیسمان',
  'زانو ۱۸۰ درجه مانیسمان (U-Bend)',
]);

export const SEAMLESS_WELDED_FITTING_SINGLE_PORT_TYPE_NAMES = Object.freeze([
  'سه راهی مساوی مانیسمان',
  'کپ مانیسمان (درپوش)',
  'تبدیل لبه‌دار (استب اند)',
]);

export const SEAMLESS_WELDED_FITTING_REDUCING_TEE_TYPE_NAMES = Object.freeze([
  'سه راهی تبدیلی مانیسمان',
]);

export const SEAMLESS_WELDED_FITTING_REDUCER_TYPE_NAMES = Object.freeze([
  'تبدیل هم‌مرکز مانیسمان',
  'تبدیل غیرهم‌مرکز مانیسمان',
]);

export function seamlessWeldedFittingFamily(typeName) {
  if (SEAMLESS_WELDED_FITTING_ELBOW_TYPE_NAMES.includes(typeName)) {
    return WELDED_FITTING_FAMILY.elbow;
  }
  if (SEAMLESS_WELDED_FITTING_SINGLE_PORT_TYPE_NAMES.includes(typeName)) {
    return WELDED_FITTING_FAMILY.singlePort;
  }
  if (SEAMLESS_WELDED_FITTING_REDUCING_TEE_TYPE_NAMES.includes(typeName)) {
    return WELDED_FITTING_FAMILY.reducingTee;
  }
  if (SEAMLESS_WELDED_FITTING_REDUCER_TYPE_NAMES.includes(typeName)) {
    return WELDED_FITTING_FAMILY.reducer;
  }
  return null;
}

export function seamlessWeldedFittingBindingPlan(typeName) {
  const family = seamlessWeldedFittingFamily(typeName);
  if (!family) throw new Error(`not a seamless welded fitting type: ${typeName}`);
  return weldedFittingBindingPlan(family);
}

/** Per-Type identity: material only. Size/sch are never Product identity. */
export function seamlessWeldedFittingIdentityRows(_typeName) {
  return FITTING_MATERIAL_VALUES.map((fitting_material) => Object.freeze({ fitting_material }));
}

export function seamlessWeldedFittingCatalogRows() {
  return SEAMLESS_WELDED_FITTING_TYPE_NAMES.flatMap((typeName) => (
    seamlessWeldedFittingIdentityRows(typeName).map((row) => Object.freeze({
      typeName,
      fitting_material: row.fitting_material,
    }))
  ));
}

export { weldedFittingDisplayNameRule as seamlessWeldedFittingDisplayNameRule };

export default {
  SEAMLESS_WELDED_FITTING_GROUP_NAME,
  SEAMLESS_WELDED_FITTING_CATEGORY_NAME,
  SEAMLESS_WELDED_FITTING_TYPE_NAMES,
  seamlessWeldedFittingFamily,
  seamlessWeldedFittingBindingPlan,
  seamlessWeldedFittingIdentityRows,
  seamlessWeldedFittingCatalogRows,
};
