/**
 * Shared Attribute Definition vocabulary (DDL-66).
 * Differences between Types are binding + overrideAllowedValues, not new codes.
 * Domain JS is a mill helper — PostgreSQL remains SoR after migrate.
 */

import { SUPPLY_FORM_CODE } from './sheetMillLength.js';

export const KIND_CODE = 'kind';
export const CLASS_CODE = 'class';
export const CLASS_NAME_FA = 'کلاس';
export const SIZE_PIPE_CODE = 'size_pipe';
export const SIZE_BRANCH_CODE = 'size_branch';
export const SIZE_BRANCH_NAME_FA = 'سایز دوم';
export const LENGTH_M_CODE = 'length';
export const THICKNESS_MM_CODE = 'thickness';
export const WIDTH_CODE = 'width';
export const HEIGHT_CODE = 'height';
export const LENGTH_MM_CODE = 'length_mm';
export const LENGTH_MM_ATTRIBUTE = Object.freeze({
  code: LENGTH_MM_CODE,
  skuCode: 'LNMM',
  nameFa: 'طول',
  dataType: 'DECIMAL',
});

export const FORGED_CLASS_VALUES = Object.freeze(['3000', '6000', '9000']);
export const FLANGE_CLASS_VALUES = Object.freeze([
  '150', '300', '600', '900', '1500', '2500',
]);
export const THREADED_CLASS_VALUES = Object.freeze(['standard', '150']);

export const CLASS_OPTIONS = Object.freeze([
  Object.freeze({ value: 'standard', labelFa: 'استاندارد' }),
  Object.freeze({ value: '150', labelFa: 'کلاس ۱۵۰' }),
  Object.freeze({ value: '300', labelFa: 'کلاس ۳۰۰' }),
  Object.freeze({ value: '600', labelFa: 'کلاس ۶۰۰' }),
  Object.freeze({ value: '900', labelFa: 'کلاس ۹۰۰' }),
  Object.freeze({ value: '1500', labelFa: 'کلاس ۱۵۰۰' }),
  Object.freeze({ value: '2500', labelFa: 'کلاس ۲۵۰۰' }),
  Object.freeze({ value: '3000', labelFa: 'کلاس ۳۰۰۰' }),
  Object.freeze({ value: '6000', labelFa: 'کلاس ۶۰۰۰' }),
  Object.freeze({ value: '9000', labelFa: 'کلاس ۹۰۰۰' }),
]);

export const CLASS_ATTRIBUTE = Object.freeze({
  code: CLASS_CODE,
  skuCode: 'CLAS',
  nameFa: CLASS_NAME_FA,
  dataType: 'ENUM',
  allowedValues: CLASS_OPTIONS,
});

export const COATING_KIND_OPTIONS = Object.freeze([
  Object.freeze({ value: 'سیاه', labelFa: 'سیاه' }),
  Object.freeze({ value: 'گالوانیزه', labelFa: 'گالوانیزه' }),
  Object.freeze({ value: 'گالوانیزه گرم', labelFa: 'گالوانیزه گرم' }),
  Object.freeze({ value: 'بدون پوشش', labelFa: 'بدون پوشش' }),
]);
export const COATING_KIND_VALUES = Object.freeze(
  COATING_KIND_OPTIONS.map((row) => row.value),
);

export const TOOTH_KIND_OPTIONS = Object.freeze([
  Object.freeze({ value: 'داخلی', labelFa: 'داخلی' }),
  Object.freeze({ value: 'خارجی', labelFa: 'خارجی' }),
]);
export const TOOTH_KIND_VALUES = Object.freeze(
  TOOTH_KIND_OPTIONS.map((row) => row.value),
);

export const OLET_KIND_OPTIONS = Object.freeze([
  Object.freeze({ value: 'ساکوولت', labelFa: 'ساکوولت' }),
  Object.freeze({ value: 'تردوولت', labelFa: 'تردوولت' }),
]);
export const OLET_KIND_VALUES = Object.freeze(
  OLET_KIND_OPTIONS.map((row) => row.value),
);

export const ELBOW_ANGLE_VALUES = Object.freeze(['90', '45']);
export const ELBOW_ANGLE_DEFAULT = '90';
export const ELBOW_ANGLE_SUPPLY_OPTIONS = Object.freeze([
  Object.freeze({ value: '90', labelFa: '۹۰ درجه' }),
  Object.freeze({ value: '45', labelFa: '۴۵ درجه' }),
]);

export const SURFACE_ALLOY_VALUES = Object.freeze([
  'تراش‌خورده',
  'پولیش شده',
  'دو پولیش',
  'کششی',
]);
export const SURFACE_ALLOY_DEFAULT = 'پولیش شده';
export const SURFACE_ALLOY_SUPPLY_OPTIONS = Object.freeze(
  SURFACE_ALLOY_VALUES.map((value) => Object.freeze({ value, labelFa: value })),
);

export const FLANGE_FACING_VALUES = Object.freeze(['برجسته', 'صاف', 'رینگ']);
export const FLANGE_FACING_DEFAULT = 'برجسته';
export const FLANGE_FACING_SUPPLY_OPTIONS = Object.freeze(
  FLANGE_FACING_VALUES.map((value) => Object.freeze({ value, labelFa: value })),
);

export const MILL_SUPPLY_FORM_VALUES = Object.freeze(['roll', 'mill', 'cut']);

export const KIND_EXTRA_OPTIONS = Object.freeze([
  ...COATING_KIND_OPTIONS,
  ...TOOTH_KIND_OPTIONS,
  ...OLET_KIND_OPTIONS,
]);

export const SUPPLY_FORM_EXTRA_OPTIONS = Object.freeze([
  ...ELBOW_ANGLE_SUPPLY_OPTIONS,
  ...SURFACE_ALLOY_SUPPLY_OPTIONS,
  ...FLANGE_FACING_SUPPLY_OPTIONS,
]);

/**
 * from_code → to_code. Null to_code means unbind (no replacement attribute).
 * Kept codes in this wave: `class` (justified gap), `size_branch` (second inch).
 */
export const ATTRIBUTE_DEDUP_MAP = Object.freeze([
  Object.freeze({ from: 'threaded_class', to: CLASS_CODE, reason: 'union pressure class' }),
  Object.freeze({ from: 'flange_class', to: CLASS_CODE, reason: 'union pressure class' }),
  Object.freeze({ from: 'forged_class', to: CLASS_CODE, reason: 'union pressure class' }),
  Object.freeze({ from: 'fastener_length', to: LENGTH_MM_CODE, reason: 'generic millimetre length; not sheet_length' }),
  Object.freeze({ from: 'board_length_m', to: LENGTH_M_CODE, reason: 'metre length' }),
  Object.freeze({ from: 'plywood_thickness_mm', to: THICKNESS_MM_CODE, reason: 'millimetre thickness' }),
  Object.freeze({ from: 'plywood_width_mm', to: WIDTH_CODE, reason: 'sheet width' }),
  Object.freeze({ from: 'plywood_height_mm', to: HEIGHT_CODE, reason: 'sheet height, not thickness' }),
  Object.freeze({ from: 'elbow_angle', to: SUPPLY_FORM_CODE, reason: 'offer form' }),
  Object.freeze({ from: 'surface_alloy', to: SUPPLY_FORM_CODE, reason: 'offer form' }),
  Object.freeze({ from: 'flange_facing', to: SUPPLY_FORM_CODE, reason: 'offer form' }),
  Object.freeze({ from: 'olet_style', to: KIND_CODE, reason: 'shared نوع' }),
  Object.freeze({ from: 'tooth_style', to: KIND_CODE, reason: 'shared نوع' }),
  Object.freeze({ from: 'coating', to: KIND_CODE, reason: 'shared نوع' }),
  Object.freeze({ from: 'frame_model', to: KIND_CODE, reason: 'shared نوع; Type-split still future' }),
  Object.freeze({ from: 'size_run', to: SIZE_PIPE_CODE, reason: 'primary inch size' }),
  Object.freeze({ from: 'size_large', to: SIZE_PIPE_CODE, reason: 'primary inch size' }),
  Object.freeze({ from: 'size_small', to: SIZE_BRANCH_CODE, reason: 'second inch size' }),
]);

export const DEACTIVATE_AFTER_MIGRATE = Object.freeze(
  ATTRIBUTE_DEDUP_MAP.map((row) => row.from),
);

export const JUSTIFIED_NEW_OR_KEPT = Object.freeze([
  Object.freeze({
    code: CLASS_CODE,
    nameFa: CLASS_NAME_FA,
    reason: 'No class/pressure_class existed. Three forked class ENUMs collapse here.',
  }),
  Object.freeze({
    code: LENGTH_MM_CODE,
    nameFa: 'طول',
    reason: 'No generic millimetre length existed (sheet_length is mill-sheet only; length is metre; length_profile is profile identity).',
  }),
  Object.freeze({
    code: SIZE_BRANCH_CODE,
    nameFa: SIZE_BRANCH_NAME_FA,
    reason: 'Only pre-existing inch DECIMAL is size_pipe; two-port fittings need a second inch field. size_run/large/small deactivate.',
  }),
  Object.freeze({
    code: 'board_thickness_cm',
    nameFa: 'ضخامت',
    reason: 'Mill thickness is millimetre; footboard identity is centimetre. Converting 5→50 would rewrite SKUs.',
  }),
  Object.freeze({
    code: 'board_width_cm',
    nameFa: 'عرض',
    reason: 'Same centimetre UOM gap as board_thickness_cm.',
  }),
]);

export function mergeEnumOptions(existing, extras) {
  const have = new Set((existing || []).map((item) => String(item.value)));
  const next = [...(existing || [])];
  for (const option of extras || []) {
    if (!have.has(String(option.value))) {
      next.push(option);
      have.add(String(option.value));
    }
  }
  return next;
}

export default {
  CLASS_CODE,
  ATTRIBUTE_DEDUP_MAP,
  DEACTIVATE_AFTER_MIGRATE,
  JUSTIFIED_NEW_OR_KEPT,
};
