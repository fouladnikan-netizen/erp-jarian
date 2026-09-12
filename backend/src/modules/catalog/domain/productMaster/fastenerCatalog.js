/**
 * Fasteners (پیچ و مهره) identity catalog.
 * Operator rule: Product Type is the shape; the only Required Attribute is
 * PRODUCT ENUM `fastener_grade` (ISO property class). Metric size and length
 * are TRANSACTION (order-time). Coating is Offer Variant on shared `kind`.
 * Domain JS is a mill helper — PostgreSQL remains SoR after seed.
 */
import { KIND_CODE, COATING_KIND_OPTIONS, COATING_KIND_VALUES, TOOTH_KIND_VALUES, LENGTH_MM_CODE } from './attributeDedupMap.js';

export const FASTENER_GROUP_NAME = 'پیچ و مهره';
export const FASTENER_GROUP_NAME_LATIN = 'Fasteners';

export const FASTENER_FAMILY = Object.freeze({
  bolt: 'bolt',
  nut: 'nut',
  washer: 'washer',
  anchor: 'anchor',
  selfDrilling: 'selfDrilling',
});

export const FASTENER_GRADE_CODE = 'fastener_grade';
export const FASTENER_SIZE_CODE = 'fastener_size';
export const FASTENER_LENGTH_CODE = LENGTH_MM_CODE;
export const FASTENER_COATING_CODE = KIND_CODE;
export const FASTENER_TOOTH_STYLE_CODE = KIND_CODE;

export const FASTENER_LENGTH_MIN_MM = 5;
export const FASTENER_LENGTH_MAX_MM = 1000;

/** Mill / pipe / leftover STRING codes that must not stay required PRODUCT identity. */
export const FASTENER_FORBIDDEN_MASTER_CODES = Object.freeze([
  'size',
  'size_pipe',
  'grade',
  'length',
  'alloy',
  'head_style',
  'fastener_length',
  'coating',
  'tooth_style',
  'sheet_length',
]);

export const FASTENER_GRADE_OPTIONS = Object.freeze([
  Object.freeze({ value: '4.8', labelFa: '4.8' }),
  Object.freeze({ value: '5.6', labelFa: '5.6' }),
  Object.freeze({ value: '8.8', labelFa: '8.8' }),
  Object.freeze({ value: '10.9', labelFa: '10.9' }),
  Object.freeze({ value: '12.9', labelFa: '12.9' }),
  Object.freeze({ value: 'A2-70', labelFa: 'A2-70' }),
  Object.freeze({ value: 'A4-70', labelFa: 'A4-70' }),
  Object.freeze({ value: 'A4-80', labelFa: 'A4-80' }),
]);

export const FASTENER_GRADE_VALUES = Object.freeze(
  FASTENER_GRADE_OPTIONS.map((row) => row.value),
);

/**
 * Bolts, nuts, and anchors inherit the full property-class list
 * (including wing / acorn nuts — no smaller subset).
 */
export const FASTENER_GENERAL_GRADES = FASTENER_GRADE_VALUES;

export const FASTENER_WASHER_GRADES = Object.freeze(['4.8', 'A2-70', 'A4-80']);
export const FASTENER_SELF_DRILL_GRADES = Object.freeze(['8.8', 'A2-70', 'A4-80']);

export const FASTENER_SIZE_VALUES = Object.freeze([
  'M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12', 'M14', 'M16',
  'M18', 'M20', 'M22', 'M24', 'M27', 'M30', 'M33', 'M36',
]);

export const FASTENER_SIZE_OPTIONS = Object.freeze(
  FASTENER_SIZE_VALUES.map((value) => Object.freeze({ value, labelFa: value })),
);

export const FASTENER_COATING_OPTIONS = COATING_KIND_OPTIONS;

export const FASTENER_TOOTH_STYLE_OPTIONS = Object.freeze(
  TOOTH_KIND_VALUES.map((value) => Object.freeze({ value, labelFa: value })),
);

export const FASTENER_GRADE_ATTRIBUTE = Object.freeze({
  code: FASTENER_GRADE_CODE,
  skuCode: 'FGRD',
  nameFa: 'کلاس مقاومت',
  dataType: 'ENUM',
  allowedValues: FASTENER_GRADE_OPTIONS,
});

export const FASTENER_SIZE_ATTRIBUTE = Object.freeze({
  code: FASTENER_SIZE_CODE,
  skuCode: 'FSIZ',
  nameFa: 'سایز متریک',
  dataType: 'ENUM',
  allowedValues: FASTENER_SIZE_OPTIONS,
});

export const FASTENER_LENGTH_ATTRIBUTE = Object.freeze({
  code: FASTENER_LENGTH_CODE,
  skuCode: 'LNMM',
  nameFa: 'طول',
  dataType: 'DECIMAL',
  minValue: FASTENER_LENGTH_MIN_MM,
  maxValue: FASTENER_LENGTH_MAX_MM,
});

export const FASTENER_COATING_ATTRIBUTE = Object.freeze({
  code: FASTENER_COATING_CODE,
  skuCode: 'KIND',
  nameFa: 'نوع',
  dataType: 'ENUM',
  allowedValues: FASTENER_COATING_OPTIONS,
});

export const FASTENER_TOOTH_STYLE_ATTRIBUTE = Object.freeze({
  code: FASTENER_TOOTH_STYLE_CODE,
  skuCode: 'KIND',
  nameFa: 'نوع',
  dataType: 'ENUM',
  allowedValues: FASTENER_TOOTH_STYLE_OPTIONS,
});

export const FASTENER_ATTRIBUTE_SPECS = Object.freeze([
  FASTENER_GRADE_ATTRIBUTE,
  FASTENER_SIZE_ATTRIBUTE,
  FASTENER_LENGTH_ATTRIBUTE,
]);

export const FASTENER_BOLT_TYPE_NAMES = Object.freeze([
  'پیچ شش‌گوش آچاری',
  'پیچ آلن با سر (استوانه‌ای)',
  'پیچ آلن سرتخت (خزینه)',
  'پیچ آلن مغزی',
  'پیچ متری',
  'استاد بولت (پیچ دو سر دنده)',
  'پیچ اطاقی',
]);

export const FASTENER_NUT_TYPE_NAMES = Object.freeze([
  'مهره شش‌گوش معمولی',
  'مهره شش‌گوش سنگین (صنعتی)',
  'مهره قفلی (کاسه نمدی)',
  'مهره واشردار',
  'مهره کاسه‌دار (گنبدی)',
  'مهره پروانه‌ای (خروسکی)',
  'مهره باریک (شش‌گوش نیم‌ارتفاع)',
]);

export const FASTENER_WASHER_TYPE_NAMES = Object.freeze([
  'واشر تخت معمولی',
  'واشر تخت پهن',
  'واشر فنری',
  'واشر ستاره‌ای (خورشیدی)',
  'واشر چهارگوش (مخصوص نبشی/تیرآهن)',
]);

export const FASTENER_ANCHOR_TYPE_NAMES = Object.freeze([
  'رول بولت غلافی معمولی',
  'رول بولت پروانه‌ای (مخصوص کناف)',
  'انکر بولت ال‌شکل (کاشت بتن)',
  'انکر بولت ضربه‌ای (تکه‌ای)',
  'رول بولت HSA / غلافی سنگین',
]);

export const FASTENER_SELF_DRILL_TYPE_NAMES = Object.freeze([
  'پیچ سرمته‌ای واشردار (شیروانی)',
  'پیچ سرمته‌ای سرتخت (خزینه)',
  'پیچ سرمته‌ای سرگرد (پانچی)',
  'پیچ سازه به سازه (نوک مته‌ای)',
]);

export const FASTENER_STAR_WASHER_TYPE_NAME = FASTENER_WASHER_TYPE_NAMES[3];

export const FASTENER_TYPE_NAMES = Object.freeze([
  ...FASTENER_BOLT_TYPE_NAMES,
  ...FASTENER_NUT_TYPE_NAMES,
  ...FASTENER_WASHER_TYPE_NAMES,
  ...FASTENER_ANCHOR_TYPE_NAMES,
  ...FASTENER_SELF_DRILL_TYPE_NAMES,
]);

export function normalizeFastenerName(value) {
  return String(value || '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200d]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sameFastenerName(a, b) {
  return normalizeFastenerName(a) === normalizeFastenerName(b);
}

const FAMILY_LISTS = Object.freeze([
  [FASTENER_FAMILY.bolt, FASTENER_BOLT_TYPE_NAMES],
  [FASTENER_FAMILY.nut, FASTENER_NUT_TYPE_NAMES],
  [FASTENER_FAMILY.washer, FASTENER_WASHER_TYPE_NAMES],
  [FASTENER_FAMILY.anchor, FASTENER_ANCHOR_TYPE_NAMES],
  [FASTENER_FAMILY.selfDrilling, FASTENER_SELF_DRILL_TYPE_NAMES],
]);

export function fastenerFamily(typeName) {
  const wanted = normalizeFastenerName(typeName);
  for (const [family, names] of FAMILY_LISTS) {
    if (names.some((name) => normalizeFastenerName(name) === wanted)) return family;
  }
  return null;
}

export function fastenerGradesForType(typeName) {
  const family = fastenerFamily(typeName);
  if (family === FASTENER_FAMILY.washer) return FASTENER_WASHER_GRADES;
  if (family === FASTENER_FAMILY.selfDrilling) return FASTENER_SELF_DRILL_GRADES;
  if (family === FASTENER_FAMILY.bolt
    || family === FASTENER_FAMILY.nut
    || family === FASTENER_FAMILY.anchor) {
    return FASTENER_GENERAL_GRADES;
  }
  return Object.freeze([]);
}

const GRADE_BINDING_FULL = Object.freeze({
  code: FASTENER_GRADE_CODE,
  isRequired: true,
  valueScope: 'PRODUCT',
  sortOrder: 10,
});

function gradeBinding(typeName) {
  const subset = fastenerGradesForType(typeName);
  if (subset.length && subset.length < FASTENER_GRADE_VALUES.length) {
    return Object.freeze({
      ...GRADE_BINDING_FULL,
      overrideAllowedValues: subset,
    });
  }
  return GRADE_BINDING_FULL;
}

const SIZE_BINDING = Object.freeze({
  code: FASTENER_SIZE_CODE,
  isRequired: true,
  valueScope: 'TRANSACTION',
  sortOrder: 20,
});

const LENGTH_BINDING = Object.freeze({
  code: FASTENER_LENGTH_CODE,
  isRequired: true,
  valueScope: 'TRANSACTION',
  sortOrder: 30,
  overrideMin: FASTENER_LENGTH_MIN_MM,
  overrideMax: FASTENER_LENGTH_MAX_MM,
});

const COATING_BINDING = Object.freeze({
  code: FASTENER_COATING_CODE,
  isRequired: false,
  valueScope: 'TRANSACTION',
  sortOrder: 40,
  overrideAllowedValues: COATING_KIND_VALUES,
});

const TOOTH_STYLE_BINDING = Object.freeze({
  code: FASTENER_TOOTH_STYLE_CODE,
  isRequired: false,
  valueScope: 'TRANSACTION',
  sortOrder: 50,
  overrideAllowedValues: TOOTH_KIND_VALUES,
});

export function fastenerBindingPlan(typeName) {
  const family = fastenerFamily(typeName);
  if (!family) throw new Error(`unknown fastener type: ${typeName}`);
  const plan = [gradeBinding(typeName), SIZE_BINDING];
  if (family === FASTENER_FAMILY.bolt
    || family === FASTENER_FAMILY.anchor
    || family === FASTENER_FAMILY.selfDrilling) {
    plan.push(LENGTH_BINDING);
  }
  if (family !== FASTENER_FAMILY.washer) {
    plan.push(COATING_BINDING);
  }
  if (sameFastenerName(typeName, FASTENER_STAR_WASHER_TYPE_NAME)) {
    plan.push(TOOTH_STYLE_BINDING);
  }
  return Object.freeze(plan);
}

export function fastenerIdentityRows(typeName) {
  return fastenerGradesForType(typeName).map((fastener_grade) => Object.freeze({ fastener_grade }));
}

export function fastenerCatalogRows() {
  return FASTENER_TYPE_NAMES.flatMap((typeName) => (
    fastenerIdentityRows(typeName).map((row) => Object.freeze({ typeName, ...row }))
  ));
}

export const FASTENER_CATALOG_PRODUCT_COUNT = fastenerCatalogRows().length;

export function fastenerDisplayNameRule({ gradeId } = {}) {
  return {
    separator: ' ',
    tokens: [
      { sourceType: 'type', includeLabel: false },
      gradeId
        ? {
          sourceType: 'attribute',
          attributeId: gradeId,
          includeLabel: false,
          includeUnit: false,
        }
        : null,
    ].filter(Boolean),
  };
}

export default {
  FASTENER_GROUP_NAME,
  FASTENER_TYPE_NAMES,
  FASTENER_GRADE_VALUES,
  FASTENER_ATTRIBUTE_SPECS,
  fastenerFamily,
  fastenerBindingPlan,
  fastenerIdentityRows,
  fastenerCatalogRows,
  fastenerDisplayNameRule,
};
