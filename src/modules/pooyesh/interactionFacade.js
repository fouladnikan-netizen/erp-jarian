/**
 * Pooyesh Interaction Facade (DDL-09 + DDL-14 + DDL-15)
 *
 * Canonical entry for soft interactions on Company OR Raw Lead.
 * API mode: PostgreSQL Activity SSOT via ActivityRepository / useActivitiesStore.
 * Mock mode: temporary parent interactions[] via subjectEntityPort (offline only).
 *
 * UI must use this module — never import stores for Activity persistence.
 */

import { useMockApi } from '../../api/useMockApi';
import { useActivitiesStore } from '../../stores/useActivitiesStore';
import {
  ENTITY_REF_TYPE,
  companyReference,
  rawLeadReference,
  normalizeEntityReference,
  assertEntityEligibleFor,
  ERP_CAPABILITY,
} from '../../domain/entityReference';
import {
  resolveSubjectEntity,
  listCompanyInteractionsViaPort,
  addCompanyInteractionViaPort,
  updateCompanyInteractionViaPort,
  removeCompanyInteractionViaPort,
  listLeadInteractionsViaPort,
  addLeadInteractionViaPort,
} from './ports/subjectEntity.port.js';
import { fetchPooyeshTasks } from './taskFacade.js';

/**
 * @param {string|number|{entityType:string,entityId:string}} subjectOrCompanyId
 * @returns {{ entityType: string, entityId: string }|null}
 */
function toSubject(subjectOrCompanyId) {
  if (subjectOrCompanyId != null && typeof subjectOrCompanyId === 'object') {
    return normalizeEntityReference(subjectOrCompanyId);
  }
  if (subjectOrCompanyId == null || subjectOrCompanyId === '') return null;
  return companyReference(subjectOrCompanyId);
}

/**
 * Polymorphic list — Company or Raw Lead.
 * Sync read from cache (API) or parent aggregate (mock).
 */
export function listInteractions(subjectOrCompanyId) {
  const subject = toSubject(subjectOrCompanyId);
  if (!subject) return [];

  if (useMockApi()) {
    if (subject.entityType === ENTITY_REF_TYPE.RAW_LEAD) {
      return listLeadInteractionsViaPort(subject.entityId);
    }
    return listCompanyInteractionsViaPort(subject.entityId);
  }

  return useActivitiesStore.getState().listBySubject(subject);
}

/** Hydrate Activity cache for a subject (API mode). */
export async function fetchInteractions(subjectOrCompanyId) {
  const subject = toSubject(subjectOrCompanyId);
  if (!subject) return [];
  if (useMockApi()) return listInteractions(subject);
  return useActivitiesStore.getState().fetchBySubject(subject);
}

/** @deprecated Prefer listInteractions — Company-only alias */
export function listCompanyInteractions(companyId) {
  return listInteractions(companyReference(companyId));
}

/**
 * Create soft interaction / activity / note / follow-up on Company or Raw Lead.
 * API mode: SERVER_FIRST async. Mock: sync parent write.
 *
 * @returns {Promise<object|null>|object|null}
 */
export function createInteraction(subjectOrCompanyId, payload = {}) {
  const subject = toSubject(subjectOrCompanyId);
  if (!subject) return useMockApi() ? null : Promise.resolve(null);

  const gate = assertEntityEligibleFor(subject, ERP_CAPABILITY.ACTIVITY);
  if (!gate.ok) return useMockApi() ? null : Promise.resolve(null);

  const note = String(payload.note ?? payload.summary ?? payload.description ?? '').trim();
  if (!note) return useMockApi() ? null : Promise.resolve(null);

  const resolved = resolveSubjectEntity(subject);
  if (!resolved.ok) return useMockApi() ? null : Promise.resolve(null);
  if (subject.entityType === ENTITY_REF_TYPE.RAW_LEAD && resolved.isConverted) {
    return useMockApi() ? null : Promise.resolve(null);
  }

  const type = payload.type || payload.activityType || 'note';
  const nextFollowUpDate = payload.nextFollowUpDate ?? payload.nextFollowUp ?? null;

  if (useMockApi()) {
    const before = listInteractions(subject);
    if (subject.entityType === ENTITY_REF_TYPE.RAW_LEAD) {
      addLeadInteractionViaPort(subject.entityId, note, nextFollowUpDate, type);
    } else {
      addCompanyInteractionViaPort(subject.entityId, note, nextFollowUpDate, type);
    }
    const after = listInteractions(subject);
    if (after.length <= before.length) return null;
    return after[0] || null;
  }

  const createPromise = useActivitiesStore.getState().createActivityAsync({
    entityType: subject.entityType,
    entityId: subject.entityId,
    type,
    note,
    description: note,
    nextFollowUpDate,
    dueAt: nextFollowUpDate,
    payload: payload.payload || undefined,
  });

  // DDL-20: a future follow-up atomically creates/links a canonical Task
  // server-side. Refresh this subject's Task cache so Pooyesh Task board /
  // Calendar / Customer-360 projections pick it up without a full reload.
  if (nextFollowUpDate) {
    createPromise.then((saved) => {
      if (saved) void fetchPooyeshTasks({ entityType: subject.entityType, entityId: subject.entityId });
    }).catch(() => {});
  }

  return createPromise;
}

/** Company-scoped create (compat) */
export function createCompanyInteraction(companyId, payload = {}) {
  return createInteraction(companyReference(companyId), payload);
}

/** Raw Lead-scoped create */
export function createRawLeadInteraction(leadId, payload = {}) {
  return createInteraction(rawLeadReference(leadId), payload);
}

/** @deprecated Prefer createCompanyInteraction */
export function addCompanyInteraction(companyId, payload = {}) {
  return createCompanyInteraction(companyId, payload);
}

export function updateCompanyInteraction(companyId, interactionId, changes = {}) {
  if (useMockApi()) {
    const ok = updateCompanyInteractionViaPort(companyId, interactionId, changes);
    if (!ok) return null;
    return listCompanyInteractions(companyId).find(
      (item) => String(item.id) === String(interactionId),
    ) || null;
  }

  const nextFollowUpDate = changes.nextFollowUp ?? changes.nextFollowUpDate;
  const updatePromise = useActivitiesStore.getState().updateActivityAsync(interactionId, {
    note: changes.note ?? changes.summary,
    description: changes.note ?? changes.summary,
    type: changes.type,
    activityType: changes.type,
    nextFollowUpDate,
    payload: changes.payload || undefined,
  });

  if (nextFollowUpDate !== undefined) {
    updatePromise.then((saved) => {
      if (saved) void fetchPooyeshTasks({ entityType: ENTITY_REF_TYPE.COMPANY, entityId: companyId });
    }).catch(() => {});
  }

  return updatePromise;
}

/** Mark an Activity as completed (canonical status transition, not archive). */
export function completeInteraction(interactionId) {
  if (useMockApi()) return null;
  return useActivitiesStore.getState().completeActivityAsync(interactionId);
}

export function removeCompanyInteraction(companyId, interactionId) {
  if (useMockApi()) {
    return Boolean(removeCompanyInteractionViaPort(companyId, interactionId));
  }
  return useActivitiesStore.getState().archiveActivityAsync(interactionId)
    .then(() => true)
    .catch(() => false);
}

export function createActivity(subject, payload = {}) {
  return createInteraction(subject, payload);
}

export function listActivities(subject) {
  return listInteractions(subject);
}

export const interactionFacade = {
  listInteractions,
  fetchInteractions,
  listCompanyInteractions,
  createInteraction,
  createCompanyInteraction,
  createRawLeadInteraction,
  addCompanyInteraction,
  updateCompanyInteraction,
  completeInteraction,
  removeCompanyInteraction,
  createActivity,
  listActivities,
};

export default interactionFacade;
