/**
 * Backend Raw Lead global gate (DDL-14) — mirror of FE domain contract.
 * Keep codes/messages aligned with src/domain/entityReference.
 */

import { appError } from '../../../lib/errors.js';

export const ENTITY_REF_TYPE = Object.freeze({
  COMPANY: 'COMPANY',
  RAW_LEAD: 'RAW_LEAD',
});

/**
 * @param {object} body
 * @returns {{ attempted: boolean, reason?: string }}
 */
export function detectRawLeadOrderAttempt(body = {}) {
  const entityType = String(body.entityType || body.subjectType || '').toUpperCase();
  if (entityType === ENTITY_REF_TYPE.RAW_LEAD) {
    return { attempted: true, reason: 'entityType' };
  }
  if (body.leadId) {
    return { attempted: true, reason: 'leadId' };
  }
  if (body.subject?.entityType === ENTITY_REF_TYPE.RAW_LEAD
    || body.subject?.type === ENTITY_REF_TYPE.RAW_LEAD) {
    return { attempted: true, reason: 'subject' };
  }
  const companyId = body.companyId || body.customerId;
  if (companyId != null && String(companyId).startsWith('lead_')) {
    return { attempted: true, reason: 'lead_prefix' };
  }
  return { attempted: false };
}

export function assertOrderPartyIsCompany(body = {}) {
  const hit = detectRawLeadOrderAttempt(body);
  if (hit.attempted) {
    throw appError(
      'RAW_LEAD_NOT_ELIGIBLE_FOR_ORDER',
      'Raw lead must be converted to a company before an order can be created.',
      400,
      { reason: hit.reason },
    );
  }
}

export default {
  ENTITY_REF_TYPE,
  detectRawLeadOrderAttempt,
  assertOrderPartyIsCompany,
};
