/**
 * Canonical Customer Lifecycle keys (Ofogh Kanban / companies.lifecycle_stage).
 * Persian labels are display-only — never persist Persian as SSOT.
 */

export const CUSTOMER_LIFECYCLE = Object.freeze({
  COLD_LEAD: 'cold_lead', // نوپدید
  PITCHED: 'pitched', // دیدار
  NURTURING: 'nurturing', // رویش
  SALES_QUALIFIED: 'sales_qualified', // آستانه
  FIRST_TIME_BUYER: 'first_time_buyer', // نوپیمان
  LOYAL: 'loyal', // هم‌پیمان
});

/** Kanban columns — excludes legacy `archived` (سایه is engagement, not lifecycle). */
export const CUSTOMER_LIFECYCLE_ORDER = Object.freeze([
  CUSTOMER_LIFECYCLE.COLD_LEAD,
  CUSTOMER_LIFECYCLE.PITCHED,
  CUSTOMER_LIFECYCLE.NURTURING,
  CUSTOMER_LIFECYCLE.SALES_QUALIFIED,
  CUSTOMER_LIFECYCLE.FIRST_TIME_BUYER,
  CUSTOMER_LIFECYCLE.LOYAL,
]);

export const CUSTOMER_LIFECYCLE_LABELS_FA = Object.freeze({
  [CUSTOMER_LIFECYCLE.COLD_LEAD]: 'نوپدید',
  [CUSTOMER_LIFECYCLE.PITCHED]: 'دیدار',
  [CUSTOMER_LIFECYCLE.NURTURING]: 'رویش',
  [CUSTOMER_LIFECYCLE.SALES_QUALIFIED]: 'آستانه',
  [CUSTOMER_LIFECYCLE.FIRST_TIME_BUYER]: 'نوپیمان',
  [CUSTOMER_LIFECYCLE.LOYAL]: 'هم‌پیمان',
});

/** Stages where Forgotten (30d inactivity) applies. */
export const FORGOTTEN_ELIGIBLE = Object.freeze([
  CUSTOMER_LIFECYCLE.COLD_LEAD,
  CUSTOMER_LIFECYCLE.PITCHED,
  CUSTOMER_LIFECYCLE.NURTURING,
]);

/** Stages where Shadow (90d no new order) applies. */
export const SHADOW_ELIGIBLE = Object.freeze([
  CUSTOMER_LIFECYCLE.SALES_QUALIFIED,
  CUSTOMER_LIFECYCLE.FIRST_TIME_BUYER,
  CUSTOMER_LIFECYCLE.LOYAL,
]);

export const ENGAGEMENT = Object.freeze({
  NORMAL: 'normal',
  FORGOTTEN: 'forgotten',
  SHADOW: 'shadow',
});

export const ENGAGEMENT_LABELS_FA = Object.freeze({
  [ENGAGEMENT.NORMAL]: 'عادی',
  [ENGAGEMENT.FORGOTTEN]: 'فراموش‌شده',
  [ENGAGEMENT.SHADOW]: 'سایه',
});

export const FORGOTTEN_DAYS = 30;
export const SHADOW_DAYS = 90;

/** Activity type id for catalog delivery (Pooyesh / Ofogh). */
export const CATALOG_ACTIVITY_TYPE = 'catalog';

const PERSIAN_OR_ALIAS_TO_KEY = Object.freeze({
  نوپدید: CUSTOMER_LIFECYCLE.COLD_LEAD,
  دیدار: CUSTOMER_LIFECYCLE.PITCHED,
  رویش: CUSTOMER_LIFECYCLE.NURTURING,
  آستانه: CUSTOMER_LIFECYCLE.SALES_QUALIFIED,
  نوپیمان: CUSTOMER_LIFECYCLE.FIRST_TIME_BUYER,
  هم‌پیمان: CUSTOMER_LIFECYCLE.LOYAL,
  همپیمان: CUSTOMER_LIFECYCLE.LOYAL,
  سایه: null, // engagement — not a lifecycle key
  NOPODID: CUSTOMER_LIFECYCLE.COLD_LEAD,
  DIDAR: CUSTOMER_LIFECYCLE.PITCHED,
  ROYESH: CUSTOMER_LIFECYCLE.NURTURING,
  ASTANE: CUSTOMER_LIFECYCLE.SALES_QUALIFIED,
  NOPAYMAN: CUSTOMER_LIFECYCLE.FIRST_TIME_BUYER,
  HAMPAYMAN: CUSTOMER_LIFECYCLE.LOYAL,
  SAYEH: null,
  archived: null,
});

/**
 * Normalize stored lifecycle_stage to canonical English key.
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
export function normalizeLifecycleKey(value) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (CUSTOMER_LIFECYCLE_ORDER.includes(raw)) return raw;
  if (Object.prototype.hasOwnProperty.call(PERSIAN_OR_ALIAS_TO_KEY, raw)) {
    return PERSIAN_OR_ALIAS_TO_KEY[raw];
  }
  return null;
}

export function lifecycleRank(key) {
  const idx = CUSTOMER_LIFECYCLE_ORDER.indexOf(key);
  return idx < 0 ? -1 : idx;
}

/**
 * Advance-only merge: never move lifecycle backward.
 * @param {string|null} current
 * @param {string|null} proposed
 */
export function maxLifecycle(current, proposed) {
  const a = normalizeLifecycleKey(current);
  const b = normalizeLifecycleKey(proposed);
  if (!a) return b;
  if (!b) return a;
  return lifecycleRank(b) > lifecycleRank(a) ? b : a;
}
