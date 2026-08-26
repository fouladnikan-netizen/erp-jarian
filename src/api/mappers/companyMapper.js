/**
 * Map Kanoon Contact ↔ backend Company DTO.
 * Extra CRM fields live in payload until dedicated columns exist.
 */

function pickPayload(contact) {
  const {
    id,
    name,
    companyName,
    entityType,
    nationalId,
    province,
    activityDomain,
    lifecycle_stage,
    lifecycleStage,
    phone,
    assignee,
    relatedPersons,
    interactions,
    recordType,
    payload,
    ...rest
  } = contact;

  return {
    ...(payload && typeof payload === 'object' ? payload : {}),
    ...rest,
    recordType: recordType || 'CUSTOMER',
    lifecycleStage: lifecycleStage || lifecycle_stage,
    relatedPersons: relatedPersons || [],
    interactions: interactions || [],
  };
}

export function contactToApi(contact) {
  const name = String(contact.name || contact.companyName || contact.displayName || '').trim();
  return {
    name,
    entityType: contact.entityType === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER',
    nationalId: contact.nationalId || contact.national_id || null,
    province: contact.province || null,
    activityDomain: contact.activityDomain || contact.activity_domain || null,
    lifecycleStage: contact.lifecycle_stage || contact.lifecycleStage || null,
    phone: contact.phone || null,
    assigneeName: contact.assignee?.name || contact.assigneeName || null,
    assigneeRole: contact.assignee?.role || contact.assigneeRole || null,
    payload: pickPayload(contact),
  };
}

export function contactFromApi(row) {
  if (!row) return null;
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const persons = row.persons || payload.relatedPersons || [];

  return {
    ...payload,
    id: row.id,
    name: row.name,
    companyName: row.name,
    entityType: row.entityType || 'CUSTOMER',
    nationalId: row.nationalId,
    province: row.province,
    activityDomain: row.activityDomain,
    lifecycle_stage: row.lifecycleStage || payload.lifecycle_stage || payload.lifecycleStage,
    lifecycleStage: row.lifecycleStage || payload.lifecycleStage || payload.lifecycle_stage,
    phone: row.phone,
    assignee: row.assignee || (row.assigneeName ? { name: row.assigneeName, role: row.assigneeRole } : null),
    relatedPersons: persons,
    interactions: payload.interactions || [],
    recordType: payload.recordType || 'CUSTOMER',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
