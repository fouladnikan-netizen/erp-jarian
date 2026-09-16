/**
 * Map API Task ↔ Pooyesh / Mowj task shape (DDL-16).
 */

export function taskFromApi(api) {
  if (!api) return null;
  const payload = api.payload && typeof api.payload === 'object' ? api.payload : {};
  const assigneeName = payload.assigneeName || null;
  return {
    id: api.id,
    title: api.title,
    description: api.description || null,
    status: api.status || 'OPEN',
    priority: api.priority || 'normal',
    assignedTo: api.assignedTo
      ? { userId: api.assignedTo, name: assigneeName || '—' }
      : null,
    subject: {
      entityType: api.subjectType,
      entityId: api.subjectId,
    },
    subjectType: api.subjectType,
    subjectId: api.subjectId,
    companyReference: api.subjectType === 'COMPANY'
      ? { companyId: api.subjectId }
      : (payload.companyReference || null),
    rawLeadReference: api.subjectType === 'RAW_LEAD'
      ? { leadId: api.subjectId }
      : (payload.rawLeadReference || null),
    contactReference: payload.contactReference || null,
    campaignReference: payload.campaignReference || null,
    dueDate: api.dueAt || null,
    dueAt: api.dueAt || null,
    completedAt: api.completedAt || null,
    sourceModule: payload.sourceModule || 'pooyesh',
    payload,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export function taskToApi(input = {}) {
  const subjectType = input.subjectType
    || input.subject?.entityType
    || (input.companyReference?.companyId ? 'COMPANY' : null)
    || (input.rawLeadReference?.leadId ? 'RAW_LEAD' : null);
  const subjectId = input.subjectId
    || input.subject?.entityId
    || input.companyReference?.companyId
    || input.rawLeadReference?.leadId;

  const assignedTo = typeof input.assignedTo === 'object'
    ? (input.assignedTo?.userId || null)
    : (input.assignedTo || null);
  const assigneeName = typeof input.assignedTo === 'object'
    ? (input.assignedTo?.name || null)
    : (input.assigneeName || null);

  return {
    subjectType,
    subjectId,
    title: input.title,
    description: input.description ?? null,
    priority: input.priority || 'normal',
    assignedTo,
    assigneeName,
    dueAt: input.dueAt ?? input.dueDate ?? null,
    dueDate: input.dueDate ?? input.dueAt ?? null,
    payload: {
      ...(input.payload || {}),
      contactReference: input.contactReference || undefined,
      companyReference: input.companyReference || undefined,
      rawLeadReference: input.rawLeadReference || undefined,
      campaignReference: input.campaignReference || undefined,
      sourceModule: input.sourceModule || input.meta?.sourceModule || undefined,
      assigneeName: assigneeName || undefined,
    },
  };
}

export default { taskFromApi, taskToApi };
