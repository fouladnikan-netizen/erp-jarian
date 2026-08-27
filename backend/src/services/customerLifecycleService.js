/**
 * Apply Customer Lifecycle + Engagement from real domain facts (server-first).
 */

import { writeAudit } from '../lib/ids.js';
import * as companyRepo from '../repositories/companyRepository.js';
import * as activityRepo from '../repositories/activityRepository.js';
import * as orderRepo from '../repositories/orderRepository.js';
import { deriveCustomerLifecycle } from '../domain/customerLifecycle/evaluateCustomerLifecycle.js';
import { deriveEngagement } from '../domain/customerLifecycle/evaluateEngagement.js';
import {
  normalizeLifecycleKey,
  ENGAGEMENT,
} from '../domain/customerLifecycle/lifecycleKeys.js';

function latestActivityAt(activities) {
  let max = null;
  for (const a of activities) {
    if (String(a.status || '').toUpperCase() !== 'COMPLETED') continue;
    const t = a.completedAt || a.occurredAt || a.createdAt;
    if (!t) continue;
    if (!max || new Date(t) > new Date(max)) max = t;
  }
  return max;
}

function latestOrderAt(orders) {
  let max = null;
  for (const o of orders) {
    const t = o.createdAt;
    if (!t) continue;
    if (!max || new Date(t) > new Date(max)) max = t;
  }
  return max;
}

/**
 * @param {string} companyId
 * @param {{ actorUserId: string, trigger?: string, now?: Date|string|number, client?: import('pg').PoolClient }} opts
 */
export async function recomputeCustomerLifecycle(companyId, opts) {
  const { actorUserId, trigger = 'recompute', now = Date.now(), client = null } = opts;
  const company = await companyRepo.findById(companyId, {}, client);
  if (!company) return null;

  const entityType = String(company.entityType || 'CUSTOMER').toUpperCase();
  if (entityType === 'SUPPLIER') {
    return {
      companyId,
      skipped: true,
      reason: 'SUPPLIER_EXCLUDED',
      lifecycle: null,
      engagement: ENGAGEMENT.NORMAL,
    };
  }

  const [activities, orders] = await Promise.all([
    activityRepo.list({
      subjectType: 'COMPANY',
      subjectId: String(companyId),
      limit: 200,
    }, client),
    orderRepo.findMany({ companyId: String(companyId), limit: 200 }, client),
  ]);

  const derived = deriveCustomerLifecycle({
    currentLifecycle: company.lifecycleStage,
    entityType,
    activities,
    orders,
    convertedAt: company.payload?.convertedFromLeadId ? company.createdAt : null,
  });

  const lastActivityAt = latestActivityAt(activities);
  const lastOrderAt = latestOrderAt(orders);
  const engagement = deriveEngagement({
    lifecycle: derived.lifecycle,
    entityType,
    lastActivityAt,
    lastOrderAt,
    companyCreatedAt: company.createdAt,
    now,
  });

  const prevLifecycle = normalizeLifecycleKey(company.lifecycleStage) || company.lifecycleStage;
  const prevEngagement = company.engagementStatus || company.payload?.engagementStatus || ENGAGEMENT.NORMAL;
  const nextLifecycle = derived.lifecycle;
  const nextEngagement = engagement.engagement;

  const lifecycleChanged = prevLifecycle !== nextLifecycle;
  const engagementChanged = prevEngagement !== nextEngagement;

  if (lifecycleChanged || engagementChanged) {
    await companyRepo.update(
      companyId,
      {
        lifecycleStage: nextLifecycle,
        engagementStatus: nextEngagement,
      },
      actorUserId,
      client,
    );

    await writeAudit({
      actorUserId,
      action: 'company.lifecycle_recompute',
      entityType: 'company',
      entityId: companyId,
      detail: {
        previousLifecycle: prevLifecycle,
        newLifecycle: nextLifecycle,
        previousEngagement: prevEngagement,
        newEngagement: nextEngagement,
        trigger: trigger || derived.trigger,
        evaluationTrigger: derived.trigger,
        engagementReason: engagement.reason,
        asOf: new Date(now).toISOString(),
      },
    }, client);
  }

  return {
    companyId,
    skipped: false,
    lifecycle: nextLifecycle,
    engagement: nextEngagement,
    previousLifecycle: prevLifecycle,
    previousEngagement: prevEngagement,
    changed: lifecycleChanged || engagementChanged,
    trigger: derived.trigger,
  };
}

export default { recomputeCustomerLifecycle };
