/**
 * Order Activity Bridge (Golden Law fix — Pooyesh QA pass).
 *
 * Pooyesh owns canonical Activity. Orders have no dedicated `subject_type`
 * (DDL-15 only allows COMPANY/RAW_LEAD) — an Order-linked CRM activity
 * (call/note/message/meeting) is created as a canonical Activity with
 * subjectType=COMPANY (the order's customer) and `payload.orderId` set,
 * so it can be filtered back onto the Order profile/timeline.
 *
 * Scope boundary: PAYMENT-type CRM entries stay in `order.crmActivities`
 * (local, out of scope here) because they drive Saranjam settlement
 * calculations (`syncSaranjamCustomerPaymentsFromCrm`) — a financial/order
 * concern owned elsewhere. Do not migrate PAYMENT here without an explicit
 * settlement-model decision.
 */

import {
  completeInteraction,
  createInteraction,
  fetchInteractions,
  listInteractions,
  updateCompanyInteraction,
} from '../pooyesh/interactionFacade';
import { companyReference } from '../../domain/entityReference';
import { getCurrentUser, CURRENT_USER_ROLE } from './constants';
import { CRM_ACTIVITY_TYPES } from './orderCrmConfig';
import {
  appendCrmActivity,
  completeCrmFollowUp,
  formatActivityTimestamp,
  getOrderCrmActivities,
  getRoleLabel,
  updateCrmActivity,
} from './orderCrmService';

function orderCompanyId(order) {
  return order?.customerId ?? order?.companyId ?? null;
}

function isCanonicalId(id) {
  return typeof id === 'string' && id.startsWith('act_');
}

function toIsoDueDate(followUp) {
  if (!followUp?.date) return null;
  // Composer/Modal already hand over ISO (YYYY-MM-DD) + HH:mm.
  const time = followUp.time || '09:00';
  const iso = `${String(followUp.date).slice(0, 10)}T${time}:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function fromIsoFollowUp(dueAt) {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

/** Hydrate the canonical Activity cache for the order's customer. */
export function fetchOrderActivities(order) {
  const companyId = orderCompanyId(order);
  if (companyId == null) return Promise.resolve([]);
  return fetchInteractions(companyReference(companyId));
}

/**
 * Merged, display-normalized Order activity feed:
 * canonical Activities (payload.orderId match) + local PAYMENT entries.
 * Sorted oldest → newest (matches existing ActivityTimeline `.reverse()` UI).
 */
export function listOrderActivities(order) {
  const companyId = orderCompanyId(order);
  const canonical = companyId == null ? [] : listInteractions(companyReference(companyId))
    .filter((item) => String(item.payload?.orderId ?? '') === String(order.id))
    .map((item) => ({
      id: item.id,
      type: item.type || item.activityType || 'note',
      author: item.payload?.author || getCurrentUser(),
      roleLabel: item.payload?.roleLabel || getRoleLabel(CURRENT_USER_ROLE),
      createdAt: formatActivityTimestamp(
        new Date(item.date || item.occurredAt || item.createdAt || Date.now()),
      ),
      body: item.note || item.summary || item.description || '',
      mentions: [],
      followUp: item.dueAt || item.nextFollowUp
        ? {
          ...fromIsoFollowUp(item.dueAt || item.nextFollowUp),
          actionType: item.payload?.followUp?.actionType || 'پیگیری',
          title: item.payload?.followUp?.title || item.title || 'پیگیری',
          assignee: item.payload?.followUp?.assignee || item.payload?.author || null,
          completed: item.status === 'COMPLETED',
        }
        : null,
      payment: null,
      __sortAt: item.date || item.occurredAt || item.createdAt || 0,
    }));

  const localPayments = getOrderCrmActivities(order)
    .filter((activity) => activity.type === CRM_ACTIVITY_TYPES.PAYMENT)
    .map((activity) => ({ ...activity, __sortAt: activity.id }));

  return [...canonical, ...localPayments].sort(
    (a, b) => new Date(a.__sortAt || 0).getTime() - new Date(b.__sortAt || 0).getTime()
      || Number(a.id > b.id ? 1 : -1),
  );
}

/** Pending (uncompleted follow-up) activities across both canonical + local sources. */
export function listPendingOrderActivities(order) {
  return listOrderActivities(order).filter(
    (activity) => activity.followUp && !activity.followUp.completed,
  );
}

/**
 * Create an Order-linked activity.
 * PAYMENT → local orderCrmService (feeds Saranjam settlement, out of scope here);
 * caller must persist the returned `updater` via `onUpdateOrder`.
 * Everything else → canonical Pooyesh Activity (subjectType=COMPANY, payload.orderId);
 * the Activity lives independently of the order object — `updater` is null.
 * @returns {{ updater: ((current: object) => object)|null, async: Promise|null }}
 */
export function createOrderActivity(order, input) {
  if (input.type === CRM_ACTIVITY_TYPES.PAYMENT) {
    return { updater: (current) => appendCrmActivity(current, input), async: null };
  }

  const companyId = orderCompanyId(order);
  const dueAt = toIsoDueDate(input.followUp);
  const async = companyId == null ? null : Promise.resolve(
    createInteraction(companyReference(companyId), {
      note: input.body,
      type: input.type,
      nextFollowUpDate: dueAt,
      payload: {
        orderId: order.id,
        orderCode: order.code,
        author: input.author || getCurrentUser(),
        roleLabel: input.roleLabel || getRoleLabel(CURRENT_USER_ROLE),
        followUp: input.followUp || null,
      },
    }),
  );
  return { updater: null, async };
}

/**
 * Update an Order-linked activity (edit flow from QuickActivityModal).
 * Discriminates canonical (`act_...`) vs local numeric (payment) ids.
 */
export function updateOrderActivity(order, activityId, patch) {
  if (isCanonicalId(activityId)) {
    const companyId = orderCompanyId(order);
    const dueAt = toIsoDueDate(patch.followUp);
    const async = updateCompanyInteraction(companyId, activityId, {
      note: patch.body,
      type: patch.type,
      nextFollowUp: dueAt,
      payload: {
        orderId: order.id,
        orderCode: order.code,
        followUp: patch.followUp || null,
      },
    });
    return { updater: null, async };
  }
  return { updater: (current) => updateCrmActivity(current, activityId, patch), async: null };
}

/** Mark a follow-up as done — canonical Activity completion or local flag flip. */
export function completeOrderFollowUp(order, activityId) {
  if (isCanonicalId(activityId)) {
    return { updater: null, async: completeInteraction(activityId) };
  }
  return { updater: (current) => completeCrmFollowUp(current, activityId), async: null };
}

export default {
  fetchOrderActivities,
  listOrderActivities,
  listPendingOrderActivities,
  createOrderActivity,
  updateOrderActivity,
  completeOrderFollowUp,
};
