/**
 * Compile legacy/flat conditions — prefer rules on AudienceDefinition directly.
 */

import {
  CONDITION_OPERATOR,
  normalizeAudienceCondition,
  validateAudienceConditions,
} from './audienceCondition';
import { normalizeAudienceFilters } from './audienceDefinition';

/**
 * @param {object[]} conditions
 * @returns {object}
 */
export function compileConditionsToFilters(conditions = []) {
  const filters = {};
  (Array.isArray(conditions) ? conditions : []).forEach((raw) => {
    const cond = normalizeAudienceCondition(raw);
    if (!cond) return;
    const field = cond.conditionId || cond.field;

    if (field === 'city' || field === 'province') {
      if (cond.operator === CONDITION_OPERATOR.IN) filters.cities = cond.value;
      else {
        filters.city = String(cond.value);
        filters.cityOperator = cond.operator;
      }
    } else if (field === 'industry') {
      if (cond.operator === CONDITION_OPERATOR.IN) filters.industries = cond.value;
      else filters.industry = String(cond.value);
    } else if (field === 'purchasedProduct' || field === 'product') {
      filters.productKeyword = String(cond.value);
    } else if (field === 'totalPurchaseAmount' || field === 'totalAmount') {
      if (cond.operator === CONDITION_OPERATOR.BETWEEN) {
        filters.totalAmountMin = Number(cond.value[0]);
        filters.totalAmountMax = Number(cond.value[1]);
      } else if (cond.operator === CONDITION_OPERATOR.GREATER_THAN) {
        filters.totalAmountMin = Number(cond.value);
      } else if (cond.operator === CONDITION_OPERATOR.LESS_THAN) {
        filters.totalAmountMax = Number(cond.value);
      }
    } else if (field === 'acquisitionSource' || field === 'leadSource') {
      filters.leadSource = String(cond.value);
    }
  });
  return normalizeAudienceFilters(filters);
}

/**
 * @param {object[]} conditions
 * @param {string} sourceType
 */
export function compileAndValidateConditions(conditions, sourceType) {
  const check = validateAudienceConditions(conditions, { sourceType });
  if (!check.ok) return { ok: false, errors: check.errors };
  return {
    ok: true,
    filters: compileConditionsToFilters(conditions),
  };
}
