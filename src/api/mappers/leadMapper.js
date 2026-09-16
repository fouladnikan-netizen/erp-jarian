/**
 * Map API Raw Lead ↔ Ofogh UI lead shape.
 * Domain statuses: NEW | QUALIFYING | CONVERTED | REJECTED
 * UI compatibility: OPEN umbrella for pre-convert (NEW/QUALIFYING).
 */

import { LEAD_STATUS, isOpenLeadStatus } from '../../modules/ofogh/domain/lead.constants.js';

export function leadFromApi(apiLead) {
  if (!apiLead) return null;
  const payload = apiLead.payload && typeof apiLead.payload === 'object' ? apiLead.payload : {};
  const status = apiLead.status || LEAD_STATUS.NEW;
  return {
    id: apiLead.id,
    companyName: apiLead.companyName,
    personName: apiLead.personName || '',
    mobile: apiLead.mobile || '',
    leadSource: apiLead.leadSource || '',
    activityDomain: apiLead.activityDomain || undefined,
    notes: apiLead.description || payload.notes || undefined,
    description: apiLead.description || undefined,
    status,
    /** UI filter alias — true when NEW or QUALIFYING (or legacy OPEN) */
    isOpen: isOpenLeadStatus(status),
    convertedCompanyId: apiLead.convertedCompanyId || null,
    convertedAt: apiLead.convertedAt || null,
    convertedBy: apiLead.convertedBy || null,
    pipelineStageId: apiLead.pipelineStageId || null,
    archiveReason: apiLead.archiveReason || null,
    createdBy: apiLead.createdBy || null,
    interactions: payload.interactions || [],
    next_follow_up_date: payload.next_follow_up_date || null,
    last_interaction_date: payload.last_interaction_date || apiLead.updatedAt || null,
    createdAt: apiLead.createdAt,
    updatedAt: apiLead.updatedAt,
    assignee: payload.assignee || { name: 'کاربر جاری', role: 'مسئول' },
  };
}

export function leadToApi(lead = {}) {
  const body = {
    companyName: lead.companyName,
    personName: lead.personName,
    mobile: lead.mobile,
    leadSource: lead.leadSource,
    description: lead.description ?? lead.notes,
    activityDomain: lead.activityDomain,
    payload: {
      ...(lead.payload || {}),
      interactions: lead.interactions || [],
      next_follow_up_date: lead.next_follow_up_date ?? null,
      last_interaction_date: lead.last_interaction_date ?? null,
      assignee: lead.assignee || undefined,
      notes: lead.notes,
    },
  };
  return body;
}

export default { leadFromApi, leadToApi };
