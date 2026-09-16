/**
 * CampaignAttribution — links ERP domain events to campaigns.
 * No fake metrics; records only real event→entity links.
 */

import { createEntityId, ENTITY_ID_PREFIX } from '../../../domain/identity';

export const ATTRIBUTION_ENTITY_TYPE = Object.freeze({
  CONTACT: 'CONTACT',
  LEAD: 'LEAD',
  OPPORTUNITY: 'OPPORTUNITY',
  ORDER: 'ORDER',
  TASK: 'TASK',
  SURVEY_RESPONSE: 'SURVEY_RESPONSE',
});

export const ATTRIBUTION_ENTITY_TYPE_LABELS = Object.freeze({
  CONTACT: 'مخاطب',
  LEAD: 'سرنخ',
  OPPORTUNITY: 'فرصت',
  ORDER: 'سفارش',
  TASK: 'وظیفه',
  SURVEY_RESPONSE: 'پاسخ نظرسنجی',
});

const ENTITY_SET = new Set(Object.values(ATTRIBUTION_ENTITY_TYPE));

/**
 * @typedef {object} CampaignAttribution
 * @property {string} id
 * @property {string} campaignId
 * @property {string} entityType
 * @property {string} entityId
 * @property {string} eventType
 * @property {string} createdAt
 */

/**
 * @param {object} input
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateCampaignAttribution(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['attribution نامعتبر است.'] };
  }
  if (!String(input.campaignId || '').trim()) errors.push('campaignId الزامی است.');
  if (!ENTITY_SET.has(String(input.entityType || '').toUpperCase())) {
    errors.push(`entityType نامعتبر: ${input?.entityType || '—'}`);
  }
  if (!String(input.entityId || '').trim()) errors.push('entityId الزامی است.');
  if (!String(input.eventType || '').trim()) errors.push('eventType الزامی است.');
  return { ok: errors.length === 0, errors };
}

/**
 * @param {object} input
 * @returns {CampaignAttribution|null}
 */
export function normalizeCampaignAttribution(input = {}) {
  const campaignId = String(input.campaignId || '').trim();
  const entityType = String(input.entityType || '').trim().toUpperCase();
  const entityId = String(input.entityId || '').trim();
  const eventType = String(input.eventType || '').trim();
  if (!campaignId || !entityId || !eventType || !ENTITY_SET.has(entityType)) return null;

  return {
    id: input.id != null && input.id !== ''
      ? String(input.id)
      : createEntityId(ENTITY_ID_PREFIX.CAMPAIGN, 'attr'),
    campaignId,
    entityType,
    entityId,
    eventType,
    createdAt: input.createdAt || new Date().toISOString(),
  };
}
