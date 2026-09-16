/**
 * Forged high-pressure fittings (اتصالات فشار قوی و فورج, ASME B16.11).
 * Identity is Type shape + required PRODUCT `fitting_material` (DDL-63).
 * `forged_class` (3000/6000/9000) is TRANSACTION required — not pipe `sch`.
 * Size is TRANSACTION. Domain JS is a mill helper; PostgreSQL is SoR.
 */

import {
  CLASS_ATTRIBUTE,
  CLASS_CODE,
  ELBOW_ANGLE_DEFAULT,
  ELBOW_ANGLE_VALUES,
  FORGED_CLASS_VALUES,
  KIND_CODE,
  OLET_KIND_VALUES,
  SUPPLY_FORM_CODE,
} from './attributeDedupMap.js';
import { SEAMLESS_PIPE_SCH_VALUES } from './seamlessPipeCatalog.js';
import {
  FITTING_MATERIAL_CODE,
  FITTING_MATERIAL_VALUES,
  FITTING_SIZE_BRANCH_CODE,
  FITTING_SIZE_PIPE_CODE,
  FITTING_SIZE_RUN_CODE,
  WELDED_FITTING_FORBIDDEN_MASTER_CODES,
  WELDED_FITTING_SIZE_MAX,
  WELDED_FITTING_SIZE_MIN,
  isValidWeldedFittingSize,
  validateReducingTeeSizes,
  weldedFittingDisplayNameRule,
} from './weldedFittingCatalog.js';

export const FORGED_FITTING_GROUP_NAME = 'اتصالات فولادی';
export const FORGED_FITTING_CATEGORY_NAME = 'اتصالات فشار قوی و فورج';

export const FORGED_CLASS_CODE = CLASS_CODE;
export const ELBOW_ANGLE_CODE = SUPPLY_FORM_CODE;
export const OLET_STYLE_CODE = KIND_CODE;

export { FORGED_CLASS_VALUES, ELBOW_ANGLE_VALUES, ELBOW_ANGLE_DEFAULT };
export const FORGED_CLASS_OPTIONS = Object.freeze(
  FORGED_CLASS_VALUES.map((value) => Object.freeze({ value, labelFa: value })),
);
export const FORGED_CLASS_ATTRIBUTE = Object.freeze({
  code: FORGED_CLASS_CODE,
  skuCode: 'CLAS',
  nameFa: 'کلاس',
  dataType: 'ENUM',
  allowedValues: FORGED_CLASS_OPTIONS,
});

export const OLET_STYLE_VALUES = OLET_KIND_VALUES;
export const OLET_STYLE_OPTIONS = Object.freeze(
  OLET_KIND_VALUES.map((value) => Object.freeze({ value, labelFa: value })),
);

export const FORGED_FITTING_ATTRIBUTE_SPECS = Object.freeze([CLASS_ATTRIBUTE]);

export const FORGED_FITTING_FAMILY = Object.freeze({
  singlePort: 'singlePort',
  swElbow: 'swElbow',
  reducingTee: 'reducingTee',
  olet: 'olet',
});

export const FORGED_FITTING_SW_ELBOW_TYPE_NAMES = Object.freeze([
  'زانو ساکت‌ولد',
]);
export const FORGED_FITTING_REDUCING_TEE_TYPE_NAMES = Object.freeze([
  'سه راهی تبدیلی ساکت‌ولد',
]);
export const FORGED_FITTING_OLET_TYPE_NAMES = Object.freeze([
  'تردوولت / ساکوولت (اتصالات انشعابی)',
]);
export const FORGED_FITTING_SINGLE_PORT_TYPE_NAMES = Object.freeze([
  'سه راهی مساوی ساکت‌ولد',
  'کاپلینگ ساکت‌ولد (بوشن)',
  'نیم‌بوشن ساکت‌ولد',
  'مهره ماسوره ساکت‌ولد',
  'کپ ساکت‌ولد',
  'زانو دنده‌ای فشار قوی',
  'سه راهی دنده‌ای فشار قوی',
  'مغزی فشار قوی',
]);

export const FORGED_FITTING_TYPE_NAMES = Object.freeze([
  ...FORGED_FITTING_SW_ELBOW_TYPE_NAMES,
  'سه راهی مساوی ساکت‌ولد',
  ...FORGED_FITTING_REDUCING_TEE_TYPE_NAMES,
  'کاپلینگ ساکت‌ولد (بوشن)',
  'نیم‌بوشن ساکت‌ولد',
  'مهره ماسوره ساکت‌ولد',
  'کپ ساکت‌ولد',
  ...FORGED_FITTING_OLET_TYPE_NAMES,
  'زانو دنده‌ای فشار قوی',
  'سه راهی دنده‌ای فشار قوی',
  'مغزی فشار قوی',
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

const FORGED_CLASS_BINDING = Object.freeze({
  code: FORGED_CLASS_CODE,
  isRequired: true,
  valueScope: 'TRANSACTION',
  sortOrder: 30,
  overrideAllowedValues: FORGED_CLASS_VALUES,
});

const ELBOW_ANGLE_BINDING = Object.freeze({
  code: ELBOW_ANGLE_CODE,
  isRequired: false,
  valueScope: 'TRANSACTION',
  sortOrder: 40,
  overrideDefaultValue: ELBOW_ANGLE_DEFAULT,
  overrideAllowedValues: ELBOW_ANGLE_VALUES,
});

const OLET_STYLE_BINDING = Object.freeze({
  code: OLET_STYLE_CODE,
  isRequired: false,
  valueScope: 'TRANSACTION',
  sortOrder: 40,
  overrideAllowedValues: OLET_KIND_VALUES,
});

export function forgedFittingFamily(typeName) {
  if (FORGED_FITTING_SW_ELBOW_TYPE_NAMES.includes(typeName)) {
    return FORGED_FITTING_FAMILY.swElbow;
  }
  if (FORGED_FITTING_REDUCING_TEE_TYPE_NAMES.includes(typeName)) {
    return FORGED_FITTING_FAMILY.reducingTee;
  }
  if (FORGED_FITTING_OLET_TYPE_NAMES.includes(typeName)) {
    return FORGED_FITTING_FAMILY.olet;
  }
  if (FORGED_FITTING_SINGLE_PORT_TYPE_NAMES.includes(typeName)) {
    return FORGED_FITTING_FAMILY.singlePort;
  }
  return null;
}

export function forgedFittingBindingPlan(typeName) {
  const family = forgedFittingFamily(typeName);
  switch (family) {
    case FORGED_FITTING_FAMILY.swElbow:
      return Object.freeze([
        MATERIAL_BINDING,
        sizePipeBinding(20),
        FORGED_CLASS_BINDING,
        ELBOW_ANGLE_BINDING,
      ]);
    case FORGED_FITTING_FAMILY.singlePort:
      return Object.freeze([
        MATERIAL_BINDING,
        sizePipeBinding(20),
        FORGED_CLASS_BINDING,
      ]);
    case FORGED_FITTING_FAMILY.reducingTee:
      return Object.freeze([
        MATERIAL_BINDING,
        sizePipeBinding(20),
        inchSizeBinding(FITTING_SIZE_BRANCH_CODE, 21),
        FORGED_CLASS_BINDING,
      ]);
    case FORGED_FITTING_FAMILY.olet:
      return Object.freeze([
        MATERIAL_BINDING,
        sizePipeBinding(20),
        inchSizeBinding(FITTING_SIZE_BRANCH_CODE, 21),
        FORGED_CLASS_BINDING,
        OLET_STYLE_BINDING,
      ]);
    default:
      throw new Error(`not a forged fitting type: ${typeName}`);
  }
}

/** Olet: branch (olet) may equal run (header). Reducing tee stays strict `<`. */
export function validateOletSizes({ sizeRun, sizeBranch } = {}) {
  if (!isValidWeldedFittingSize(sizeRun) || !isValidWeldedFittingSize(sizeBranch)) {
    return { ok: false, error: 'size_out_of_range' };
  }
  if (!(Number(sizeBranch) <= Number(sizeRun))) {
    return { ok: false, error: 'size_branch_must_be_lte_size_run' };
  }
  return { ok: true };
}

export function forgedClassIsNotPipeSch() {
  return FORGED_CLASS_VALUES.every((value) => !SEAMLESS_PIPE_SCH_VALUES.includes(value));
}

export function forgedFittingIdentityRows(_typeName) {
  return FITTING_MATERIAL_VALUES.map((fitting_material) => Object.freeze({ fitting_material }));
}

export function forgedFittingCatalogRows() {
  return FORGED_FITTING_TYPE_NAMES.flatMap((typeName) => (
    forgedFittingIdentityRows(typeName).map((row) => Object.freeze({
      typeName,
      fitting_material: row.fitting_material,
    }))
  ));
}

export const FORGED_FITTING_FORBIDDEN_STORED_CODES = Object.freeze([
  ...WELDED_FITTING_FORBIDDEN_MASTER_CODES,
  'size_pipe',
  'size_run',
  'size_branch',
  'sch',
  'forged_class',
  CLASS_CODE,
  'elbow_angle',
  SUPPLY_FORM_CODE,
  'olet_style',
  KIND_CODE,
]);

export {
  validateReducingTeeSizes,
  weldedFittingDisplayNameRule as forgedFittingDisplayNameRule,
};

export default {
  FORGED_FITTING_CATEGORY_NAME,
  FORGED_FITTING_TYPE_NAMES,
  FORGED_CLASS_VALUES,
  forgedFittingFamily,
  forgedFittingBindingPlan,
  forgedFittingIdentityRows,
  forgedFittingCatalogRows,
  validateOletSizes,
};
