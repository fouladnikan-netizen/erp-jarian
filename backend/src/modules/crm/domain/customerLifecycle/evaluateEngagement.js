/**
 * Engagement is independent of lifecycle stage.
 */

import {
  ENGAGEMENT,
  FORGOTTEN_DAYS,
  SHADOW_DAYS,
  FORGOTTEN_ELIGIBLE,
  SHADOW_ELIGIBLE,
  normalizeLifecycleKey,
} from './lifecycleKeys.js';

const MS_DAY = 86_400_000;

/**
 * @param {{
 *   lifecycle?: string|null,
 *   entityType?: string|null,
 *   lastActivityAt?: string|null,
 *   lastOrderAt?: string|null,
 *   companyCreatedAt?: string|null,
 *   now?: Date|string|number,
 * }} facts
 */
export function deriveEngagement(facts = {}) {
  const entityType = String(facts.entityType || 'CUSTOMER').toUpperCase();
  if (entityType === 'SUPPLIER') {
    return { engagement: ENGAGEMENT.NORMAL, reason: 'SUPPLIER_EXCLUDED' };
  }

  const lifecycle = normalizeLifecycleKey(facts.lifecycle);
  const nowMs = new Date(facts.now || Date.now()).getTime();

  if (lifecycle && FORGOTTEN_ELIGIBLE.includes(lifecycle)) {
    const anchor = facts.lastActivityAt || facts.companyCreatedAt;
    if (anchor) {
      const inactiveDays = (nowMs - new Date(anchor).getTime()) / MS_DAY;
      if (inactiveDays > FORGOTTEN_DAYS) {
        return { engagement: ENGAGEMENT.FORGOTTEN, reason: 'inactivity_30d' };
      }
    }
  }

  if (lifecycle && SHADOW_ELIGIBLE.includes(lifecycle)) {
    const lastOrder = facts.lastOrderAt;
    if (lastOrder) {
      const idleDays = (nowMs - new Date(lastOrder).getTime()) / MS_DAY;
      if (idleDays > SHADOW_DAYS) {
        return { engagement: ENGAGEMENT.SHADOW, reason: 'no_order_90d' };
      }
    } else {
      // At آستانه+ without any order timestamp should not happen if stage is correct;
      // treat missing lastOrder with companyCreatedAt for safety.
      const anchor = facts.companyCreatedAt;
      if (anchor) {
        const idleDays = (nowMs - new Date(anchor).getTime()) / MS_DAY;
        if (idleDays > SHADOW_DAYS) {
          return { engagement: ENGAGEMENT.SHADOW, reason: 'no_order_90d' };
        }
      }
    }
  }

  return { engagement: ENGAGEMENT.NORMAL, reason: 'active' };
}
