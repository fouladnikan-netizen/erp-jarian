/**
 * General threaded fittings (اتصالات دنده‌ای) — not forged high-pressure.
 * Identity is Type shape + required PRODUCT `fitting_material` (DDL-63).
 * Iranian default: size is the only order-required dimension.
 * `threaded_class` is Offer Variant (TRANSACTION not required).
 */

import {
  CLASS_ATTRIBUTE,
  CLASS_CODE,
  ELBOW_ANGLE_DEFAULT,
  ELBOW_ANGLE_VALUES,
  KIND_CODE,
  SUPPLY_FORM_CODE,
  THREADED_CLASS_VALUES,
} from './attributeDedupMap.js';
import {
  FITTING_MATERIAL_CODE,
  FITTING_MATERIAL_VALUES,
  FITTING_SIZE_BRANCH_CODE,
  FITTING_SIZE_PIPE_CODE,
  WELDED_FITTING_FORBIDDEN_MASTER_CODES,
  WELDED_FITTING_SIZE_MAX,
  WELDED_FITTING_SIZE_MIN,
  validateReducerSizes,
  validateReducingTeeSizes,
  weldedFittingDisplayNameRule,
} from './weldedFittingCatalog.js';

export { ELBOW_ANGLE_DEFAULT };

export const THREADED_FITTING_GROUP_NAME = 'اتصالات فولادی';
export const THREADED_FITTING_CATEGORY_NAME = 'اتصالات دنده‌ای';

export const THREADED_CLASS_CODE = CLASS_CODE;
export const ELBOW_ANGLE_CODE = SUPPLY_FORM_CODE;
export { THREADED_CLASS_VALUES };
export const THREADED_FITTING_ATTRIBUTE_SPECS = Object.freeze([CLASS_ATTRIBUTE]);

export const THREADED_FITTING_FAMILY = Object.freeze({
  singlePort: 'singlePort',
  elbow: 'elbow',
  reducingTee: 'reducingTee',
  bushing: 'bushing',
});

export const THREADED_FITTING_ELBOW_TYPE_NAMES = Object.freeze([
  'زانو دنده‌ای',
  'چپقی دنده‌ای (زانو مغزی)',
]);
export const THREADED_FITTING_REDUCING_TEE_TYPE_NAMES = Object.freeze([
  'سه راهی تبدیلی دنده‌ای',
]);
export const THREADED_FITTING_BUSHING_TYPE_NAMES = Object.freeze([
  'تبدیل دنده‌ای (روپیچ توپیچ)',
]);
export const THREADED_FITTING_SINGLE_PORT_TYPE_NAMES = Object.freeze([
  'سه راهی مساوی دنده‌ای',
  'مغزی دنده‌ای',
  'بوشن دنده‌ای',
  'مهره ماسوره دنده‌ای',
  'درپوش دنده‌ای (چهارگوش/شش‌گوش)',
]);

export const THREADED_FITTING_TYPE_NAMES = Object.freeze([
  'زانو دنده‌ای',
  'سه راهی مساوی دنده‌ای',
  ...THREADED_FITTING_REDUCING_TEE_TYPE_NAMES,
  'چپقی دنده‌ای (زانو مغزی)',
  'مغزی دنده‌ای',
  'بوشن دنده‌ای',
  ...THREADED_FITTING_BUSHING_TYPE_NAMES,
  'مهره ماسوره دنده‌ای',
  'درپوش دنده‌ای (چهارگوش/شش‌گوش)',
]);

/** Must never bind onto forged high-pressure threaded Types. */
export const THREADED_FITTING_EXCLUDED_TYPE_NAMES = Object.freeze([
  'زانو دنده‌ای فشار قوی',
  'سه راهی دنده‌ای فشار قوی',
]);

const MATERIAL_BINDING = Object.freeze({
  code: FITTING_MATERIAL_CODE,
  isRequired: true,
  valueScope: 'PRODUCT',
  sortOrder: 10,
});

function sizePipeBinding(sortOrder) {
  return Object.freeze({
    code: FITTING_SIZE_PIPE_CODE,
    isRequired: true,
    valueScope: 'TRANSACTION',
    sortOrder,
    overrideMin: WELDED_FITTING_SIZE_MIN,
    overrideMax: WELDED_FITTING_SIZE_MAX,
  });
}

function inchSizeBinding(code, sortOrder) {
  return Object.freeze({
    code,
    isRequired: true,
    valueScope: 'TRANSACTION',
    sortOrder,
    overrideMin: WELDED_FITTING_SIZE_MIN,
    overrideMax: WELDED_FITTING_SIZE_MAX,
  });
}

const THREADED_CLASS_BINDING = Object.freeze({
  code: THREADED_CLASS_CODE,
  isRequired: false,
  valueScope: 'TRANSACTION',
  sortOrder: 50,
  overrideAllowedValues: THREADED_CLASS_VALUES,
});

const ELBOW_ANGLE_BINDING = Object.freeze({
  code: ELBOW_ANGLE_CODE,
  isRequired: false,
  valueScope: 'TRANSACTION',
  sortOrder: 40,
  overrideDefaultValue: ELBOW_ANGLE_DEFAULT,
  overrideAllowedValues: ELBOW_ANGLE_VALUES,
});

export function threadedFittingFamily(typeName) {
  if (THREADED_FITTING_EXCLUDED_TYPE_NAMES.includes(typeName)) return null;
  if (THREADED_FITTING_ELBOW_TYPE_NAMES.includes(typeName)) {
    return THREADED_FITTING_FAMILY.elbow;
  }
  if (THREADED_FITTING_REDUCING_TEE_TYPE_NAMES.includes(typeName)) {
    return THREADED_FITTING_FAMILY.reducingTee;
  }
  if (THREADED_FITTING_BUSHING_TYPE_NAMES.includes(typeName)) {
    return THREADED_FITTING_FAMILY.bushing;
  }
  if (THREADED_FITTING_SINGLE_PORT_TYPE_NAMES.includes(typeName)) {
    return THREADED_FITTING_FAMILY.singlePort;
  }
  return null;
}

export function threadedFittingBindingPlan(typeName) {
  const family = threadedFittingFamily(typeName);
  switch (family) {
    case THREADED_FITTING_FAMILY.elbow:
      return Object.freeze([
        MATERIAL_BINDING,
        sizePipeBinding(20),
        ELBOW_ANGLE_BINDING,
        THREADED_CLASS_BINDING,
      ]);
    case THREADED_FITTING_FAMILY.singlePort:
      return Object.freeze([
        MATERIAL_BINDING,
        sizePipeBinding(20),
        THREADED_CLASS_BINDING,
      ]);
    case THREADED_FITTING_FAMILY.reducingTee:
      return Object.freeze([
        MATERIAL_BINDING,
        sizePipeBinding(20),
        inchSizeBinding(FITTING_SIZE_BRANCH_CODE, 21),
        THREADED_CLASS_BINDING,
      ]);
    case THREADED_FITTING_FAMILY.bushing:
      return Object.freeze([
        MATERIAL_BINDING,
        sizePipeBinding(20),
        inchSizeBinding(FITTING_SIZE_BRANCH_CODE, 21),
        THREADED_CLASS_BINDING,
      ]);
    default:
      throw new Error(`not a general threaded fitting type: ${typeName}`);
  }
}

export function threadedFittingIdentityRows(_typeName) {
  return FITTING_MATERIAL_VALUES.map((fitting_material) => Object.freeze({ fitting_material }));
}

export function threadedFittingCatalogRows() {
  return THREADED_FITTING_TYPE_NAMES.flatMap((typeName) => (
    threadedFittingIdentityRows(typeName).map((row) => Object.freeze({
      typeName,
      fitting_material: row.fitting_material,
    }))
  ));
}

export const THREADED_FITTING_FORBIDDEN_STORED_CODES = Object.freeze([
  ...WELDED_FITTING_FORBIDDEN_MASTER_CODES,
  'size_pipe',
  'size_run',
  'size_branch',
  'size_large',
  'size_small',
  'sch',
  'forged_class',
  'threaded_class',
  CLASS_CODE,
  'elbow_angle',
  SUPPLY_FORM_CODE,
  KIND_CODE,
]);

export {
  validateReducerSizes,
  validateReducingTeeSizes,
  weldedFittingDisplayNameRule as threadedFittingDisplayNameRule,
};

export default {
  THREADED_FITTING_CATEGORY_NAME,
  THREADED_FITTING_TYPE_NAMES,
  threadedFittingFamily,
  threadedFittingBindingPlan,
  threadedFittingIdentityRows,
  threadedFittingCatalogRows,
};
