/**
 * Audience condition operators (shared by registry + rules).
 */

export const CONDITION_OPERATOR = Object.freeze({
  EQUALS: 'EQUALS',
  CONTAINS: 'CONTAINS',
  GREATER_THAN: 'GREATER_THAN',
  LESS_THAN: 'LESS_THAN',
  IN: 'IN',
  BETWEEN: 'BETWEEN',
  BEFORE: 'BEFORE',
  AFTER: 'AFTER',
});

export const CONDITION_OPERATOR_LABELS = Object.freeze({
  EQUALS: 'برابر',
  CONTAINS: 'شامل',
  GREATER_THAN: 'بزرگ‌تر از',
  LESS_THAN: 'کوچک‌تر از',
  IN: 'در مجموعه',
  BETWEEN: 'بین',
  BEFORE: 'قبل از',
  AFTER: 'بعد از',
});

export const CONDITION_OPERATOR_SET = new Set(Object.values(CONDITION_OPERATOR));
