/**
 * Evaluate audience rules against a company projection row.
 */

import { CONDITION_OPERATOR } from './audienceCondition.operators';
import { getConditionDefinition } from './conditionRegistry';
import { RULE_COMBINATOR } from './audienceDefinition';

function readField(company, path) {
  if (!company || !path) return undefined;
  return company[path];
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asDateMs(value) {
  if (value == null || value === '') return null;
  const t = Date.parse(String(value));
  return Number.isNaN(t) ? null : t;
}

function textIncludes(haystack, needle) {
  if (needle == null || needle === '') return true;
  if (Array.isArray(haystack)) {
    return haystack.some((item) => textIncludes(item, needle));
  }
  return String(haystack || '').toLowerCase().includes(String(needle).toLowerCase());
}

function textEquals(haystack, needle) {
  if (Array.isArray(haystack)) {
    return haystack.some((item) => textEquals(item, needle));
  }
  return String(haystack || '').trim().toLowerCase() === String(needle || '').trim().toLowerCase();
}

/**
 * @param {object} company
 * @param {object} rule
 */
export function evaluateAudienceRule(company, rule) {
  if (!rule?.conditionId) return false;
  const def = getConditionDefinition(rule.conditionId);
  if (!def) return false;
  const raw = readField(company, def.fieldMapping);
  const op = rule.operator;
  const value = rule.value;

  if (def.id === 'orderCountInRange') {
    const dates = Array.isArray(raw) ? raw : [];
    const from = asDateMs(rule.rangeFrom);
    const to = asDateMs(rule.rangeTo);
    let count = dates.length;
    if (from != null || to != null) {
      count = dates.filter((item) => {
        const t = asDateMs(item);
        if (t == null) return false;
        if (from != null && t < from) return false;
        if (to != null && t > to) return false;
        return true;
      }).length;
    }
    if (op === CONDITION_OPERATOR.EQUALS) {
      return count === asNumber(value);
    }
    if (op === CONDITION_OPERATOR.GREATER_THAN) {
      const right = asNumber(value);
      return right != null && count > right;
    }
    if (op === CONDITION_OPERATOR.LESS_THAN) {
      const right = asNumber(value);
      return right != null && count < right;
    }
    if (op === CONDITION_OPERATOR.BETWEEN) {
      const bounds = Array.isArray(value) ? value : [value];
      const min = asNumber(bounds[0]);
      const max = asNumber(bounds[1]);
      if (min == null || max == null) return false;
      return count >= Math.min(min, max) && count <= Math.max(min, max);
    }
    return false;
  }

  if (op === CONDITION_OPERATOR.IN) {
    const list = Array.isArray(value) ? value : [value];
    if (Array.isArray(raw)) {
      return list.some((item) => raw.some((r) => textEquals(r, item) || textIncludes(r, item)));
    }
    return list.some((item) => textEquals(raw, item) || textIncludes(raw, item));
  }

  if (op === CONDITION_OPERATOR.CONTAINS) {
    return textIncludes(raw, value);
  }

  if (op === CONDITION_OPERATOR.EQUALS) {
    if (typeof value === 'boolean' || def.dataType === 'BOOLEAN') {
      return Boolean(raw) === Boolean(value);
    }
    if (def.dataType === 'NUMBER' || def.dataType === 'MONEY') {
      return asNumber(raw) === asNumber(value);
    }
    return textEquals(raw, value);
  }

  if (op === CONDITION_OPERATOR.GREATER_THAN) {
    const left = asNumber(raw);
    const right = asNumber(value);
    return left != null && right != null && left > right;
  }

  if (op === CONDITION_OPERATOR.LESS_THAN) {
    const left = asNumber(raw);
    const right = asNumber(value);
    return left != null && right != null && left < right;
  }

  if (op === CONDITION_OPERATOR.BETWEEN) {
    const bounds = Array.isArray(value) ? value : [value];
    if (def.dataType === 'DATE' || def.dataType === 'DATE_RANGE') {
      const t = asDateMs(raw);
      const a = asDateMs(bounds[0]);
      const b = asDateMs(bounds[1]);
      if (t == null || a == null || b == null) return false;
      return t >= Math.min(a, b) && t <= Math.max(a, b);
    }
    const left = asNumber(raw);
    const min = asNumber(bounds[0]);
    const max = asNumber(bounds[1]);
    if (left == null || min == null || max == null) return false;
    return left >= Math.min(min, max) && left <= Math.max(min, max);
  }

  if (op === CONDITION_OPERATOR.BEFORE) {
    const t = asDateMs(raw);
    const edge = asDateMs(Array.isArray(value) ? value[0] : value);
    return t != null && edge != null && t < edge;
  }

  if (op === CONDITION_OPERATOR.AFTER) {
    const t = asDateMs(raw);
    const edge = asDateMs(Array.isArray(value) ? value[0] : value);
    return t != null && edge != null && t > edge;
  }

  return false;
}

/**
 * @param {object} company
 * @param {object[]} rules
 * @param {string} combinator
 */
export function evaluateRuleList(company, rules, combinator = RULE_COMBINATOR.AND) {
  const list = Array.isArray(rules) ? rules : [];
  if (!list.length) return true;
  if (combinator === RULE_COMBINATOR.OR) {
    return list.some((rule) => evaluateAudienceRule(company, rule));
  }
  return list.every((rule) => evaluateAudienceRule(company, rule));
}

/**
 * Flat rules (AND) + optional groups with groupCombinator.
 * @param {object} company
 * @param {object} definition
 */
export function companyMatchesDefinition(company, definition) {
  if (!company || !definition) return false;
  const flatOk = evaluateRuleList(company, definition.rules || [], RULE_COMBINATOR.AND);
  if (!flatOk) return false;

  const groups = Array.isArray(definition.groups) ? definition.groups.filter((g) => g.rules?.length) : [];
  if (!groups.length) return true;

  const groupCombinator = definition.groupCombinator || RULE_COMBINATOR.AND;
  const results = groups.map((group) => (
    evaluateRuleList(company, group.rules, group.combinator || RULE_COMBINATOR.AND)
  ));
  if (groupCombinator === RULE_COMBINATOR.OR) {
    return results.some(Boolean);
  }
  return results.every(Boolean);
}
