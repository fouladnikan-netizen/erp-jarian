/**
 * Audience condition helpers — registry-backed validation / normalization.
 */

import {
  CONDITION_OPERATOR,
  CONDITION_OPERATOR_LABELS,
  CONDITION_OPERATOR_SET,
} from './audienceCondition.operators';
import {
  getConditionDefinition,
  listConditionDefinitions,
  listOperatorsForCondition,
} from './conditionRegistry';
import { normalizeAudienceRule } from './audienceDefinition';

export {
  CONDITION_OPERATOR,
  CONDITION_OPERATOR_LABELS,
} from './audienceCondition.operators';

/** @deprecated Prefer condition registry ids */
export const AUDIENCE_CONDITION_FIELD = Object.freeze({
  CITY: 'city',
  INDUSTRY: 'industry',
  LAST_PURCHASE_MONTHS: 'lastPurchaseMonths',
  PRODUCT: 'product',
  TOTAL_AMOUNT: 'totalAmount',
  LEAD_SOURCE: 'leadSource',
  LIFECYCLE_STAGE: 'lifecycleStage',
  // aliases to registry
  PROVINCE: 'province',
  ORDER_COUNT: 'orderCount',
});

export const AUDIENCE_CONDITION_FIELD_LABELS = Object.freeze(
  Object.fromEntries(
    listConditionDefinitions().map((item) => [item.id, item.label]),
  ),
);

/** @deprecated COMPANY is the only source; registry lists all fields */
export const FIELDS_BY_SOURCE = Object.freeze({
  COMPANY: Object.freeze(listConditionDefinitions().map((item) => item.id)),
  CONTACT: Object.freeze(['province', 'industry', 'companyStatus']),
  CUSTOMER: Object.freeze(['province', 'industry', 'orderCount']),
  ORDER_BASED: Object.freeze(['purchasedProduct', 'totalPurchaseAmount']),
  LEAD: Object.freeze(['acquisitionSource', 'industry', 'province']),
});

/**
 * @param {string} fieldOrConditionId
 */
export function listOperatorsForField(fieldOrConditionId) {
  const ops = listOperatorsForCondition(fieldOrConditionId);
  if (ops.length) return ops;
  return Object.values(CONDITION_OPERATOR);
}

/**
 * @param {string} sourceType
 */
export function listFieldsForSource(sourceType) {
  const key = String(sourceType || 'COMPANY').toUpperCase();
  if (key === 'COMPANY' || !FIELDS_BY_SOURCE[key]) {
    return listConditionDefinitions().map((item) => item.id);
  }
  return [...FIELDS_BY_SOURCE[key]];
}

/**
 * @param {unknown} input
 * @param {{ sourceType?: string }} [options]
 */
export function validateAudienceCondition(input, options = {}) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['شرط نامعتبر است.'] };
  }

  const conditionId = String(input.conditionId || input.field || '').trim();
  const def = getConditionDefinition(conditionId);
  if (!def) {
    errors.push(`شرط ثبت‌نشده در رجیستری: ${conditionId || '—'}`);
    return { ok: false, errors };
  }

  const operator = String(input.operator || '').toUpperCase();
  if (!CONDITION_OPERATOR_SET.has(operator)) {
    errors.push(`عملگر نامعتبر: ${input.operator || '—'}`);
  } else if (!def.allowedOperators.includes(operator)) {
    errors.push(`عملگر ${operator} برای ${def.label} مجاز نیست.`);
  }

  if (operator === CONDITION_OPERATOR.IN) {
    if (!Array.isArray(input.value) || !input.value.length) {
      errors.push('عملگر IN نیاز به آرایهٔ غیرخالی دارد.');
    }
  } else if (operator === CONDITION_OPERATOR.BETWEEN) {
    if (!Array.isArray(input.value) || input.value.length !== 2) {
      if (input.valueTo == null && !Array.isArray(input.value)) {
        errors.push('عملگر BETWEEN نیاز به [min, max] دارد.');
      }
    }
  } else if (
    operator === CONDITION_OPERATOR.GREATER_THAN
    || operator === CONDITION_OPERATOR.LESS_THAN
  ) {
    if (!Number.isFinite(Number(input.value))) {
      errors.push(`عملگر ${operator} نیاز به مقدار عددی دارد.`);
    }
  } else if (def.dataType === 'BOOLEAN') {
    // ok
  } else if (input.value == null || String(input.value).trim() === '') {
    errors.push('مقدار شرط الزامی است.');
  }

  // sourceType COMPANY only in new model — ignore legacy mismatches after migrate
  void options;
  return { ok: errors.length === 0, errors };
}

/**
 * Normalize rule — accepts { conditionId } or legacy { field }.
 */
export function normalizeAudienceCondition(input = {}) {
  return normalizeAudienceRule({
    ...input,
    conditionId: input.conditionId || input.field,
  });
}

/**
 * @param {unknown[]} conditions
 * @param {{ sourceType?: string }} [options]
 */
export function validateAudienceConditions(conditions, options = {}) {
  if (!Array.isArray(conditions)) {
    return { ok: false, errors: ['شرایط باید آرایه باشند.'] };
  }
  const errors = [];
  conditions.forEach((cond, index) => {
    const check = validateAudienceCondition(cond, options);
    if (!check.ok) {
      errors.push(`شرط ${index + 1}: ${check.errors.join(' ')}`);
    }
  });
  return { ok: errors.length === 0, errors };
}
