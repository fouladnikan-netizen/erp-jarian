/**
 * Pooyesh Timeline Facade (DDL-11 + DDL-14 + DDL-15)
 *
 * Soft activities: Activity SSOT (API) / parent interactions (mock).
 * Company timeline still projects orders via Nabz.
 */

import { listOrders } from '../../nabz/public/index.js';
import { buildCompanyTimelineEvents } from '../../../projections/companyTimeline';
import {
  ENTITY_REF_TYPE,
  companyReference,
  rawLeadReference,
  normalizeEntityReference,
  assertEntityEligibleFor,
  ERP_CAPABILITY,
} from '../../../domain/entityReference';
import { resolveSubjectEntity } from '../ports/subjectEntity.port.js';
import {
  createInteraction,
  listInteractions,
  fetchInteractions,
} from '../interactionFacade';
import { fetchPooyeshTasks, listPooyeshTasks } from '../taskFacade';
import {
  fetchLeadsConvertedToCompany,
  listLeads,
  buildOfoghLeadDeepLink,
} from '../../ofogh/public/leadsFacade.js';
import { fetchOfficialRecords } from '../../gahshomar/officialRecordFacade';

/**
 * Read-time projection of pre-conversion Ofogh Lead lineage onto a Company's
 * Customer 360 timeline (Gap 3). Ofogh remains Lead SoT; Pooyesh remains
 * Activity/Task SoT. No copy or re-key of Activity/Task rows happens here.
 */
function computeLeadLineage(companyId) {
  const leads = listLeads((lead) => String(lead.convertedCompanyId) === String(companyId));
  return leads.map((lead) => ({
    lead,
    deepLink: buildOfoghLeadDeepLink(lead.id),
    activities: listInteractions(rawLeadReference(lead.id)),
    tasks: listPooyeshTasks({ entityType: ENTITY_REF_TYPE.RAW_LEAD, entityId: lead.id }),
  }));
}

function toSubject(subjectOrCompanyId) {
  if (subjectOrCompanyId != null && typeof subjectOrCompanyId === 'object') {
    return normalizeEntityReference(subjectOrCompanyId);
  }
  return companyReference(subjectOrCompanyId);
}

export function getSubjectTimeline(subjectOrCompanyId, options = {}) {
  const subject = toSubject(subjectOrCompanyId);
  if (!subject) return [];

  const resolved = resolveSubjectEntity(subject);
  if (!resolved.ok) return [];

  if (subject.entityType === ENTITY_REF_TYPE.RAW_LEAD) {
    return listInteractions(subject).map((item) => ({
      id: item.id,
      kind: 'interaction',
      type: item.type || item.activityType || 'note',
      date: item.date || item.occurredAt || null,
      summary: item.summary || item.note || item.description || '',
      subject: { ...subject },
    }));
  }

  const company = resolved.snapshot;
  const orders = options.orders ?? listOrders();
  const tasks = options.tasks ?? listPooyeshTasks({
    entityType: ENTITY_REF_TYPE.COMPANY,
    entityId: subject.entityId,
  });
  const leadLineage = options.leadLineage ?? computeLeadLineage(subject.entityId);
  return buildCompanyTimelineEvents(company, orders, tasks, leadLineage);
}

export async function fetchSubjectTimeline(subjectOrCompanyId, options = {}) {
  const subject = toSubject(subjectOrCompanyId);
  if (!subject) return [];
  await fetchInteractions(subject);
  await fetchPooyeshTasks({ entityType: subject.entityType, entityId: subject.entityId });

  let leadLineage;
  if (subject.entityType === ENTITY_REF_TYPE.COMPANY) {
    const convertedLeads = await fetchLeadsConvertedToCompany(subject.entityId);
    await Promise.all(convertedLeads.map((lead) => Promise.all([
      fetchInteractions(rawLeadReference(lead.id)),
      fetchPooyeshTasks({ entityType: ENTITY_REF_TYPE.RAW_LEAD, entityId: lead.id }),
    ])));
    leadLineage = computeLeadLineage(subject.entityId);
    // Correspondence (Gahshomar) timeline events project off the shared
    // correspondence cache — ensure it is hydrated so a fresh page load
    // (e.g. deep-linking straight into the Timeline tab) still surfaces them.
    await fetchOfficialRecords({ companyId: subject.entityId });
  }

  return getSubjectTimeline(subject, { ...options, leadLineage });
}

export function getCompanyTimeline(companyId, options = {}) {
  return getSubjectTimeline(companyReference(companyId), options);
}

export function createActivity(subjectOrCompanyId, payload = {}) {
  const subject = toSubject(subjectOrCompanyId);
  if (!subject) return null;
  const gate = assertEntityEligibleFor(subject, ERP_CAPABILITY.ACTIVITY);
  if (!gate.ok) return null;
  return createInteraction(subject, payload);
}

export function listSubjectActivities(subjectOrCompanyId) {
  return listInteractions(toSubject(subjectOrCompanyId));
}

export function listCompanyActivities(companyId) {
  return listSubjectActivities(companyReference(companyId));
}

export function getRawLeadTimeline(leadId) {
  return getSubjectTimeline(rawLeadReference(leadId));
}

export const companyTimelineFacade = {
  getCompanyTimeline,
  getSubjectTimeline,
  fetchSubjectTimeline,
  getRawLeadTimeline,
  createActivity,
  listCompanyActivities,
  listSubjectActivities,
};

export default companyTimelineFacade;
