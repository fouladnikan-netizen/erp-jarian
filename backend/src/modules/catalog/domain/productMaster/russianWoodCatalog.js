/**
 * Russian wood (چوب روسی) identity catalog.
 * Footboard identity is closed thickness_cm × width_cm × length (4|6 m
 * only — not free-cut TRANSACTION length). Plywood identity is mill thickness
 * only; 1220×2440 is Offer Variant on shared width/height, never SKU.
 * Domain JS is a mill helper — PostgreSQL remains SoR after seed.
 */
import {
  HEIGHT_CODE,
  LENGTH_M_CODE,
  THICKNESS_MM_CODE,
  WIDTH_CODE,
} from './attributeDedupMap.js';

export const RUSSIAN_WOOD_GROUP_NAME = 'چوب روسی';
export const RUSSIAN_WOOD_GROUP_NAME_LATIN = 'Russian Wood';
export const RUSSIAN_WOOD_GROUP_FALLBACK_NAMES = Object.freeze(['چوب']);

export const FOOTBOARD_CATEGORY_NAME = 'تخته زیرپایی';
export const FOOTBOARD_CATEGORY_NAME_LATIN = 'Scaffolding Footboards';
export const FOOTBOARD_TYPE_NAME = 'تخته زیرپایی روسی';
export const FOOTBOARD_TYPE_NAME_LATIN = 'Russian Scaffolding Footboard';

export const PLYWOOD_CATEGORY_NAME = 'تخته چندلایه';
export const PLYWOOD_CATEGORY_NAME_LATIN = 'Plywood';

export const PLYWOOD_TYPE_NAMES = Object.freeze([
  'تخته چندلایه معمولی',
  'تخته چندلایه ضد رطوبت',
  'تخته چندلایه ضد آب',
  'تخته چندلایه لاکی',
]);

export const PLYWOOD_TYPE_LATIN_BY_NAME = Object.freeze({
  'تخته چندلایه معمولی': 'Standard Plywood',
  'تخته چندلایه ضد رطوبت': 'Moisture-Resistant Plywood (MR)',
  'تخته چندلایه ضد آب': 'Waterproof / WBP Plywood',
  'تخته چندلایه لاکی': 'Film-Faced / Lacquered Formwork Plywood',
});

export const RUSSIAN_WOOD_TYPE_NAMES = Object.freeze([
  FOOTBOARD_TYPE_NAME,
  ...PLYWOOD_TYPE_NAMES,
]);

export const BOARD_THICKNESS_CM_CODE = 'board_thickness_cm';
export const BOARD_WIDTH_CM_CODE = 'board_width_cm';
export const BOARD_LENGTH_M_CODE = LENGTH_M_CODE;
export const PLYWOOD_THICKNESS_MM_CODE = THICKNESS_MM_CODE;
export const PLYWOOD_WIDTH_MM_CODE = WIDTH_CODE;
export const PLYWOOD_HEIGHT_MM_CODE = HEIGHT_CODE;

export const FOOTBOARD_THICKNESS_CM = 5;
export const FOOTBOARD_WIDTHS_CM = Object.freeze([20, 22, 25, 28, 30]);
export const FOOTBOARD_LENGTHS_M = Object.freeze([4, 6]);

export const PLYWOOD_THICKNESSES_MM = Object.freeze([
  3, 4, 5, 6, 8, 10, 12, 15, 18, 21, 25,
]);
export const PLYWOOD_SHEET_WIDTH_MM = 1220;
export const PLYWOOD_SHEET_HEIGHT_MM = 2440;

export const CM_UOM = Object.freeze({
  code: 'CM',
  nameFa: 'سانت',
  category: 'LENGTH',
});

export const LEGACY_EMPTY_CATEGORY_NAMES = Object.freeze([
  'چوب طبیعی',
  'فرآورده‌های چوبی',
]);

export const BOARD_THICKNESS_CM_ATTRIBUTE = Object.freeze({
  code: BOARD_THICKNESS_CM_CODE,
  skuCode: 'BTCM',
  nameFa: 'ضخامت',
  dataType: 'DECIMAL',
  uomCode: 'CM',
  minValue: FOOTBOARD_THICKNESS_CM,
  maxValue: FOOTBOARD_THICKNESS_CM,
});

export const BOARD_WIDTH_CM_ATTRIBUTE = Object.freeze({
  code: BOARD_WIDTH_CM_CODE,
  skuCode: 'BWCM',
  nameFa: 'عرض',
  dataType: 'DECIMAL',
  uomCode: 'CM',
  minValue: FOOTBOARD_WIDTHS_CM[0],
  maxValue: FOOTBOARD_WIDTHS_CM.at(-1),
});

export const BOARD_LENGTH_M_ATTRIBUTE = Object.freeze({
  code: BOARD_LENGTH_M_CODE,
  skuCode: 'BLNM',
  nameFa: 'طول',
  dataType: 'DECIMAL',
  uomCode: 'M',
  minValue: FOOTBOARD_LENGTHS_M[0],
  maxValue: FOOTBOARD_LENGTHS_M.at(-1),
});

export const PLYWOOD_THICKNESS_MM_ATTRIBUTE = Object.freeze({
  code: PLYWOOD_THICKNESS_MM_CODE,
  skuCode: 'PTMM',
  nameFa: 'ضخامت',
  dataType: 'DECIMAL',
  uomCode: 'MM',
  minValue: PLYWOOD_THICKNESSES_MM[0],
  maxValue: PLYWOOD_THICKNESSES_MM.at(-1),
});

export const PLYWOOD_WIDTH_MM_ATTRIBUTE = Object.freeze({
  code: PLYWOOD_WIDTH_MM_CODE,
  skuCode: 'PWMM',
  nameFa: 'عرض ورق',
  dataType: 'DECIMAL',
  uomCode: 'MM',
  minValue: PLYWOOD_SHEET_WIDTH_MM,
  maxValue: PLYWOOD_SHEET_WIDTH_MM,
});

export const PLYWOOD_HEIGHT_MM_ATTRIBUTE = Object.freeze({
  code: PLYWOOD_HEIGHT_MM_CODE,
  skuCode: 'PHMM',
  nameFa: 'ارتفاع ورق',
  dataType: 'DECIMAL',
  uomCode: 'MM',
  minValue: PLYWOOD_SHEET_HEIGHT_MM,
  maxValue: PLYWOOD_SHEET_HEIGHT_MM,
});

export const RUSSIAN_WOOD_ATTRIBUTE_SPECS = Object.freeze([
  BOARD_THICKNESS_CM_ATTRIBUTE,
  BOARD_WIDTH_CM_ATTRIBUTE,
]);

export const FOOTBOARD_IDENTITY_CODES = Object.freeze([
  BOARD_THICKNESS_CM_CODE,
  BOARD_WIDTH_CM_CODE,
  BOARD_LENGTH_M_CODE,
]);

export const FOOTBOARD_DEACTIVATE_CODES = Object.freeze([
  'sheet_length',
  'width',
  'height',
  'thickness',
  'board_length_m',
  'plywood_thickness_mm',
  'plywood_width_mm',
  'plywood_height_mm',
]);

export const PLYWOOD_DEACTIVATE_CODES = Object.freeze([
  'sheet_length',
  'length',
  'board_thickness_cm',
  'board_width_cm',
  'board_length_m',
  'plywood_thickness_mm',
  'plywood_width_mm',
  'plywood_height_mm',
]);

export const RUSSIAN_WOOD_MILL_LEFTOVER_CODES = FOOTBOARD_DEACTIVATE_CODES;

export const FOOTBOARD_FORBIDDEN_MASTER_CODES = Object.freeze([
  'sheet_length',
  'width',
  'height',
  'thickness',
]);

export const PLYWOOD_FORBIDDEN_MASTER_CODES = Object.freeze([
  PLYWOOD_WIDTH_MM_CODE,
  PLYWOOD_HEIGHT_MM_CODE,
  'sheet_length',
  'length',
  'board_length_m',
]);

export const RUSSIAN_WOOD_CATALOG_PRODUCT_COUNT = (
  FOOTBOARD_WIDTHS_CM.length * FOOTBOARD_LENGTHS_M.length
  + PLYWOOD_TYPE_NAMES.length * PLYWOOD_THICKNESSES_MM.length
);

export function isFootboardType(typeName) {
  return String(typeName || '') === FOOTBOARD_TYPE_NAME;
}

export function isPlywoodType(typeName) {
  return PLYWOOD_TYPE_NAMES.includes(String(typeName || ''));
}

export function isFootboardLengthM(value) {
  return FOOTBOARD_LENGTHS_M.includes(Number(value));
}

export function isFootboardWidthCm(value) {
  return FOOTBOARD_WIDTHS_CM.includes(Number(value));
}

export function isFootboardThicknessCm(value) {
  return Number(value) === FOOTBOARD_THICKNESS_CM;
}

export function isPlywoodThicknessMm(value) {
  return PLYWOOD_THICKNESSES_MM.includes(Number(value));
}

export function footboardIdentityRows() {
  const rows = [];
  for (const width of FOOTBOARD_WIDTHS_CM) {
    for (const length of FOOTBOARD_LENGTHS_M) {
      rows.push(Object.freeze({
        [BOARD_THICKNESS_CM_CODE]: FOOTBOARD_THICKNESS_CM,
        [BOARD_WIDTH_CM_CODE]: width,
        [BOARD_LENGTH_M_CODE]: length,
      }));
    }
  }
  return Object.freeze(rows);
}

export function plywoodIdentityRows() {
  return Object.freeze(
    PLYWOOD_THICKNESSES_MM.map((thickness) => Object.freeze({
      [PLYWOOD_THICKNESS_MM_CODE]: thickness,
    })),
  );
}

export function russianWoodIdentityRows(typeName) {
  if (isFootboardType(typeName)) return footboardIdentityRows();
  if (isPlywoodType(typeName)) return plywoodIdentityRows();
  return Object.freeze([]);
}

export function allRussianWoodIdentityRows() {
  const rows = [];
  for (const typeName of RUSSIAN_WOOD_TYPE_NAMES) {
    for (const row of russianWoodIdentityRows(typeName)) {
      rows.push(Object.freeze({ typeName, ...row }));
    }
  }
  return Object.freeze(rows);
}

export function russianWoodBindingPlan(typeName) {
  if (isFootboardType(typeName)) {
    return Object.freeze([
      Object.freeze({
        code: BOARD_THICKNESS_CM_CODE,
        isRequired: true,
        valueScope: 'PRODUCT',
        sortOrder: 10,
      }),
      Object.freeze({
        code: BOARD_WIDTH_CM_CODE,
        isRequired: true,
        valueScope: 'PRODUCT',
        sortOrder: 20,
      }),
      Object.freeze({
        code: BOARD_LENGTH_M_CODE,
        isRequired: true,
        valueScope: 'PRODUCT',
        sortOrder: 30,
      }),
    ]);
  }
  if (isPlywoodType(typeName)) {
    return Object.freeze([
      Object.freeze({
        code: PLYWOOD_THICKNESS_MM_CODE,
        isRequired: true,
        valueScope: 'PRODUCT',
        sortOrder: 10,
      }),
      Object.freeze({
        code: PLYWOOD_WIDTH_MM_CODE,
        isRequired: false,
        valueScope: 'TRANSACTION',
        overrideDefaultValue: String(PLYWOOD_SHEET_WIDTH_MM),
        sortOrder: 20,
      }),
      Object.freeze({
        code: PLYWOOD_HEIGHT_MM_CODE,
        isRequired: false,
        valueScope: 'TRANSACTION',
        overrideDefaultValue: String(PLYWOOD_SHEET_HEIGHT_MM),
        sortOrder: 30,
      }),
    ]);
  }
  return Object.freeze([]);
}

export function footboardDisplayNameRule({ thicknessId, widthId, lengthId } = {}) {
  return {
    separator: ' ',
    tokens: [
      { sourceType: 'type', includeLabel: false },
      thicknessId
        ? { sourceType: 'attribute', attributeId: thicknessId, includeLabel: false, includeUnit: true }
        : null,
      { sourceType: 'literal', literalId: 'times' },
      widthId
        ? { sourceType: 'attribute', attributeId: widthId, includeLabel: false, includeUnit: true }
        : null,
      { sourceType: 'literal', literalId: 'times' },
      lengthId
        ? { sourceType: 'attribute', attributeId: lengthId, includeLabel: false, includeUnit: true }
        : null,
    ].filter(Boolean),
  };
}

export function plywoodDisplayNameRule({ thicknessId, widthId, heightId } = {}) {
  return {
    separator: ' ',
    tokens: [
      { sourceType: 'type', includeLabel: false },
      thicknessId
        ? { sourceType: 'attribute', attributeId: thicknessId, includeLabel: true, includeUnit: true }
        : null,
      { sourceType: 'literal', literalId: 'dims' },
      widthId
        ? { sourceType: 'attribute', attributeId: widthId, includeLabel: false, includeUnit: true }
        : null,
      { sourceType: 'literal', literalId: 'times' },
      heightId
        ? { sourceType: 'attribute', attributeId: heightId, includeLabel: false, includeUnit: true }
        : null,
    ].filter(Boolean),
  };
}

export const RUSSIAN_WOOD_OFFER_UNITS = Object.freeze([
  Object.freeze({ typeName: FOOTBOARD_TYPE_NAME, countUnitFa: 'شاخه', salesUnitFa: 'شاخه' }),
  ...PLYWOOD_TYPE_NAMES.map((typeName) => Object.freeze({
    typeName,
    countUnitFa: 'برگ',
    salesUnitFa: 'برگ',
  })),
]);

export const RUSSIAN_WOOD_TAXONOMY = Object.freeze({
  groupName: RUSSIAN_WOOD_GROUP_NAME,
  groupNameLatin: RUSSIAN_WOOD_GROUP_NAME_LATIN,
  fallbackGroupNames: RUSSIAN_WOOD_GROUP_FALLBACK_NAMES,
  categories: Object.freeze([
    Object.freeze({
      name: FOOTBOARD_CATEGORY_NAME,
      nameLatin: FOOTBOARD_CATEGORY_NAME_LATIN,
      types: Object.freeze([
        Object.freeze({ name: FOOTBOARD_TYPE_NAME, nameLatin: FOOTBOARD_TYPE_NAME_LATIN }),
      ]),
    }),
    Object.freeze({
      name: PLYWOOD_CATEGORY_NAME,
      nameLatin: PLYWOOD_CATEGORY_NAME_LATIN,
      types: Object.freeze(
        PLYWOOD_TYPE_NAMES.map((name) => Object.freeze({
          name,
          nameLatin: PLYWOOD_TYPE_LATIN_BY_NAME[name],
        })),
      ),
    }),
  ]),
});

export default {
  RUSSIAN_WOOD_GROUP_NAME,
  RUSSIAN_WOOD_TYPE_NAMES,
  RUSSIAN_WOOD_CATALOG_PRODUCT_COUNT,
  footboardIdentityRows,
  plywoodIdentityRows,
  russianWoodIdentityRows,
  allRussianWoodIdentityRows,
  russianWoodBindingPlan,
};
