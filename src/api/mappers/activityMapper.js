/**
 * Map API Activity ↔ Pooyesh UI interaction shape (DDL-15).
 * Keeps legacy interaction field names for facades/timeline.
 */

export function activityFromApi(api) {
  if (!api) return null;
  const description = api.description || api.title || '';
  return {
    id: api.id,
    subjectType: api.subjectType,
    subjectId: api.subjectId,
    activityType: api.activityType || 'note',
    type: api.activityType || 'note',
    title: api.title || undefined,
    description: api.description || undefined,
    note: description,
    summary: description,
    status: api.status || 'OPEN',
    occurredAt: api.occurredAt,
    date: api.occurredAt || api.createdAt || null,
    dueAt: api.dueAt || null,
    nextFollowUp: api.dueAt || null,
    completedAt: api.completedAt || null,
    assignedTo: api.assignedTo || null,
    payload: api.payload || {},
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    operator: api.payload?.operator || undefined,
  };
}

export function activityToApi(input = {}) {
  const subjectType = input.subjectType || input.entityType;
  const subjectId = input.subjectId || input.entityId;
  const description = input.description ?? input.note ?? input.summary ?? null;
  const activityType = input.activityType || input.type || 'note';
  const dueAt = input.dueAt ?? input.nextFollowUpDate ?? input.nextFollowUp ?? null;

  return {
    subjectType,
    subjectId,
    activityType,
    title: input.title ?? null,
    description,
    note: description,
    type: activityType,
    occurredAt: input.occurredAt || input.date || undefined,
    dueAt: dueAt || undefined,
    nextFollowUpDate: dueAt || undefined,
    assignedTo: input.assignedTo || undefined,
    payload: input.payload || undefined,
  };
}

export default { activityFromApi, activityToApi };
