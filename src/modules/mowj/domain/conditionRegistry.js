/**
 * Audience condition registry — ERP-backed, no fake UI-only fields.
 * Mowj never owns customer data; each condition maps to a source module + field.
 *
 * Recipients are always Kanoon related persons.
 * Company / Nabz / Finance / Ofogh fields are segmentation criteria only.
 */

import { CONDITION_OPERATOR } from './audienceCondition.operators';
import { AUDIENCE_TARGET_LEVEL } from './audienceDefinition.levels';

export const CONDITION_CATEGORY = Object.freeze({
  CONTACT_PERSON: 'CONTACT_PERSON',
  COMPANY_BASE: 'COMPANY_BASE',
  PURCHASE_BEHAVIOR: 'PURCHASE_BEHAVIOR',
  FINANCIAL: 'FINANCIAL',
  ORGANIZATION_INTERACTION: 'ORGANIZATION_INTERACTION',
  /** @deprecated alias — use ORGANIZATION_INTERACTION */
  RELATIONSHIP: 'ORGANIZATION_INTERACTION',
  ORDER_BEHAVIOR: 'ORDER_BEHAVIOR',
  OFOGH: 'OFOGH',
});

export const CONDITION_CATEGORY_LABELS = Object.freeze({
  CONTACT_PERSON: 'اطلاعات شخص مرتبط',
  COMPANY_BASE: 'اطلاعات شرکت کانون',
  PURCHASE_BEHAVIOR: 'رفتار خرید نبض',
  FINANCIAL: 'وضعیت مالی',
  ORGANIZATION_INTERACTION: 'تعامل سازمانی',
  ORDER_BEHAVIOR: 'سفارش‌های نبض',
  OFOGH: 'افق',
});

export const CONDITION_SOURCE_MODULE = Object.freeze({
  KANOON: 'KANOON',
  KANOON_CONTACT_PERSON: 'KANOON_CONTACT_PERSON',
  NABZ: 'NABZ',
  FINANCE: 'FINANCE',
  POOYESH: 'POOYESH',
  GAHSHOMAR: 'GAHSHOMAR',
  OFOGH: 'OFOGH',
});

export const CONDITION_DATA_TYPE = Object.freeze({
  SELECT: 'SELECT',
  MULTI_SELECT: 'MULTI_SELECT',
  NUMBER: 'NUMBER',
  MONEY: 'MONEY',
  DATE: 'DATE',
  DATE_RANGE: 'DATE_RANGE',
  BOOLEAN: 'BOOLEAN',
  USER: 'USER',
  TEXT: 'TEXT',
});

/** All conditions apply to related-person audience projections. */
const PERSON_LEVEL = Object.freeze([AUDIENCE_TARGET_LEVEL.PERSON]);
/** @deprecated alias — company is never a recipient level */
const BOTH_LEVELS = PERSON_LEVEL;

/**
 * @typedef {object} AudienceConditionDefinition
 * @property {string} id
 * @property {string} label
 * @property {string} category
 * @property {string} source
 * @property {string} fieldMapping  path on company/person projection
 * @property {string} dataType
 * @property {string[]} allowedOperators
 * @property {string|null} valueProvider
 * @property {boolean} [includeAllOption]
 * @property {string[]} applicableLevels  COMPANY and/or PERSON
 */

/** @type {AudienceConditionDefinition[]} */
export const AUDIENCE_CONDITION_REGISTRY = Object.freeze([
  // —— Category 1: Kanoon company base ——
  {
    id: 'province',
    label: 'استان',
    category: CONDITION_CATEGORY.COMPANY_BASE,
    source: CONDITION_SOURCE_MODULE.KANOON,
    fieldMapping: 'province',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.EQUALS, CONDITION_OPERATOR.IN],
    valueProvider: 'provinces',
    includeAllOption: true,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'city',
    label: 'شهر',
    category: CONDITION_CATEGORY.COMPANY_BASE,
    source: CONDITION_SOURCE_MODULE.KANOON,
    fieldMapping: 'city',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.EQUALS, CONDITION_OPERATOR.IN],
    valueProvider: 'cities',
    includeAllOption: true,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'industry',
    label: 'حوزه صنعت',
    category: CONDITION_CATEGORY.COMPANY_BASE,
    source: CONDITION_SOURCE_MODULE.KANOON,
    fieldMapping: 'activityDomain',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.EQUALS, CONDITION_OPERATOR.IN],
    valueProvider: 'industries',
    includeAllOption: true,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'companyType',
    label: 'نوع شرکت',
    category: CONDITION_CATEGORY.COMPANY_BASE,
    source: CONDITION_SOURCE_MODULE.KANOON,
    fieldMapping: 'personType',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.EQUALS],
    valueProvider: 'companyTypes',
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'registeredCapital',
    label: 'سرمایه ثبت شده',
    category: CONDITION_CATEGORY.COMPANY_BASE,
    source: CONDITION_SOURCE_MODULE.KANOON,
    fieldMapping: 'registeredCapital',
    dataType: CONDITION_DATA_TYPE.MONEY,
    allowedOperators: [
      CONDITION_OPERATOR.GREATER_THAN,
      CONDITION_OPERATOR.LESS_THAN,
      CONDITION_OPERATOR.BETWEEN,
      CONDITION_OPERATOR.EQUALS,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'companyStatus',
    label: 'وضعیت شرکت',
    category: CONDITION_CATEGORY.COMPANY_BASE,
    source: CONDITION_SOURCE_MODULE.KANOON,
    fieldMapping: 'behavioralStatus',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.EQUALS, CONDITION_OPERATOR.IN],
    valueProvider: 'companyStatuses',
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'registeredAt',
    label: 'تاریخ ثبت در سیستم',
    category: CONDITION_CATEGORY.COMPANY_BASE,
    source: CONDITION_SOURCE_MODULE.KANOON,
    fieldMapping: 'createdAt',
    dataType: CONDITION_DATA_TYPE.DATE,
    allowedOperators: [
      CONDITION_OPERATOR.BEFORE,
      CONDITION_OPERATOR.AFTER,
      CONDITION_OPERATOR.BETWEEN,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'companyAgeDays',
    label: 'عمر شرکت در سازمان (روز)',
    category: CONDITION_CATEGORY.COMPANY_BASE,
    source: CONDITION_SOURCE_MODULE.KANOON,
    fieldMapping: 'companyAgeDays',
    dataType: CONDITION_DATA_TYPE.NUMBER,
    allowedOperators: [
      CONDITION_OPERATOR.GREATER_THAN,
      CONDITION_OPERATOR.LESS_THAN,
      CONDITION_OPERATOR.BETWEEN,
      CONDITION_OPERATOR.EQUALS,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'acquisitionSource',
    label: 'منبع جذب',
    category: CONDITION_CATEGORY.COMPANY_BASE,
    source: CONDITION_SOURCE_MODULE.KANOON,
    fieldMapping: 'leadSource',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.EQUALS, CONDITION_OPERATOR.IN, CONDITION_OPERATOR.CONTAINS],
    valueProvider: 'acquisitionSources',
    includeAllOption: true,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'relatedKnight',
    label: 'شوالیه مرتبط',
    category: CONDITION_CATEGORY.COMPANY_BASE,
    source: CONDITION_SOURCE_MODULE.KANOON,
    fieldMapping: 'relatedKnight',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.EQUALS, CONDITION_OPERATOR.IN, CONDITION_OPERATOR.CONTAINS],
    valueProvider: 'relatedKnights',
    includeAllOption: true,
    applicableLevels: PERSON_LEVEL,
  },

  // —— Category 2: Related persons (Kanoon ContactPerson) — PERSON target only ——
  {
    id: 'personGender',
    label: 'جنسیت',
    category: CONDITION_CATEGORY.CONTACT_PERSON,
    source: CONDITION_SOURCE_MODULE.KANOON_CONTACT_PERSON,
    fieldMapping: 'personGender',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.EQUALS, CONDITION_OPERATOR.IN],
    valueProvider: 'personGenders',
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'personPosition',
    label: 'سمت',
    category: CONDITION_CATEGORY.CONTACT_PERSON,
    source: CONDITION_SOURCE_MODULE.KANOON_CONTACT_PERSON,
    fieldMapping: 'personPosition',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.EQUALS, CONDITION_OPERATOR.IN, CONDITION_OPERATOR.CONTAINS],
    valueProvider: 'personPositions',
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'personRelationType',
    label: 'نوع ارتباط با شرکت',
    category: CONDITION_CATEGORY.CONTACT_PERSON,
    source: CONDITION_SOURCE_MODULE.KANOON_CONTACT_PERSON,
    fieldMapping: 'personRelationType',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.EQUALS, CONDITION_OPERATOR.IN],
    valueProvider: 'personRelationTypes',
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'personStatus',
    label: 'وضعیت شخص',
    category: CONDITION_CATEGORY.CONTACT_PERSON,
    source: CONDITION_SOURCE_MODULE.KANOON_CONTACT_PERSON,
    fieldMapping: 'personStatus',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.EQUALS, CONDITION_OPERATOR.IN],
    valueProvider: 'personStatuses',
    applicableLevels: PERSON_LEVEL,
  },

  // —— Category: سازمان و تعامل (Pooyesh / Gahshomar) ——
  {
    id: 'lastContactAt',
    label: 'آخرین تماس',
    category: CONDITION_CATEGORY.ORGANIZATION_INTERACTION,
    source: CONDITION_SOURCE_MODULE.POOYESH,
    fieldMapping: 'lastContactAt',
    dataType: CONDITION_DATA_TYPE.DATE,
    allowedOperators: [
      CONDITION_OPERATOR.BEFORE,
      CONDITION_OPERATOR.AFTER,
      CONDITION_OPERATOR.BETWEEN,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'lastActivityAt',
    label: 'آخرین فعالیت',
    category: CONDITION_CATEGORY.ORGANIZATION_INTERACTION,
    source: CONDITION_SOURCE_MODULE.POOYESH,
    fieldMapping: 'lastActivityAt',
    dataType: CONDITION_DATA_TYPE.DATE,
    allowedOperators: [
      CONDITION_OPERATOR.BEFORE,
      CONDITION_OPERATOR.AFTER,
      CONDITION_OPERATOR.BETWEEN,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'activityCount',
    label: 'تعداد فعالیت',
    category: CONDITION_CATEGORY.ORGANIZATION_INTERACTION,
    source: CONDITION_SOURCE_MODULE.POOYESH,
    fieldMapping: 'activityCount',
    dataType: CONDITION_DATA_TYPE.NUMBER,
    allowedOperators: [
      CONDITION_OPERATOR.GREATER_THAN,
      CONDITION_OPERATOR.LESS_THAN,
      CONDITION_OPERATOR.EQUALS,
      CONDITION_OPERATOR.BETWEEN,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'relationshipStatus',
    label: 'وضعیت ارتباط',
    category: CONDITION_CATEGORY.ORGANIZATION_INTERACTION,
    source: CONDITION_SOURCE_MODULE.POOYESH,
    fieldMapping: 'relationshipStatus',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.EQUALS, CONDITION_OPERATOR.IN],
    valueProvider: 'relationshipStatuses',
    applicableLevels: PERSON_LEVEL,
  },

  // —— Category: Purchase (Nabz) ——
  {
    id: 'orderCount',
    label: 'تعداد سفارش',
    category: CONDITION_CATEGORY.PURCHASE_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'orderCount',
    dataType: CONDITION_DATA_TYPE.NUMBER,
    allowedOperators: [
      CONDITION_OPERATOR.GREATER_THAN,
      CONDITION_OPERATOR.LESS_THAN,
      CONDITION_OPERATOR.EQUALS,
      CONDITION_OPERATOR.BETWEEN,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'totalPurchaseAmount',
    label: 'مبلغ کل خرید',
    category: CONDITION_CATEGORY.PURCHASE_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'totalPurchaseAmount',
    dataType: CONDITION_DATA_TYPE.MONEY,
    allowedOperators: [
      CONDITION_OPERATOR.GREATER_THAN,
      CONDITION_OPERATOR.LESS_THAN,
      CONDITION_OPERATOR.BETWEEN,
      CONDITION_OPERATOR.EQUALS,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'totalPurchaseWeight',
    label: 'وزن کل خرید',
    category: CONDITION_CATEGORY.PURCHASE_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'totalPurchaseWeight',
    dataType: CONDITION_DATA_TYPE.NUMBER,
    allowedOperators: [
      CONDITION_OPERATOR.GREATER_THAN,
      CONDITION_OPERATOR.LESS_THAN,
      CONDITION_OPERATOR.BETWEEN,
      CONDITION_OPERATOR.EQUALS,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'firstPurchaseAt',
    label: 'تاریخ اولین خرید',
    category: CONDITION_CATEGORY.PURCHASE_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'firstPurchaseAt',
    dataType: CONDITION_DATA_TYPE.DATE,
    allowedOperators: [
      CONDITION_OPERATOR.BEFORE,
      CONDITION_OPERATOR.AFTER,
      CONDITION_OPERATOR.BETWEEN,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'lastPurchaseAt',
    label: 'تاریخ آخرین خرید',
    category: CONDITION_CATEGORY.PURCHASE_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'lastPurchaseAt',
    dataType: CONDITION_DATA_TYPE.DATE,
    allowedOperators: [
      CONDITION_OPERATOR.BEFORE,
      CONDITION_OPERATOR.AFTER,
      CONDITION_OPERATOR.BETWEEN,
    ],
    valueProvider: 'relativeDatePresets',
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'purchaseInRange',
    label: 'خرید در بازه زمانی',
    category: CONDITION_CATEGORY.PURCHASE_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'lastPurchaseAt',
    dataType: CONDITION_DATA_TYPE.DATE_RANGE,
    allowedOperators: [CONDITION_OPERATOR.BETWEEN],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'purchasedProduct',
    label: 'محصول خریداری شده',
    category: CONDITION_CATEGORY.PURCHASE_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'purchasedProducts',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.CONTAINS, CONDITION_OPERATOR.IN],
    valueProvider: 'products',
    includeAllOption: true,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'purchasedBrand',
    label: 'برند خریداری شده',
    category: CONDITION_CATEGORY.PURCHASE_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'purchasedBrands',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.CONTAINS, CONDITION_OPERATOR.IN],
    valueProvider: 'brands',
    includeAllOption: true,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'orderCountInRange',
    label: 'تعداد سفارش در بازه زمانی',
    category: CONDITION_CATEGORY.PURCHASE_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'orderRegisteredDates',
    dataType: CONDITION_DATA_TYPE.NUMBER,
    allowedOperators: [
      CONDITION_OPERATOR.GREATER_THAN,
      CONDITION_OPERATOR.LESS_THAN,
      CONDITION_OPERATOR.EQUALS,
      CONDITION_OPERATOR.BETWEEN,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },

  // —— Category: Finance ——
  {
    id: 'isDebtor',
    label: 'بدهکار',
    category: CONDITION_CATEGORY.FINANCIAL,
    source: CONDITION_SOURCE_MODULE.FINANCE,
    fieldMapping: 'isDebtor',
    dataType: CONDITION_DATA_TYPE.BOOLEAN,
    allowedOperators: [CONDITION_OPERATOR.EQUALS],
    valueProvider: 'booleans',
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'isCreditor',
    label: 'بستانکار',
    category: CONDITION_CATEGORY.FINANCIAL,
    source: CONDITION_SOURCE_MODULE.FINANCE,
    fieldMapping: 'isCreditor',
    dataType: CONDITION_DATA_TYPE.BOOLEAN,
    allowedOperators: [CONDITION_OPERATOR.EQUALS],
    valueProvider: 'booleans',
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'accountBalance',
    label: 'مانده حساب',
    category: CONDITION_CATEGORY.FINANCIAL,
    source: CONDITION_SOURCE_MODULE.FINANCE,
    fieldMapping: 'accountBalance',
    dataType: CONDITION_DATA_TYPE.MONEY,
    allowedOperators: [
      CONDITION_OPERATOR.GREATER_THAN,
      CONDITION_OPERATOR.LESS_THAN,
      CONDITION_OPERATOR.BETWEEN,
      CONDITION_OPERATOR.EQUALS,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'debtAmount',
    label: 'مبلغ بدهی',
    category: CONDITION_CATEGORY.FINANCIAL,
    source: CONDITION_SOURCE_MODULE.FINANCE,
    fieldMapping: 'debtAmount',
    dataType: CONDITION_DATA_TYPE.MONEY,
    allowedOperators: [
      CONDITION_OPERATOR.GREATER_THAN,
      CONDITION_OPERATOR.LESS_THAN,
      CONDITION_OPERATOR.BETWEEN,
      CONDITION_OPERATOR.EQUALS,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'hasOverdue',
    label: 'سررسید گذشته',
    category: CONDITION_CATEGORY.FINANCIAL,
    source: CONDITION_SOURCE_MODULE.FINANCE,
    fieldMapping: 'hasOverdue',
    dataType: CONDITION_DATA_TYPE.BOOLEAN,
    allowedOperators: [CONDITION_OPERATOR.EQUALS],
    valueProvider: 'booleans',
    applicableLevels: PERSON_LEVEL,
  },

  // —— Category: Order behavior (Nabz) ——
  {
    id: 'orderStatus',
    label: 'وضعیت سفارش',
    category: CONDITION_CATEGORY.ORDER_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'orderStatuses',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.CONTAINS, CONDITION_OPERATOR.IN],
    valueProvider: 'orderStatuses',
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'deliveryDate',
    label: 'تاریخ تحویل',
    category: CONDITION_CATEGORY.ORDER_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'latestDeliveryAt',
    dataType: CONDITION_DATA_TYPE.DATE,
    allowedOperators: [
      CONDITION_OPERATOR.BEFORE,
      CONDITION_OPERATOR.AFTER,
      CONDITION_OPERATOR.BETWEEN,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'orderProduct',
    label: 'محصول سفارش',
    category: CONDITION_CATEGORY.ORDER_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'purchasedProducts',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.CONTAINS, CONDITION_OPERATOR.IN],
    valueProvider: 'products',
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'orderSupplier',
    label: 'تامین‌کننده',
    category: CONDITION_CATEGORY.ORDER_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'suppliers',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.CONTAINS, CONDITION_OPERATOR.IN],
    valueProvider: 'suppliers',
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'orderAmount',
    label: 'مبلغ سفارش',
    category: CONDITION_CATEGORY.ORDER_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'maxOrderAmount',
    dataType: CONDITION_DATA_TYPE.MONEY,
    allowedOperators: [
      CONDITION_OPERATOR.GREATER_THAN,
      CONDITION_OPERATOR.LESS_THAN,
      CONDITION_OPERATOR.BETWEEN,
      CONDITION_OPERATOR.EQUALS,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'orderWeight',
    label: 'وزن سفارش',
    category: CONDITION_CATEGORY.ORDER_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'maxOrderWeight',
    dataType: CONDITION_DATA_TYPE.NUMBER,
    allowedOperators: [
      CONDITION_OPERATOR.GREATER_THAN,
      CONDITION_OPERATOR.LESS_THAN,
      CONDITION_OPERATOR.BETWEEN,
      CONDITION_OPERATOR.EQUALS,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'openOrderCount',
    label: 'تعداد سفارش باز',
    category: CONDITION_CATEGORY.ORDER_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'openOrderCount',
    dataType: CONDITION_DATA_TYPE.NUMBER,
    allowedOperators: [
      CONDITION_OPERATOR.GREATER_THAN,
      CONDITION_OPERATOR.LESS_THAN,
      CONDITION_OPERATOR.EQUALS,
      CONDITION_OPERATOR.BETWEEN,
    ],
    valueProvider: null,
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'orderRegisteredAt',
    label: 'تاریخ تثبیت',
    category: CONDITION_CATEGORY.ORDER_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'lastPurchaseAt',
    dataType: CONDITION_DATA_TYPE.DATE,
    allowedOperators: [
      CONDITION_OPERATOR.BEFORE,
      CONDITION_OPERATOR.AFTER,
      CONDITION_OPERATOR.BETWEEN,
    ],
    valueProvider: 'relativeDatePresets',
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'hasOpenOrder',
    label: 'سفارش باز',
    category: CONDITION_CATEGORY.ORDER_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'hasOpenOrder',
    dataType: CONDITION_DATA_TYPE.BOOLEAN,
    allowedOperators: [CONDITION_OPERATOR.EQUALS],
    valueProvider: 'booleans',
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'hasSuccessfulOrder',
    label: 'سفارش موفق',
    category: CONDITION_CATEGORY.ORDER_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'hasSuccessfulOrder',
    dataType: CONDITION_DATA_TYPE.BOOLEAN,
    allowedOperators: [CONDITION_OPERATOR.EQUALS],
    valueProvider: 'booleans',
    applicableLevels: PERSON_LEVEL,
  },
  {
    id: 'hasFailedOrder',
    label: 'سفارش ناموفق',
    category: CONDITION_CATEGORY.ORDER_BEHAVIOR,
    source: CONDITION_SOURCE_MODULE.NABZ,
    fieldMapping: 'hasFailedOrder',
    dataType: CONDITION_DATA_TYPE.BOOLEAN,
    allowedOperators: [CONDITION_OPERATOR.EQUALS],
    valueProvider: 'booleans',
    applicableLevels: PERSON_LEVEL,
  },

  // —— Category: Ofogh ——
  {
    id: 'ofoghLeadSource',
    label: 'منبع شناسایی مشتری',
    category: CONDITION_CATEGORY.OFOGH,
    source: CONDITION_SOURCE_MODULE.OFOGH,
    fieldMapping: 'leadSource',
    dataType: CONDITION_DATA_TYPE.SELECT,
    allowedOperators: [CONDITION_OPERATOR.EQUALS, CONDITION_OPERATOR.IN, CONDITION_OPERATOR.CONTAINS],
    valueProvider: 'acquisitionSources',
    includeAllOption: true,
    applicableLevels: PERSON_LEVEL,
  },
]);

/** Removed from audience filters — account owner is not a campaign recipient attribute. */
export const REMOVED_AUDIENCE_CONDITION_IDS = Object.freeze([
  'relatedExpert',
  'relatedExpertGender',
]);

const BY_ID = Object.freeze(
  Object.fromEntries(AUDIENCE_CONDITION_REGISTRY.map((item) => [item.id, item])),
);

/** @param {string} id */
export function getConditionDefinition(id) {
  const key = String(id || '');
  if (REMOVED_AUDIENCE_CONDITION_IDS.includes(key)) return null;
  return BY_ID[key] || null;
}

/**
 * @param {string} [category]
 * @param {{ targetLevel?: string }} [options]
 */
export function listConditionDefinitions(category, options = {}) {
  let level = options.targetLevel
    ? String(options.targetLevel).toUpperCase()
    : null;
  if (level === AUDIENCE_TARGET_LEVEL.COMPANY) {
    level = AUDIENCE_TARGET_LEVEL.PERSON;
  }
  let rows = [...AUDIENCE_CONDITION_REGISTRY];
  if (category) {
    const cat = category === 'RELATIONSHIP'
      ? CONDITION_CATEGORY.ORGANIZATION_INTERACTION
      : category;
    rows = rows.filter((item) => item.category === cat);
  }
  if (level) {
    rows = rows.filter((item) => (
      !item.applicableLevels?.length
      || item.applicableLevels.includes(level)
      || item.applicableLevels.includes(AUDIENCE_TARGET_LEVEL.PERSON)
    ));
  }
  return rows;
}

/**
 * @param {{ targetLevel?: string }} [options]
 */
export function listConditionCategories(options = {}) {
  // Recipients are always related persons — all filter categories are available.
  const ids = [
    CONDITION_CATEGORY.CONTACT_PERSON,
    CONDITION_CATEGORY.COMPANY_BASE,
    CONDITION_CATEGORY.PURCHASE_BEHAVIOR,
    CONDITION_CATEGORY.FINANCIAL,
    CONDITION_CATEGORY.ORGANIZATION_INTERACTION,
    CONDITION_CATEGORY.ORDER_BEHAVIOR,
    CONDITION_CATEGORY.OFOGH,
  ];
  void options;
  return ids.map((id) => ({
    id,
    label: CONDITION_CATEGORY_LABELS[id] || id,
  }));
}

/**
 * @param {string} conditionId
 * @returns {string[]}
 */
export function listOperatorsForCondition(conditionId) {
  const def = getConditionDefinition(conditionId);
  return def ? [...def.allowedOperators] : [];
}

/**
 * @param {string} conditionId
 * @param {string} targetLevel
 */
export function isConditionApplicableToLevel(conditionId, targetLevel) {
  const def = getConditionDefinition(conditionId);
  if (!def) return false;
  // Legacy COMPANY target migrates to PERSON; treat as PERSON.
  const level = String(targetLevel || AUDIENCE_TARGET_LEVEL.PERSON).toUpperCase()
    === AUDIENCE_TARGET_LEVEL.COMPANY
    ? AUDIENCE_TARGET_LEVEL.PERSON
    : String(targetLevel || AUDIENCE_TARGET_LEVEL.PERSON).toUpperCase();
  if (!def.applicableLevels?.length) return true;
  return def.applicableLevels.includes(level)
    || def.applicableLevels.includes(AUDIENCE_TARGET_LEVEL.PERSON);
}
