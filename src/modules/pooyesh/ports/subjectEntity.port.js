/**
 * Pooyesh subject entity port — resolves Company/Lead via owner public facades.
 * Facades must import this port, not foreign stores.
 */

import {
  getCompany,
  listCompanyDocumentInteractions,
  addCompanyDocumentInteraction,
  updateCompanyDocumentInteraction,
  removeCompanyDocumentInteraction,
} from '../../kanoon/public/index.js';
import {
  getLead,
  listLeadDocumentInteractions,
  addLeadDocumentInteraction,
} from '../../ofogh/public/index.js';
import {
  ENTITY_REF_TYPE,
  normalizeEntityReference,
} from '../../../domain/entityReference';
import { LEAD_STATUS, isOpenLeadStatus } from '../../ofogh/domain/lead.constants.js';

/**
 * @param {{ entityType: string, entityId: string }} ref
 * @returns {{ ok: boolean, ref?: object, displayName?: string, status?: string, error?: string }}
 */
export function resolveSubjectEntity(refInput) {
  const ref = normalizeEntityReference(refInput);
  if (!ref) {
    return { ok: false, error: 'INVALID_ENTITY_REFERENCE' };
  }

  if (ref.entityType === ENTITY_REF_TYPE.COMPANY) {
    const company = getCompany(ref.entityId);
    if (!company) {
      return { ok: false, ref, error: 'COMPANY_NOT_FOUND' };
    }
    return {
      ok: true,
      ref,
      displayName: company.companyName || company.name || String(ref.entityId),
      status: company.lifecycle_stage || null,
      snapshot: company,
    };
  }

  if (ref.entityType === ENTITY_REF_TYPE.RAW_LEAD) {
    const lead = getLead(ref.entityId);
    if (!lead) {
      return { ok: false, ref, error: 'LEAD_NOT_FOUND' };
    }
    return {
      ok: true,
      ref,
      displayName: lead.companyName || String(ref.entityId),
      status: lead.status,
      snapshot: lead,
      isOpen: isOpenLeadStatus(lead.status),
      isConverted: lead.status === LEAD_STATUS.CONVERTED,
    };
  }

  return { ok: false, ref, error: 'INVALID_ENTITY_REFERENCE' };
}

export function listCompanyInteractionsViaPort(companyId) {
  return listCompanyDocumentInteractions(companyId);
}

export function addCompanyInteractionViaPort(companyId, note, nextFollowUpDate, type) {
  addCompanyDocumentInteraction(companyId, note, nextFollowUpDate, type);
}

export function updateCompanyInteractionViaPort(companyId, interactionId, changes) {
  return updateCompanyDocumentInteraction(companyId, interactionId, changes);
}

export function removeCompanyInteractionViaPort(companyId, interactionId) {
  return removeCompanyDocumentInteraction(companyId, interactionId);
}

export function listLeadInteractionsViaPort(leadId) {
  return listLeadDocumentInteractions(leadId);
}

export function addLeadInteractionViaPort(leadId, note, nextFollowUpDate, type) {
  addLeadDocumentInteraction(leadId, note, nextFollowUpDate, type);
}

export const subjectEntityPort = {
  resolveSubjectEntity,
  listCompanyInteractionsViaPort,
  addCompanyInteractionViaPort,
  updateCompanyInteractionViaPort,
  removeCompanyInteractionViaPort,
  listLeadInteractionsViaPort,
  addLeadInteractionViaPort,
};

export default subjectEntityPort;
