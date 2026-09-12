/**
 * Industrial flanges (فلنج‌ها, ASME B16.5 Iranian market).
 * Identity is Type shape + required PRODUCT `fitting_material` (DDL-63).
 * Shared `class` is TRANSACTION required — not pipe `sch`.
 * Facing is Offer Variant on حالت عرضه (not identity). Pipe schedule is not bound.
 */

import {
  CLASS_ATTRIBUTE,
  CLASS_CODE,
  FLANGE_CLASS_VALUES,
  FLANGE_FACING_DEFAULT,
  FLANGE_FACING_VALUES,
  SUPPLY_FORM_CODE,
} from './attributeDedupMap.js';
import {
  FITTING_MATERIAL_CODE,
  FITTING_MATERIAL_VALUES,
  FITTING_SIZE_PIPE_CODE,
  WELDED_FITTING_FORBIDDEN_MASTER_CODES,
  WELDED_FITTING_SIZE_MAX,
  WELDED_FITTING_SIZE_MIN,
  weldedFittingDisplayNameRule,
} from './weldedFittingCatalog.js';
import { FORGED_CLASS_VALUES } from './forgedFittingCatalog.js';
import { SEAMLESS_PIPE_SCH_VALUES } from './seamlessPipeCatalog.js';

export const FLANGE_GROUP_NAME = 'اتصالات فولادی';
export const FLANGE_CATEGORY_NAME = 'فلنج‌ها';

export const FLANGE_CLASS_CODE = CLASS_CODE;
export const FLANGE_FACING_CODE = SUPPLY_FORM_CODE;
export { FLANGE_CLASS_VALUES, FLANGE_FACING_VALUES, FLANGE_FACING_DEFAULT };

export const FLANGE_ATTRIBUTE_SPECS = Object.freeze([CLASS_ATTRIBUTE]);

export const FLANGE_TYPE_NAMES = Object.freeze([
  'فلنج گلودار جوشی',
  'فلنج اسلیپون (روکار)',
  'فلنج کور',
  'فلنج ساکت‌ولد',
  'فلنج دنده‌ای',
  'فلنج لبه‌دار',
]);

export const FLANGE_TYPE_LATIN_BY_NAME = Object.freeze({
  'فلنج گلودار جوشی': 'Welding Neck Flange',
  'فلنج اسلیپون (روکار)': 'Slip-On Flange',
  'فلنج کور': 'Blind Flange',
  'فلنج ساکت‌ولد': 'Socket-Welding Flange',
  'فلنج دنده‌ای': 'Threaded Flange',
  'فلنج لبه‌دار': 'Lap Joint Flange',
});

export const FLANGE_TYPE_NAME_ALIASES = Object.freeze({
  'فلنج لبه‌دار (لپ جوینت)': 'فلنج لبه‌دار',
});

const MATERIAL_BINDING = Object.freeze({
  code: FITTING_MATERIAL_CODE,
  isRequired: true,
  valueScope: 'PRODUCT',
  sortOrder: 10,
});

const SIZE_PIPE_BINDING = Object.freeze({
  code: FITTING_SIZE_PIPE_CODE,
  isRequired: true,
  valueScope: 'TRANSACTION',
  sortOrder: 20,
  overrideMin: WELDED_FITTING_SIZE_MIN,
  overrideMax: WELDED_FITTING_SIZE_MAX,
});

const FLANGE_CLASS_BINDING = Object.freeze({
  code: FLANGE_CLASS_CODE,
  isRequired: true,
  valueScope: 'TRANSACTION',
  sortOrder: 30,
  overrideAllowedValues: FLANGE_CLASS_VALUES,
});

const FLANGE_FACING_BINDING = Object.freeze({
  code: FLANGE_FACING_CODE,
  isRequired: false,
  valueScope: 'TRANSACTION',
  sortOrder: 40,
  overrideDefaultValue: FLANGE_FACING_DEFAULT,
  overrideAllowedValues: FLANGE_FACING_VALUES,
});

export function flangeBindingPlan(_typeName) {
  return Object.freeze([
    MATERIAL_BINDING,
    SIZE_PIPE_BINDING,
    FLANGE_CLASS_BINDING,
    FLANGE_FACING_BINDING,
  ]);
}

export function flangeClassIsDistinct() {
  const sch = new Set(SEAMLESS_PIPE_SCH_VALUES);
  const forged = new Set(FORGED_CLASS_VALUES);
  return FLANGE_CLASS_VALUES.every((value) => !sch.has(value) && !forged.has(value));
}

export function flangeIdentityRows(_typeName) {
  return FITTING_MATERIAL_VALUES.map((fitting_material) => Object.freeze({ fitting_material }));
}

export function flangeCatalogRows() {
  return FLANGE_TYPE_NAMES.flatMap((typeName) => (
    flangeIdentityRows(typeName).map((row) => Object.freeze({
      typeName,
      fitting_material: row.fitting_material,
    }))
  ));
}

export const FLANGE_FORBIDDEN_STORED_CODES = Object.freeze([
  ...WELDED_FITTING_FORBIDDEN_MASTER_CODES,
  'size_pipe',
  'sch',
  'forged_class',
  'flange_class',
  CLASS_CODE,
  'flange_facing',
  SUPPLY_FORM_CODE,
]);

export { weldedFittingDisplayNameRule as flangeDisplayNameRule };

export default {
  FLANGE_CATEGORY_NAME,
  FLANGE_TYPE_NAMES,
  FLANGE_CLASS_VALUES,
  FLANGE_FACING_VALUES,
  flangeBindingPlan,
  flangeIdentityRows,
  flangeCatalogRows,
  flangeClassIsDistinct,
};
