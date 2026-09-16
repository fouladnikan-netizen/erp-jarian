/**
 * Internal event contracts + business event names for future automation.
 * Adapters map module payloads → these envelopes. No executor.
 */

/**
 * @typedef {object} MowjDomainEventBase
 * @property {string} type
 * @property {string} occurredAt
 * @property {string|null} [sourceModule]
 * @property {string|null} [correlationId]
 * @property {object} payload
 */

export const MOWJ_DOMAIN_EVENT_TYPE = Object.freeze({
  SHIPMENT_DELIVERED: 'ShipmentDelivered',
  ORDER_DELIVERED: 'OrderDelivered',
  ORDER_CREATED: 'OrderCreated',
  FIRST_PURCHASE_COMPLETED: 'FirstPurchaseCompleted',
  NO_FOLLOW_UP_DETECTED: 'NoFollowUpDetected',
  CUSTOMER_CREATED: 'CustomerCreated',
  CUSTOMER_ACTIVITY: 'CustomerActivity',
  LEAD_CREATED: 'LeadCreated',
  OPPORTUNITY_CREATED: 'OpportunityCreated',
  TASK_COMPLETED: 'TaskCompleted',
  SURVEY_RESPONSE_RECEIVED: 'SurveyResponseReceived',
});

export const MOWJ_DOMAIN_EVENT_LABELS = Object.freeze({
  ShipmentDelivered: 'تحویل محموله',
  OrderDelivered: 'تحویل سفارش',
  OrderCreated: 'ایجاد سفارش',
  FirstPurchaseCompleted: 'اولین خرید',
  NoFollowUpDetected: 'عدم پیگیری',
  CustomerCreated: 'ایجاد مشتری',
  CustomerActivity: 'فعالیت مشتری',
  LeadCreated: 'ایجاد سرنخ',
  OpportunityCreated: 'ایجاد فرصت',
  TaskCompleted: 'تکمیل وظیفه',
  SurveyResponseReceived: 'پاسخ نظرسنجی',
});

export const TRIGGER_CODE_TO_EVENT_TYPE = Object.freeze({
  SHIPMENT_48H: MOWJ_DOMAIN_EVENT_TYPE.SHIPMENT_DELIVERED,
  ORDER_DELIVERED: MOWJ_DOMAIN_EVENT_TYPE.ORDER_DELIVERED,
  FIRST_PURCHASE: MOWJ_DOMAIN_EVENT_TYPE.FIRST_PURCHASE_COMPLETED,
  NO_FOLLOWUP_7D: MOWJ_DOMAIN_EVENT_TYPE.NO_FOLLOW_UP_DETECTED,
  CUSTOMER_CREATED: MOWJ_DOMAIN_EVENT_TYPE.CUSTOMER_CREATED,
  CUSTOMER_BIRTHDAY: MOWJ_DOMAIN_EVENT_TYPE.CUSTOMER_CREATED,
  LEAD_CREATED: MOWJ_DOMAIN_EVENT_TYPE.LEAD_CREATED,
  OPPORTUNITY_CREATED: MOWJ_DOMAIN_EVENT_TYPE.OPPORTUNITY_CREATED,
  TASK_COMPLETED: MOWJ_DOMAIN_EVENT_TYPE.TASK_COMPLETED,
});

/**
 * @param {string} type
 * @param {object} payload
 * @param {{ sourceModule?: string, correlationId?: string, occurredAt?: string }} [meta]
 */
export function createMowjDomainEvent(type, payload, meta = {}) {
  return Object.freeze({
    type: String(type),
    occurredAt: meta.occurredAt || new Date().toISOString(),
    sourceModule: meta.sourceModule || null,
    correlationId: meta.correlationId || null,
    payload: Object.freeze({ ...payload }),
  });
}

/**
 * @param {object} event
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateMowjDomainEvent(event) {
  const errors = [];
  if (!event || typeof event !== 'object') {
    return { ok: false, errors: ['رویداد نامعتبر است.'] };
  }
  if (!event.type || !Object.values(MOWJ_DOMAIN_EVENT_TYPE).includes(event.type)) {
    errors.push(`نوع رویداد نامعتبر: ${event?.type || '—'}`);
  }
  if (!event.occurredAt) errors.push('occurredAt الزامی است.');
  if (!event.payload || typeof event.payload !== 'object') {
    errors.push('payload الزامی است.');
  }
  return { ok: errors.length === 0, errors };
}

export function createShipmentDeliveredEvent(payload, meta) {
  return createMowjDomainEvent(MOWJ_DOMAIN_EVENT_TYPE.SHIPMENT_DELIVERED, payload, {
    sourceModule: 'nabz',
    ...meta,
  });
}

export function createOrderDeliveredEvent(payload, meta) {
  return createMowjDomainEvent(MOWJ_DOMAIN_EVENT_TYPE.ORDER_DELIVERED, payload, {
    sourceModule: 'nabz',
    ...meta,
  });
}

export function createOrderCreatedEvent(payload, meta) {
  return createMowjDomainEvent(MOWJ_DOMAIN_EVENT_TYPE.ORDER_CREATED, payload, {
    sourceModule: 'nabz',
    ...meta,
  });
}

export function createFirstPurchaseCompletedEvent(payload, meta) {
  return createMowjDomainEvent(MOWJ_DOMAIN_EVENT_TYPE.FIRST_PURCHASE_COMPLETED, payload, {
    sourceModule: 'nabz',
    ...meta,
  });
}

export function createNoFollowUpDetectedEvent(payload, meta) {
  return createMowjDomainEvent(MOWJ_DOMAIN_EVENT_TYPE.NO_FOLLOW_UP_DETECTED, payload, {
    sourceModule: 'ofogh',
    ...meta,
  });
}

export function createCustomerCreatedEvent(payload, meta) {
  return createMowjDomainEvent(MOWJ_DOMAIN_EVENT_TYPE.CUSTOMER_CREATED, payload, {
    sourceModule: 'kanoon',
    ...meta,
  });
}

export function createLeadCreatedEvent(payload, meta) {
  return createMowjDomainEvent(MOWJ_DOMAIN_EVENT_TYPE.LEAD_CREATED, payload, {
    sourceModule: 'ofogh',
    ...meta,
  });
}

export function createOpportunityCreatedEvent(payload, meta) {
  return createMowjDomainEvent(MOWJ_DOMAIN_EVENT_TYPE.OPPORTUNITY_CREATED, payload, {
    sourceModule: 'ofogh',
    ...meta,
  });
}

export function createTaskCompletedEvent(payload, meta) {
  return createMowjDomainEvent(MOWJ_DOMAIN_EVENT_TYPE.TASK_COMPLETED, payload, {
    sourceModule: 'pooyesh',
    ...meta,
  });
}

export function createSurveyResponseReceivedEvent(payload, meta) {
  return createMowjDomainEvent(MOWJ_DOMAIN_EVENT_TYPE.SURVEY_RESPONSE_RECEIVED, payload, {
    sourceModule: 'mowj',
    ...meta,
  });
}

export function createCustomerActivityEvent(payload, meta) {
  return createMowjDomainEvent(MOWJ_DOMAIN_EVENT_TYPE.CUSTOMER_ACTIVITY, payload, {
    sourceModule: 'kanoon',
    ...meta,
  });
}
