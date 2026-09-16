/**
 * AudienceDefinition — ERP segmentation rules (no Mowj-owned customer data).
 *
 * B2B: recipients are always Kanoon related persons.
 * Company / Nabz / Finance / Ofogh fields are filter criteria only.
 *
 * {
 *   targetLevel: PERSON,
 *   source: KANOON_PERSON,
 *   rules: dynamic registry conditions,
 * }
 */

import { createEntityId, ENTITY_ID_PREFIX } from '../../../domain/identity';
import {
  getConditionDefinition,
  isConditionApplicableToLevel,
  REMOVED_AUDIENCE_CONDITION_IDS,
} from './conditionRegistry';
import {
  CONDITION_OPERATOR,
  CONDITION_OPERATOR_SET,
} from './audienceCondition.operators';
import {
  AUDIENCE_TARGET_LEVEL,
  AUDIENCE_TARGET_LEVEL_LABELS,
  AUDIENCE_SOURCE_TYPE,
  normalizeAudienceTargetLevel,
  normalizeAudienceSource,
  resolveAudienceSourceAndLevel,
  audienceSourceForTargetLevel,
  isCanonicalAudienceSource,
} from './audienceDefinition.levels';

export {
  AUDIENCE_TARGET_LEVEL,
  AUDIENCE_TARGET_LEVEL_LABELS,
  AUDIENCE_TARGET_LEVEL_HINTS,
  AUDIENCE_SOURCE_TYPE,
  AUDIENCE_SOURCE_TYPE_LABELS,
  AUDIENCE_CANONICAL_SOURCES,
  normalizeAudienceTargetLevel,
  normalizeAudienceSource,
  resolveAudienceSourceAndLevel,
  audienceSourceForTargetLevel,
  audienceTargetLevelForSource,
  isCanonicalAudienceSource,
} from './audienceDefinition.levels';

/** @deprecated use AUDIENCE_SOURCE_TYPE.KANOON_PERSON */
export const AUDIENCE_ROOT = AUDIENCE_SOURCE_TYPE.KANOON_PERSON;

/**
 * Base selection before condition groups (applied on related-person projections).
 * ALL / WITH_ORDERS / WITHOUT_ORDERS need no rules.
 * MATCHING_CONDITIONS uses rules/groups.
 */
export const AUDIENCE_BASE_SELECTION = Object.freeze({
  ALL_COMPANIES: 'ALL_COMPANIES',
  WITH_ORDERS: 'WITH_ORDERS',
  WITHOUT_ORDERS: 'WITHOUT_ORDERS',
  MATCHING_CONDITIONS: 'MATCHING_CONDITIONS',
});

export const AUDIENCE_BASE_SELECTION_LABELS = Object.freeze({
  ALL_COMPANIES: 'همه افراد مرتبط کانون',
  WITH_ORDERS: 'افراد شرکت‌های دارای سفارش',
  WITHOUT_ORDERS: 'افراد شرکت‌های بدون سفارش',
  MATCHING_CONDITIONS: 'افراد مطابق شرط‌ها',
});

export const RULE_COMBINATOR = Object.freeze({
  AND: 'AND',
  OR: 'OR',
});

const BASE_SET = new Set(Object.values(AUDIENCE_BASE_SELECTION));
const COMBINATOR_SET = new Set(Object.values(RULE_COMBINATOR));

/**
 * @typedef {object} AudienceRule
 * @property {string} id
 * @property {string} conditionId  registry id
 * @property {string} operator
 * @property {unknown} value
 */

/**
 * @typedef {object} AudienceRuleGroup
 * @property {string} id
 * @property {string} combinator  AND | OR
 * @property {AudienceRule[]} rules
 */

/**
 * @typedef {object} AudienceDefinition
 * @property {string} id
 * @property {string} name
 * @property {string} targetLevel  PERSON (legacy COMPANY migrates)
 * @property {string} source  KANOON_PERSON
 * @property {string} baseSelection
 * @property {AudienceRule[]} rules  dynamic registry conditions
 * @property {AudienceRuleGroup[]} groups  architecture-ready AND/OR groups
 * @property {string} groupCombinator  how groups combine
 * @property {number|null} estimatedCount
 * @property {object} filters  legacy compiled filters (compat)
 * @property {string} [sourceType]  alias of source
 * @property {string} createdAt
 */

/**
 * @param {unknown} input
 * @returns {AudienceRule|null}
 */
export function normalizeAudienceRule(input = {}) {
  const conditionId = String(input.conditionId || input.field || '').trim();
  if (REMOVED_AUDIENCE_CONDITION_IDS.includes(conditionId)) return null;
  const def = getConditionDefinition(conditionId);
  if (!def) return null;
  const operator = String(input.operator || '').toUpperCase();
  if (!CONDITION_OPERATOR_SET.has(operator)) return null;
  if (!def.allowedOperators.includes(operator)) return null;

  let value = input.value;
  if (operator === CONDITION_OPERATOR.IN) {
    value = Array.isArray(value)
      ? value.map((item) => String(item).trim()).filter(Boolean)
      : String(value || '').split(/[,،]/).map((s) => s.trim()).filter(Boolean);
  } else if (
    operator === CONDITION_OPERATOR.BETWEEN
    || operator === CONDITION_OPERATOR.BEFORE
    || operator === CONDITION_OPERATOR.AFTER
  ) {
    if (def.dataType === 'DATE' || def.dataType === 'DATE_RANGE') {
      value = Array.isArray(value)
        ? value.map((item) => String(item))
        : [String(value ?? ''), String(input.valueTo ?? '')].filter(Boolean);
      if (operator === CONDITION_OPERATOR.BETWEEN && value.length !== 2) {
        value = [String(value[0] || ''), String(input.valueTo || value[1] || '')];
      }
    } else {
      value = Array.isArray(value)
        ? [Number(value[0]), Number(value[1])]
        : [Number(value), Number(input.valueTo)];
    }
  } else if (
    operator === CONDITION_OPERATOR.GREATER_THAN
    || operator === CONDITION_OPERATOR.LESS_THAN
    || def.dataType === 'NUMBER'
    || def.dataType === 'MONEY'
  ) {
    if (def.dataType === 'BOOLEAN') {
      value = value === true || value === 'true' || value === '1' || value === 1;
    } else if (def.dataType !== 'SELECT' && def.dataType !== 'USER' && def.dataType !== 'TEXT') {
      value = Number(value);
    } else {
      value = String(value ?? '').trim();
    }
  } else if (def.dataType === 'BOOLEAN') {
    value = value === true || value === 'true' || value === '1' || value === 1;
  } else {
    value = String(value ?? '').trim();
  }

  // «همه» sentinel — treat as no restriction for that rule
  if (value === '__ALL__' || value === 'ALL' || value === '*') {
    return null;
  }

  const normalized = {
    id: input.id != null && input.id !== '' ? String(input.id) : `rule-${conditionId}`,
    conditionId: def.id,
    operator,
    value,
  };

  if (def.id === 'orderCountInRange') {
    const rangeFrom = input.rangeFrom != null ? String(input.rangeFrom) : '';
    const rangeTo = input.rangeTo != null ? String(input.rangeTo) : '';
    if (rangeFrom) normalized.rangeFrom = rangeFrom;
    if (rangeTo) normalized.rangeTo = rangeTo;
  }

  return normalized;
}

/**
 * @param {unknown} input
 * @returns {AudienceRuleGroup|null}
 */
export function normalizeAudienceRuleGroup(input = {}) {
  const combinatorRaw = String(input.combinator || RULE_COMBINATOR.AND).toUpperCase();
  const combinator = COMBINATOR_SET.has(combinatorRaw) ? combinatorRaw : RULE_COMBINATOR.AND;
  const rules = (Array.isArray(input.rules) ? input.rules : [])
    .map((row) => normalizeAudienceRule(row))
    .filter(Boolean);
  return {
    id: input.id != null && input.id !== '' ? String(input.id) : createEntityId(ENTITY_ID_PREFIX.CAMPAIGN, 'grp'),
    combinator,
    rules,
  };
}

/**
 * Migrate legacy condition { field, operator, value } → registry rule.
 * @param {object} cond
 */
export function migrateLegacyConditionToRule(cond) {
  if (!cond || typeof cond !== 'object') return null;
  if (cond.conditionId) return normalizeAudienceRule(cond);
  const field = String(cond.field || '').trim();
  const map = {
    city: 'province',
    industry: 'industry',
    lastPurchaseMonths: 'orderCount',
    product: 'purchasedProduct',
    totalAmount: 'totalPurchaseAmount',
    leadSource: 'acquisitionSource',
    lifecycleStage: 'companyStatus',
  };
  const conditionId = map[field] || field;
  return normalizeAudienceRule({
    ...cond,
    conditionId,
    operator: cond.operator,
    value: cond.value,
  });
}

/**
 * @param {object} input
 * @returns {object}
 */
/**
 * Map legacy filter bag → registry rules (best-effort, no fake fields).
 * @param {object} filters
 * @returns {AudienceRule[]}
 */
export function migrateLegacyFiltersToRules(filters = {}) {
  if (!filters || typeof filters !== 'object') return [];
  /** @type {AudienceRule[]} */
  const rules = [];
  if (filters.productKeyword) {
    const rule = normalizeAudienceRule({
      conditionId: 'purchasedProduct',
      operator: CONDITION_OPERATOR.CONTAINS,
      value: String(filters.productKeyword),
    });
    if (rule) rules.push(rule);
  }
  if (filters.leadSource) {
    const rule = normalizeAudienceRule({
      conditionId: 'acquisitionSource',
      operator: CONDITION_OPERATOR.EQUALS,
      value: String(filters.leadSource),
    });
    if (rule) rules.push(rule);
  }
  if (filters.city || filters.province) {
    const rule = normalizeAudienceRule({
      conditionId: filters.province ? 'province' : 'city',
      operator: CONDITION_OPERATOR.EQUALS,
      value: String(filters.province || filters.city),
    });
    if (rule) rules.push(rule);
  }
  if (filters.industry || filters.activityDomain) {
    const rule = normalizeAudienceRule({
      conditionId: 'industry',
      operator: CONDITION_OPERATOR.EQUALS,
      value: String(filters.industry || filters.activityDomain),
    });
    if (rule) rules.push(rule);
  }
  return rules;
}

export function migrateLegacyAudienceInput(input = {}) {
  if (!input || typeof input !== 'object') return input;

  const { source, targetLevel } = resolveAudienceSourceAndLevel(input);
  const alreadyCanonical = isCanonicalAudienceSource(input.source || input.sourceType)
    && Array.isArray(input.rules);

  if (alreadyCanonical && input.targetLevel) {
    return {
      ...input,
      source,
      sourceType: source,
      targetLevel,
    };
  }

  const legacySource = String(input.sourceType || input.source || '').toUpperCase();
  let baseSelection = AUDIENCE_BASE_SELECTION.ALL_COMPANIES;
  if (legacySource === 'ORDER_BASED' || legacySource === 'OFOGH_LEADS') {
    baseSelection = legacySource === 'ORDER_BASED'
      ? AUDIENCE_BASE_SELECTION.WITH_ORDERS
      : AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS;
  } else if (['CONTACT', 'CUSTOMER', 'LEAD', 'COMPANY'].includes(legacySource)) {
    baseSelection = AUDIENCE_BASE_SELECTION.ALL_COMPANIES;
  }

  const legacyConditions = Array.isArray(input.conditions) ? input.conditions : [];
  const fromConditions = legacyConditions.map(migrateLegacyConditionToRule).filter(Boolean);
  const fromFilters = migrateLegacyFiltersToRules(input.filters);
  const rules = [...fromConditions, ...fromFilters];

  if (rules.length && baseSelection === AUDIENCE_BASE_SELECTION.ALL_COMPANIES) {
    baseSelection = AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS;
  }

  return {
    ...input,
    source,
    sourceType: source,
    targetLevel,
    baseSelection: input.baseSelection || (
      rules.length && baseSelection === AUDIENCE_BASE_SELECTION.ALL_COMPANIES
        ? AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS
        : baseSelection
    ),
    rules: Array.isArray(input.rules) && input.rules.length
      ? input.rules
      : rules,
    groups: Array.isArray(input.groups) ? input.groups : [],
  };
}

/**
 * @param {unknown} input
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateAudienceDefinition(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['تعریف مخاطب نامعتبر است.'] };
  }
  const name = String(input.name || '').trim();
  if (!name) errors.push('نام مخاطب الزامی است.');

  const { source, targetLevel } = resolveAudienceSourceAndLevel(input);
  const rawSource = String(input.source || input.sourceType || '').toUpperCase();
  if (
    rawSource
    && !isCanonicalAudienceSource(rawSource)
    && !['CONTACT', 'CUSTOMER', 'LEAD', 'ORDER_BASED', 'COMPANY', 'PERSON'].includes(rawSource)
  ) {
    errors.push(`منبع نامعتبر: ${input.source || input.sourceType || '—'}`);
  }

  if (source !== audienceSourceForTargetLevel(targetLevel)) {
    errors.push('منبع و سطح مخاطب هم‌خوان نیستند.');
  }

  const base = String(input.baseSelection || AUDIENCE_BASE_SELECTION.ALL_COMPANIES).toUpperCase();
  if (!BASE_SET.has(base)) {
    errors.push(`انتخاب پایه نامعتبر: ${input.baseSelection || '—'}`);
  }

  const allRules = [
    ...(Array.isArray(input.rules) ? input.rules : []),
    ...(Array.isArray(input.groups) ? input.groups : []).flatMap((g) => (
      Array.isArray(g?.rules) ? g.rules : []
    )),
  ];
  allRules.forEach((rule) => {
    const conditionId = rule?.conditionId || rule?.field;
    if (!conditionId) return;
    if (REMOVED_AUDIENCE_CONDITION_IDS.includes(String(conditionId))) {
      errors.push(`شرط «${conditionId}» دیگر برای مخاطب کمپین مجاز نیست.`);
      return;
    }
    if (!isConditionApplicableToLevel(conditionId, AUDIENCE_TARGET_LEVEL.PERSON)) {
      errors.push(`شرط برای مخاطب افراد مرتبط نامعتبر است: ${conditionId}`);
    }
  });

  if (base === AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS) {
    const rules = Array.isArray(input.rules) ? input.rules : [];
    const groups = Array.isArray(input.groups) ? input.groups : [];
    const groupRules = groups.flatMap((g) => (Array.isArray(g?.rules) ? g.rules : []));
    if (!rules.length && !groupRules.length) {
      errors.push('برای «مطابق شرط‌ها» حداقل یک شرط لازم است.');
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * @param {object} input
 * @returns {AudienceDefinition|null}
 */
export function normalizeAudienceDefinition(input = {}) {
  const migrated = migrateLegacyAudienceInput(input);
  const name = String(migrated.name || migrated.label || '').trim() || 'مخاطب تعریف‌نشده';
  const baseRaw = String(
    migrated.baseSelection || AUDIENCE_BASE_SELECTION.ALL_COMPANIES,
  ).toUpperCase();
  const baseSelection = BASE_SET.has(baseRaw)
    ? baseRaw
    : AUDIENCE_BASE_SELECTION.ALL_COMPANIES;

  const rules = (Array.isArray(migrated.rules) ? migrated.rules : [])
    .map((row) => normalizeAudienceRule(row))
    .filter(Boolean);

  const groups = (Array.isArray(migrated.groups) ? migrated.groups : [])
    .map((row) => normalizeAudienceRuleGroup(row))
    .filter(Boolean);

  const groupCombinatorRaw = String(migrated.groupCombinator || RULE_COMBINATOR.AND).toUpperCase();
  const groupCombinator = COMBINATOR_SET.has(groupCombinatorRaw)
    ? groupCombinatorRaw
    : RULE_COMBINATOR.AND;

  const estimatedRaw = migrated.estimatedCount;
  const estimatedCount = estimatedRaw == null || estimatedRaw === ''
    ? null
    : (Number.isFinite(Number(estimatedRaw)) ? Math.max(0, Math.floor(Number(estimatedRaw))) : null);

  const { source, targetLevel } = resolveAudienceSourceAndLevel(migrated);
  const nowIso = new Date().toISOString();

  return {
    id: migrated.id != null && migrated.id !== ''
      ? String(migrated.id)
      : createEntityId(ENTITY_ID_PREFIX.CAMPAIGN, 'aud'),
    name,
    targetLevel,
    source,
    sourceType: source,
    baseSelection,
    rules,
    groups,
    groupCombinator,
    estimatedCount,
    filters: migrated.filters && typeof migrated.filters === 'object' ? { ...migrated.filters } : {},
    createdAt: migrated.createdAt || nowIso,
  };
}

/**
 * @param {Partial<AudienceDefinition>} [partial]
 */
export function createAudienceDefinition(partial = {}) {
  const { source, targetLevel } = resolveAudienceSourceAndLevel(partial);
  return normalizeAudienceDefinition({
    name: 'مخاطب جدید',
    source,
    targetLevel,
    baseSelection: AUDIENCE_BASE_SELECTION.ALL_COMPANIES,
    rules: [],
    groups: [],
    ...partial,
    source,
    targetLevel,
  });
}

/**
 * @param {AudienceDefinition} definition
 */
export function formatAudienceRule(definition) {
  if (!definition) return '—';
  const base = AUDIENCE_BASE_SELECTION_LABELS[definition.baseSelection]
    || definition.baseSelection
    || AUDIENCE_BASE_SELECTION_LABELS.ALL_COMPANIES;
  const rules = definition.rules || [];
  const groups = definition.groups || [];
  if (
    definition.baseSelection !== AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS
    && !rules.length
    && !groups.some((g) => g.rules?.length)
  ) {
    return base;
  }
  const parts = [base];
  rules.forEach((rule) => {
    const def = getConditionDefinition(rule.conditionId);
    parts.push(`${def?.label || rule.conditionId} ${rule.operator} ${formatRuleValue(rule.value)}`);
  });
  groups.forEach((group) => {
    if (!group.rules?.length) return;
    const inner = group.rules
      .map((rule) => {
        const def = getConditionDefinition(rule.conditionId);
        return `${def?.label || rule.conditionId} ${rule.operator} ${formatRuleValue(rule.value)}`;
      })
      .join(` ${group.combinator || 'AND'} `);
    parts.push(`(${inner})`);
  });
  return parts.join(' · ');
}

function formatRuleValue(value) {
  if (Array.isArray(value)) return value.join('، ');
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  return String(value ?? '—');
}

/** @deprecated legacy filter bag — prefer rules */
export function normalizeAudienceFilters(filters = {}) {
  if (!filters || typeof filters !== 'object') return {};
  return { ...filters };
}
