/**
 * Ofogh → Mowj event adapters (mapping only, no dispatch).
 * Opportunity ≡ Company + lifecycle_stage (no separate entity).
 */

import {
  createLeadCreatedEvent,
  createOpportunityCreatedEvent,
  createNoFollowUpDetectedEvent,
  validateMowjDomainEvent,
} from '../../domain/events.contracts';

/**
 * @param {object} contact  Company/contact record from Kanoon SSOT
 */
export function adaptLeadCreatedEvent(contact) {
  if (!contact || contact.id == null) return null;
  const event = createLeadCreatedEvent({
    leadId: String(contact.id),
    companyId: String(contact.id),
    lifecycleStage: contact.lifecycle_stage || contact.lifecycleStage || null,
  });
  return validateMowjDomainEvent(event).ok ? event : null;
}

/**
 * @param {object} contact
 */
export function adaptOpportunityCreatedEvent(contact) {
  if (!contact || contact.id == null) return null;
  const event = createOpportunityCreatedEvent({
    opportunityId: String(contact.id),
    leadId: String(contact.id),
    companyId: String(contact.id),
    lifecycleStage: contact.lifecycle_stage || contact.lifecycleStage || null,
  });
  return validateMowjDomainEvent(event).ok ? event : null;
}

/**
 * @param {object} contact
 * @param {{ idleDays?: number }} [meta]
 */
export function adaptNoFollowUpDetectedEvent(contact, meta = {}) {
  if (!contact || contact.id == null) return null;
  const event = createNoFollowUpDetectedEvent({
    opportunityId: String(contact.id),
    companyId: String(contact.id),
    idleDays: Number(meta.idleDays) || 7,
  });
  return validateMowjDomainEvent(event).ok ? event : null;
}
