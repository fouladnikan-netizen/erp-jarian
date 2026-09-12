/**
 * Shared welded-fittings domain (seamed + seamless).
 * Identity is Product Type shape + required PRODUCT `fitting_material`.
 * Size and schedule are TRANSACTION (DDL-51 Optional Attribute), never SKU.
 * Domain JS is a mill helper — PostgreSQL remains SoR after seed.
 *
 * Do not fork schedule lists: `sch` re-exports SEAMLESS_PIPE_SCH_VALUES.
 */

import { SEAMLESS_PIPE_SCH_VALUES } from './seamlessPipeCatalog.js';

export { SEAMLESS_PIPE_SCH_VALUES };

export const WELDED_FITTING_SCH_VALUES = SEAMLESS_PIPE_SCH_VALUES;

export const WELDED_FITTING_SIZE_MIN = 0.5;
export const WELDED_FITTING_SIZE_MAX = 48;

export const WELDED_FITTING_FAMILY = Object.freeze({
  elbow: 'elbow',
  singlePort: 'singlePort',
  reducingTee: 'reducingTee',
  reducer: 'reducer',
});

export const FITTING_MATERIAL_CODE = 'fitting_material';
export const ELBOW_RADIUS_CODE = 'elbow_radius';
export const FITTING_SIZE_PIPE_CODE = 'size_pipe';
export const FITTING_SCH_CODE = 'sch';
export const FITTING_SIZE_BRANCH_CODE = 'size_branch';
/** Leftover wave codes — do not bind; migrate + deactivate (DDL-66). */
export const FITTING_SIZE_RUN_CODE = 'size_run';
export const FITTING_SIZE_LARGE_CODE = 'size_large';
export const FITTING_SIZE_SMALL_CODE = 'size_small';

export const WELDED_FITTING_FORBIDDEN_MASTER_CODES = Object.freeze(['size', 'grade', 'length']);

export const FITTING_MATERIAL_OPTIONS = Object.freeze([
  Object.freeze({ value: 'carbon', labelFa: 'فولادی' }),
  Object.freeze({ value: 'galvanized', labelFa: 'گالوانیزه' }),
  Object.freeze({ value: 'ss304', labelFa: 'استیل ۳۰۴' }),
  Object.freeze({ value: 'ss316', labelFa: 'استیل ۳۱۶' }),
]);

export const FITTING_MATERIAL_VALUES = Object.freeze(
  FITTING_MATERIAL_OPTIONS.map((row) => row.value),
);

export const FITTING_MATERIAL_ATTRIBUTE = Object.freeze({
  code: FITTING_MATERIAL_CODE,
  skuCode: 'FMAT',
  nameFa: 'جنس',
  dataType: 'ENUM',
  allowedValues: FITTING_MATERIAL_OPTIONS,
});

export const ELBOW_RADIUS_OPTIONS = Object.freeze([
  Object.freeze({ value: 'LR', labelFa: 'شعاع بلند (LR)' }),
  Object.freeze({ value: 'SR', labelFa: 'شعاع کوتاه (SR)' }),
]);

export const ELBOW_RADIUS_ATTRIBUTE = Object.freeze({
  code: ELBOW_RADIUS_CODE,
  skuCode: 'ELBR',
  nameFa: 'شعاع زانو',
  dataType: 'ENUM',
  allowedValues: ELBOW_RADIUS_OPTIONS,
});

export const FITTING_SIZE_BRANCH_ATTRIBUTE = Object.freeze({
  code: FITTING_SIZE_BRANCH_CODE,
  skuCode: 'SBRN',
  nameFa: 'سایز دوم',
  dataType: 'DECIMAL',
  minValue: WELDED_FITTING_SIZE_MIN,
  maxValue: WELDED_FITTING_SIZE_MAX,
});

export const WELDED_FITTING_SIZE_ATTRIBUTES = Object.freeze([
  FITTING_SIZE_BRANCH_ATTRIBUTE,
]);

export const WELDED_FITTING_ATTRIBUTE_SPECS = Object.freeze([
  FITTING_MATERIAL_ATTRIBUTE,
  ELBOW_RADIUS_ATTRIBUTE,
  FITTING_SIZE_BRANCH_ATTRIBUTE,
]);

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

function schBinding(sortOrder) {
  return Object.freeze({
    code: FITTING_SCH_CODE,
    isRequired: true,
    valueScope: 'TRANSACTION',
    sortOrder,
    overrideAllowedValues: WELDED_FITTING_SCH_VALUES,
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

const MATERIAL_BINDING = Object.freeze({
  code: FITTING_MATERIAL_CODE,
  isRequired: true,
  valueScope: 'PRODUCT',
  sortOrder: 10,
});

const ELBOW_RADIUS_BINDING = Object.freeze({
  code: ELBOW_RADIUS_CODE,
  isRequired: false,
  valueScope: 'TRANSACTION',
  sortOrder: 40,
  overrideDefaultValue: 'LR',
});

/**
 * Binding plan keyed by family. Seamed Types reuse the same families when loaded.
 */
export function weldedFittingBindingPlan(family) {
  switch (family) {
    case WELDED_FITTING_FAMILY.elbow:
      return Object.freeze([
        MATERIAL_BINDING,
        sizePipeBinding(20),
        schBinding(30),
        ELBOW_RADIUS_BINDING,
      ]);
    case WELDED_FITTING_FAMILY.singlePort:
      return Object.freeze([
        MATERIAL_BINDING,
        sizePipeBinding(20),
        schBinding(30),
      ]);
    case WELDED_FITTING_FAMILY.reducingTee:
      return Object.freeze([
        MATERIAL_BINDING,
        sizePipeBinding(20),
        inchSizeBinding(FITTING_SIZE_BRANCH_CODE, 21),
        schBinding(30),
      ]);
    case WELDED_FITTING_FAMILY.reducer:
      return Object.freeze([
        MATERIAL_BINDING,
        sizePipeBinding(20),
        inchSizeBinding(FITTING_SIZE_BRANCH_CODE, 21),
        schBinding(30),
      ]);
    default:
      throw new Error(`unknown welded fitting family: ${family}`);
  }
}

export function isValidWeldedFittingSize(size) {
  const n = Number(size);
  return Number.isFinite(n) && n >= WELDED_FITTING_SIZE_MIN && n <= WELDED_FITTING_SIZE_MAX;
}

export function validateReducingTeeSizes({ sizeRun, sizeBranch } = {}) {
  if (!isValidWeldedFittingSize(sizeRun) || !isValidWeldedFittingSize(sizeBranch)) {
    return { ok: false, error: 'size_out_of_range' };
  }
  if (!(Number(sizeBranch) < Number(sizeRun))) {
    return { ok: false, error: 'size_branch_must_be_less_than_size_run' };
  }
  return { ok: true };
}

export function validateReducerSizes({ sizeLarge, sizeSmall } = {}) {
  if (!isValidWeldedFittingSize(sizeLarge) || !isValidWeldedFittingSize(sizeSmall)) {
    return { ok: false, error: 'size_out_of_range' };
  }
  if (!(Number(sizeSmall) < Number(sizeLarge))) {
    return { ok: false, error: 'size_small_must_be_less_than_size_large' };
  }
  return { ok: true };
}

export function weldedFittingDisplayNameRule({ materialId } = {}) {
  return {
    separator: ' ',
    tokens: [
      { sourceType: 'type', includeLabel: false },
      materialId
        ? {
          sourceType: 'attribute',
          attributeId: materialId,
          includeLabel: false,
          includeUnit: false,
        }
        : null,
    ].filter(Boolean),
  };
}

export default {
  WELDED_FITTING_SCH_VALUES,
  WELDED_FITTING_SIZE_MIN,
  WELDED_FITTING_SIZE_MAX,
  WELDED_FITTING_FAMILY,
  FITTING_MATERIAL_ATTRIBUTE,
  ELBOW_RADIUS_ATTRIBUTE,
  WELDED_FITTING_ATTRIBUTE_SPECS,
  weldedFittingBindingPlan,
  isValidWeldedFittingSize,
  validateReducingTeeSizes,
  validateReducerSizes,
  weldedFittingDisplayNameRule,
};
