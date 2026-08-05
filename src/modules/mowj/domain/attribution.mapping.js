/**
 * Map domain events → attribution entity pointers.
 */

import { MOWJ_DOMAIN_EVENT_TYPE } from './events.contracts';
import { ATTRIBUTION_ENTITY_TYPE } from './attribution.types';

/**
 * @typedef {object} AttributionEntityRef
 * @property {string} entityType
 * @property {string} entityId
 */

/**
 * Extract entity attribution target from a domain event payload.
 * @param {object} event
 * @returns {AttributionEntityRef|null}
 */
export function resolveAttributionEntityFromEvent(event) {
  if (!event || typeof event !== 'object' || !event.type) return null;
  const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
  const type = String(event.type);

  if (type === MOWJ_DOMAIN_EVENT_TYPE.LEAD_CREATED) {
    const id = payload.leadId ?? payload.entityId;
    return id != null ? { entityType: ATTRIBUTION_ENTITY_TYPE.LEAD, entityId: String(id) } : null;
  }
  if (type === MOWJ_DOMAIN_EVENT_TYPE.OPPORTUNITY_CREATED) {
    const id = payload.opportunityId ?? payload.entityId;
    return id != null
      ? { entityType: ATTRIBUTION_ENTITY_TYPE.OPPORTUNITY, entityId: String(id) }
      : null;
  }
  if (
    type === MOWJ_DOMAIN_EVENT_TYPE.ORDER_CREATED
    || type === MOWJ_DOMAIN_EVENT_TYPE.ORDER_DELIVERED
    || type === MOWJ_DOMAIN_EVENT_TYPE.FIRST_PURCHASE_COMPLETED
  ) {
    const id = payload.orderId ?? payload.entityId;
    return id != null ? { entityType: ATTRIBUTION_ENTITY_TYPE.ORDER, entityId: String(id) } : null;
  }
  if (type === MOWJ_DOMAIN_EVENT_TYPE.TASK_COMPLETED) {
    const id = payload.taskId ?? payload.entityId;
    return id != null ? { entityType: ATTRIBUTION_ENTITY_TYPE.TASK, entityId: String(id) } : null;
  }
  if (type === MOWJ_DOMAIN_EVENT_TYPE.SURVEY_RESPONSE_RECEIVED) {
    const id = payload.surveyResponseId ?? payload.responseId ?? payload.entityId;
    return id != null
      ? { entityType: ATTRIBUTION_ENTITY_TYPE.SURVEY_RESPONSE, entityId: String(id) }
      : null;
  }
  if (
    type === MOWJ_DOMAIN_EVENT_TYPE.CUSTOMER_CREATED
    || type === MOWJ_DOMAIN_EVENT_TYPE.CUSTOMER_ACTIVITY
  ) {
    const id = payload.contactId ?? payload.customerId ?? payload.companyId ?? payload.entityId;
    return id != null ? { entityType: ATTRIBUTION_ENTITY_TYPE.CONTACT, entityId: String(id) } : null;
  }

  return null;
}

/**
 * Events that participate in acquisition attribution.
 */
export const ACQUISITION_ATTRIBUTION_EVENTS = Object.freeze([
  MOWJ_DOMAIN_EVENT_TYPE.LEAD_CREATED,
  MOWJ_DOMAIN_EVENT_TYPE.OPPORTUNITY_CREATED,
  MOWJ_DOMAIN_EVENT_TYPE.ORDER_CREATED,
]);

/**
 * Events that participate in retention attribution.
 */
export const RETENTION_ATTRIBUTION_EVENTS = Object.freeze([
  MOWJ_DOMAIN_EVENT_TYPE.SURVEY_RESPONSE_RECEIVED,
  MOWJ_DOMAIN_EVENT_TYPE.FIRST_PURCHASE_COMPLETED,
  MOWJ_DOMAIN_EVENT_TYPE.ORDER_DELIVERED,
  MOWJ_DOMAIN_EVENT_TYPE.ORDER_CREATED,
  MOWJ_DOMAIN_EVENT_TYPE.TASK_COMPLETED,
  MOWJ_DOMAIN_EVENT_TYPE.CUSTOMER_ACTIVITY,
  MOWJ_DOMAIN_EVENT_TYPE.CUSTOMER_CREATED,
]);
