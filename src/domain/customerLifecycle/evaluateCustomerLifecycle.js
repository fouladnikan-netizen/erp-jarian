/**
 * Pure Customer Lifecycle derivation from domain facts.
 * DDL-18(B): Successful Purchase Event = Order.status == success (once).
 * CLOSED must not increment purchase count again.
 * 1–2 success → نوپیمان; 3+ → هم‌پیمان.
 */

import {
  CUSTOMER_LIFECYCLE,
  CATALOG_ACTIVITY_TYPE,
  normalizeLifecycleKey,
  maxLifecycle,
} from './lifecycleKeys.js';

/**
 * @typedef {{ activityType: string, status: string, completedAt?: string|null, occurredAt?: string|null, createdAt?: string|null }} ActivityFact
 * @typedef {{ id: string, createdAt?: string|null, status?: string|null }} OrderFact
 */

function isCompleted(activity) {
  return String(activity?.status || '').toUpperCase() === 'COMPLETED';
}

function activityTime(activity) {
  const t = activity?.completedAt || activity?.occurredAt || activity?.createdAt;
  if (!t) return null;
  const ms = new Date(t).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function isSuccessfulPurchase(order) {
  return String(order?.status || '').trim().toLowerCase() === 'success';
}

/**
 * Derive target lifecycle from events (advance-only vs current).
 *
 * @param {{
 *   currentLifecycle?: string|null,
 *   entityType?: string|null,
 *   activities?: ActivityFact[],
 *   orders?: OrderFact[],
 *   convertedAt?: string|null,
 * }} facts
 * @returns {{ lifecycle: string|null, trigger: string|null, skippedReason?: string }}
 */
export function deriveCustomerLifecycle(facts = {}) {
  const entityType = String(facts.entityType || 'CUSTOMER').toUpperCase();
  if (entityType === 'SUPPLIER') {
    return {
      lifecycle: null,
      trigger: null,
      skippedReason: 'SUPPLIER_EXCLUDED',
    };
  }

  let target = normalizeLifecycleKey(facts.currentLifecycle) || CUSTOMER_LIFECYCLE.COLD_LEAD;
  let trigger = facts.convertedAt || facts.currentLifecycle
    ? 'preserve_or_convert'
    : 'default_cold_lead';

  // Convert / create customer → at least نوپدید
  target = maxLifecycle(target, CUSTOMER_LIFECYCLE.COLD_LEAD);

  const completed = (facts.activities || []).filter(isCompleted);
  const catalogDone = completed
    .filter((a) => String(a.activityType || '').toLowerCase() === CATALOG_ACTIVITY_TYPE)
    .sort((a, b) => (activityTime(a) || 0) - (activityTime(b) || 0));

  if (catalogDone.length > 0) {
    target = maxLifecycle(target, CUSTOMER_LIFECYCLE.PITCHED);
    trigger = 'catalog_completed';
  }

  const firstCatalogAt = catalogDone.length ? activityTime(catalogDone[0]) : null;
  if (firstCatalogAt != null) {
    const followUp = completed.find((a) => {
      const t = activityTime(a);
      if (t == null || t <= firstCatalogAt) return false;
      const type = String(a.activityType || '').toLowerCase();
      return type !== CATALOG_ACTIVITY_TYPE;
    });
    const orders = facts.orders || [];
    if (followUp && orders.length === 0) {
      target = maxLifecycle(target, CUSTOMER_LIFECYCLE.NURTURING);
      trigger = 'followup_after_catalog';
    }
  }

  const orders = facts.orders || [];
  if (orders.length > 0) {
    target = maxLifecycle(target, CUSTOMER_LIFECYCLE.SALES_QUALIFIED);
    trigger = 'first_order';
  }

  const successCount = orders.filter(isSuccessfulPurchase).length;
  if (successCount >= 3) {
    target = maxLifecycle(target, CUSTOMER_LIFECYCLE.LOYAL);
    trigger = 'successful_purchase_loyal';
  } else if (successCount >= 1) {
    target = maxLifecycle(target, CUSTOMER_LIFECYCLE.FIRST_TIME_BUYER);
    trigger = 'successful_purchase_first';
  }

  return { lifecycle: target, trigger };
}
