/**
 * Audience snapshot foundation — freeze resolver output at execution time.
 */

import { createEntityId, ENTITY_ID_PREFIX } from '../../../domain/identity';
import { getMowjTodayJalali as getTodayJalali } from './runtimeDefaults';
import { AUDIENCE_SOURCE_TYPE } from './audienceDefinition';

export const SNAPSHOT_MEMBER_STATUS = Object.freeze({
  INCLUDED: 'INCLUDED',
  EXCLUDED: 'EXCLUDED',
  SKIPPED: 'SKIPPED',
});

/**
 * @typedef {object} CampaignAudienceSnapshotMember
 * @property {string|null} [contactId]
 * @property {string|null} [leadId]
 * @property {string|null} [orderId]
 * @property {string|null} [customerId]
 * @property {string} status
 */

/**
 * @typedef {object} CampaignAudienceSnapshot
 * @property {string} id
 * @property {string} campaignId
 * @property {string|null} executionId
 * @property {string} snapshotDate
 * @property {string} source
 * @property {string|null} audienceDefinitionId
 * @property {CampaignAudienceSnapshotMember[]} members
 * @property {number} memberCount
 * @property {string} createdAt
 */

/**
 * Legacy helper — prefer snapshotMembersFromResolved via AudienceResolver.
 * @param {object} [audience]
 */
export function buildSnapshotMembersFromAudience(audience = {}) {
  const members = [];
  const contacts = Array.isArray(audience.contactIds)
    ? audience.contactIds
    : (audience.filters?.includeContactIds || []);
  const leads = Array.isArray(audience.leadIds)
    ? audience.leadIds
    : (audience.filters?.includeLeadIds || []);

  contacts.forEach((contactId) => {
    if (!contactId) return;
    members.push({
      contactId: String(contactId),
      leadId: null,
      orderId: null,
      customerId: null,
      status: SNAPSHOT_MEMBER_STATUS.INCLUDED,
    });
  });

  leads.forEach((leadId) => {
    if (!leadId) return;
    members.push({
      contactId: null,
      leadId: String(leadId),
      orderId: null,
      customerId: null,
      status: SNAPSHOT_MEMBER_STATUS.INCLUDED,
    });
  });

  return members;
}

/**
 * @param {object} input
 * @returns {CampaignAudienceSnapshot|null}
 */
export function normalizeAudienceSnapshot(input = {}) {
  const campaignId = String(input.campaignId || '').trim();
  if (!campaignId) return null;

  const members = Array.isArray(input.members)
    ? input.members
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const contactId = item.contactId != null ? String(item.contactId) : null;
        const contactPersonId = item.contactPersonId != null ? String(item.contactPersonId) : null;
        const companyId = item.companyId != null ? String(item.companyId) : (
          item.customerId != null ? String(item.customerId) : null
        );
        const leadId = item.leadId != null ? String(item.leadId) : null;
        const orderId = item.orderId != null ? String(item.orderId) : null;
        const customerId = item.customerId != null ? String(item.customerId) : companyId;
        if (!contactId && !contactPersonId && !leadId && !orderId && !customerId && !companyId) return null;
        const status = String(item.status || SNAPSHOT_MEMBER_STATUS.INCLUDED).toUpperCase();
        return {
          contactId,
          contactPersonId,
          companyId,
          leadId,
          orderId,
          customerId,
          status: SNAPSHOT_MEMBER_STATUS[status] || SNAPSHOT_MEMBER_STATUS.INCLUDED,
        };
      })
      .filter(Boolean)
    : [];

  const nowIso = new Date().toISOString();
  return {
    id: input.id != null && input.id !== ''
      ? String(input.id)
      : createEntityId(ENTITY_ID_PREFIX.CAMPAIGN, 'snap'),
    campaignId,
    executionId: input.executionId != null ? String(input.executionId) : null,
    snapshotDate: String(input.snapshotDate || '').trim() || getTodayJalali() || null,
    source: AUDIENCE_SOURCE_TYPE.KANOON_COMPANY,
    audienceDefinitionId: input.audienceDefinitionId != null
      ? String(input.audienceDefinitionId)
      : null,
    members,
    memberCount: members.length,
    createdAt: input.createdAt || nowIso,
  };
}
