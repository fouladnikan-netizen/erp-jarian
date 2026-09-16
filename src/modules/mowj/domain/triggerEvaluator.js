/**
 * TriggerEvaluator — does this domain event activate a campaign trigger rule?
 */

import {
  MOWJ_DOMAIN_EVENT_TYPE,
  TRIGGER_CODE_TO_EVENT_TYPE,
  validateMowjDomainEvent,
} from './events.contracts';
import { getTriggerRuleDefinition } from './trigger.catalog';
import {
  scheduleFromTriggerRule,
  validateAutomationSchedule,
} from './schedule.contracts';

/**
 * Event types the automation foundation evaluates.
 */
export const AUTOMATION_SUPPORTED_EVENTS = Object.freeze([
  MOWJ_DOMAIN_EVENT_TYPE.ORDER_DELIVERED,
  MOWJ_DOMAIN_EVENT_TYPE.SHIPMENT_DELIVERED,
  MOWJ_DOMAIN_EVENT_TYPE.FIRST_PURCHASE_COMPLETED,
  MOWJ_DOMAIN_EVENT_TYPE.LEAD_CREATED,
  MOWJ_DOMAIN_EVENT_TYPE.OPPORTUNITY_CREATED,
  MOWJ_DOMAIN_EVENT_TYPE.TASK_COMPLETED,
  MOWJ_DOMAIN_EVENT_TYPE.NO_FOLLOW_UP_DETECTED,
  MOWJ_DOMAIN_EVENT_TYPE.CUSTOMER_CREATED,
]);

/** Extra aliases: one event may satisfy related trigger codes. */
const EVENT_TRIGGER_ALIASES = Object.freeze({
  [MOWJ_DOMAIN_EVENT_TYPE.ORDER_DELIVERED]: Object.freeze([
    'ORDER_DELIVERED',
    'SHIPMENT_48H',
  ]),
  [MOWJ_DOMAIN_EVENT_TYPE.SHIPMENT_DELIVERED]: Object.freeze([
    'SHIPMENT_48H',
    'ORDER_DELIVERED',
  ]),
  [MOWJ_DOMAIN_EVENT_TYPE.FIRST_PURCHASE_COMPLETED]: Object.freeze(['FIRST_PURCHASE']),
  [MOWJ_DOMAIN_EVENT_TYPE.NO_FOLLOW_UP_DETECTED]: Object.freeze(['NO_FOLLOWUP_7D']),
  [MOWJ_DOMAIN_EVENT_TYPE.LEAD_CREATED]: Object.freeze(['LEAD_CREATED', 'CUSTOMER_CREATED']),
  [MOWJ_DOMAIN_EVENT_TYPE.OPPORTUNITY_CREATED]: Object.freeze(['OPPORTUNITY_CREATED', 'LEAD_CREATED']),
  [MOWJ_DOMAIN_EVENT_TYPE.TASK_COMPLETED]: Object.freeze(['TASK_COMPLETED']),
  [MOWJ_DOMAIN_EVENT_TYPE.CUSTOMER_CREATED]: Object.freeze(['CUSTOMER_CREATED', 'CUSTOMER_BIRTHDAY']),
});

/**
 * Reverse map: event type → trigger codes from catalog mapping.
 */
export function listTriggerCodesForEventType(eventType) {
  const type = String(eventType || '');
  const fromAliases = EVENT_TRIGGER_ALIASES[type] || [];
  const fromCatalog = Object.entries(TRIGGER_CODE_TO_EVENT_TYPE)
    .filter(([, mapped]) => mapped === type)
    .map(([code]) => code);
  return [...new Set([...fromAliases, ...fromCatalog])];
}

/**
 * @param {object} event
 * @param {object|null} triggerRule  campaign.triggerRule
 * @returns {{ matched: boolean, reason?: string, schedule?: object }}
 */
export function evaluateTrigger(event, triggerRule) {
  const eventCheck = validateMowjDomainEvent(event);
  if (!eventCheck.ok) {
    return { matched: false, reason: eventCheck.errors.join(' ') };
  }

  if (!AUTOMATION_SUPPORTED_EVENTS.includes(event.type)) {
    return { matched: false, reason: `رویداد پشتیبانی‌نشده: ${event.type}` };
  }

  if (!triggerRule || (!triggerRule.code && !triggerRule.id)) {
    return { matched: false, reason: 'قانون تریگر پیکربندی نشده است.' };
  }

  const def = getTriggerRuleDefinition(triggerRule.id || triggerRule.code) || triggerRule;
  const ruleCode = String(def.code || triggerRule.code || '').toUpperCase();
  const compatibleCodes = listTriggerCodesForEventType(event.type);

  if (!compatibleCodes.includes(ruleCode)) {
    return {
      matched: false,
      reason: `رویداد ${event.type} با تریگر ${ruleCode || '—'} مطابقت ندارد.`,
    };
  }

  const schedule = scheduleFromTriggerRule({
    ...def,
    ...triggerRule,
    code: ruleCode,
    params: { ...(def.params || {}), ...(triggerRule.params || {}) },
  });
  const scheduleCheck = validateAutomationSchedule(schedule);
  if (!scheduleCheck.ok) {
    return { matched: false, reason: scheduleCheck.errors.join(' ') };
  }

  return { matched: true, schedule };
}

/**
 * Pure helper for tests / UI.
 * @param {string} eventType
 * @param {string} triggerCode
 */
export function eventMatchesTriggerCode(eventType, triggerCode) {
  const codes = listTriggerCodesForEventType(eventType);
  return codes.includes(String(triggerCode || '').toUpperCase());
}
