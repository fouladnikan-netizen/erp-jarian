/**
 * CampaignExecutionIntent — request for future executor (not execution).
 */

import { createEntityId, ENTITY_ID_PREFIX } from '../../../domain/identity';
import { normalizeAutomationSchedule, SCHEDULE_KIND } from './schedule.contracts';

export const EXECUTION_INTENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  SCHEDULED: 'SCHEDULED',
  CONSUMED: 'CONSUMED',
  CANCELLED: 'CANCELLED',
});

/**
 * @typedef {object} CampaignExecutionIntent
 * @property {string} id
 * @property {string} campaignId
 * @property {object} triggerEvent
 * @property {string} actionType
 * @property {object|null} audienceReference
 * @property {object} schedule
 * @property {string} status
 * @property {string} createdAt
 */

/**
 * Opaque audience pointer derived from event payload — no duplicated customer data.
 * @param {object} event
 */
export function buildAudienceReferenceFromEvent(event) {
  const payload = event?.payload && typeof event.payload === 'object' ? event.payload : {};
  const ref = {};
  if (payload.companyId != null) ref.companyId = String(payload.companyId);
  if (payload.customerId != null) ref.customerId = String(payload.customerId);
  if (payload.contactId != null) ref.contactId = String(payload.contactId);
  if (payload.orderId != null) ref.orderId = String(payload.orderId);
  if (payload.leadId != null) ref.leadId = String(payload.leadId);
  if (payload.opportunityId != null) ref.opportunityId = String(payload.opportunityId);
  if (payload.taskId != null) ref.taskId = String(payload.taskId);
  return Object.keys(ref).length ? Object.freeze(ref) : null;
}

/**
 * @param {object} input
 * @returns {CampaignExecutionIntent|null}
 */
export function normalizeExecutionIntent(input = {}) {
  const campaignId = String(input.campaignId || '').trim();
  const actionType = String(input.actionType || '').trim().toUpperCase();
  if (!campaignId || !actionType) return null;
  if (!input.triggerEvent || typeof input.triggerEvent !== 'object') return null;

  const schedule = normalizeAutomationSchedule(input.schedule || { kind: SCHEDULE_KIND.IMMEDIATE });
  const statusRaw = String(input.status || EXECUTION_INTENT_STATUS.PENDING).toUpperCase();
  const status = EXECUTION_INTENT_STATUS[statusRaw] || EXECUTION_INTENT_STATUS.PENDING;
  const nowIso = new Date().toISOString();

  const triggerEvent = Object.freeze({
    type: String(input.triggerEvent.type || ''),
    occurredAt: input.triggerEvent.occurredAt || nowIso,
    sourceModule: input.triggerEvent.sourceModule || null,
    correlationId: input.triggerEvent.correlationId || null,
    payload: Object.freeze({ ...(input.triggerEvent.payload || {}) }),
  });

  return {
    id: input.id != null && input.id !== ''
      ? String(input.id)
      : createEntityId(ENTITY_ID_PREFIX.CAMPAIGN, 'intent'),
    campaignId,
    triggerEvent,
    actionType,
    audienceReference: input.audienceReference != null
      ? Object.freeze({ ...input.audienceReference })
      : buildAudienceReferenceFromEvent(triggerEvent),
    schedule,
    status: schedule.kind === SCHEDULE_KIND.IMMEDIATE
      ? status
      : (status === EXECUTION_INTENT_STATUS.PENDING
        ? EXECUTION_INTENT_STATUS.SCHEDULED
        : status),
    createdAt: input.createdAt || nowIso,
  };
}

/**
 * @param {object} input
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateExecutionIntent(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['intent نامعتبر است.'] };
  }
  if (!String(input.campaignId || '').trim()) errors.push('campaignId الزامی است.');
  if (!String(input.actionType || '').trim()) errors.push('actionType الزامی است.');
  if (!input.triggerEvent?.type) errors.push('triggerEvent.type الزامی است.');
  return { ok: errors.length === 0, errors };
}
