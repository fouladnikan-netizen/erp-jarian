/**
 * Map Kanoon Contact ↔ backend Company DTO.
 * Extra CRM fields live in payload until dedicated columns exist.
 */

import { enrichLegalFieldsFromPayload } from '../../domain/companyIdentity/linkaLegalFields.js';
import { CUSTOMER_ACTIVITY_DOMAINS } from '../../config/registry/customerDomains.js';
import { normalizeLifecycleKey } from '../../domain/customerLifecycle/index.js';

function normalizeLifecycleStage(value) {
  return normalizeLifecycleKey(value) || value || null;
}

/** CRM activity domain — user pick from Shirazeh list; never Linka long activityDescription. */
function resolveCrmActivityDomain(row, payload = {}) {
  const col = String(row.activityDomain || '').trim();
  const crm = String(payload.crmActivityDomain || '').trim();
  if (col && CUSTOMER_ACTIVITY_DOMAINS.includes(col)) return col;
  if (crm && CUSTOMER_ACTIVITY_DOMAINS.includes(crm)) return crm;
  return crm || null;
}

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
  const name = String(
    contact.name
      || contact.companyName
      || contact.personName
      || contact.displayName
      || '',
  ).trim();
  return {
    name,
    entityType: contact.entityType === 'SUPPLIER' || contact.entityType === 'supplier'
      ? 'SUPPLIER'
      : 'CUSTOMER',
    nationalId: contact.nationalId || contact.national_id || null,
    province: contact.province || null,
    activityDomain: contact.activityDomain || contact.activity_domain || null,
    lifecycleStage: contact.lifecycle_stage || contact.lifecycleStage || null,
    phone: contact.phone || contact.mobile || null,
    assigneeName: contact.assignee?.name || contact.assigneeName || null,
    assigneeRole: contact.assignee?.role || contact.assigneeRole || null,
    payload: pickPayload(contact),
  };
}

function mapPersonFromApi(person, companyId) {
  if (!person) return null;
  const payload = person.payload && typeof person.payload === 'object' ? person.payload : {};
  const titles = Array.isArray(payload.linkaRoleTitles)
    ? payload.linkaRoleTitles.filter(Boolean)
    : [];
  const roleTitle = person.roleTitle || titles[0] || payload.jobPosition || '';
  return {
    ...payload,
    id: person.id,
    companyId: companyId || person.companyId,
    fullName: person.fullName,
    mobile: person.mobile || '',
    jobPosition: roleTitle,
    roleTitle,
    linkaRoleTitles: titles,
    isLinkaOfficial: Boolean(payload.isLinkaOfficial || payload.source === 'LINKA'),
    providerNationalCode: payload.providerNationalCode || null,
  };
}

export function contactFromApi(row) {
  if (!row) return null;
  const rawPayload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const payload = enrichLegalFieldsFromPayload(rawPayload);
  const personsRaw = row.persons || payload.relatedPersons || [];
  const persons = personsRaw.map((p) => mapPersonFromApi(p, row.id)).filter(Boolean);
  const rawType = String(row.entityType || payload.entityType || 'CUSTOMER').toUpperCase();
  const entityType = rawType === 'SUPPLIER' ? 'supplier' : 'customer';

  return {
    ...payload,
    id: row.id,
    name: row.name,
    companyName: row.name,
    entityType,
    nationalId: row.nationalId,
    province: row.province,
    activityDomain: resolveCrmActivityDomain(row, payload),
    lifecycle_stage: normalizeLifecycleStage(row.lifecycleStage || payload.lifecycle_stage || payload.lifecycleStage),
    lifecycleStage: normalizeLifecycleStage(row.lifecycleStage || payload.lifecycleStage || payload.lifecycle_stage),
    engagementStatus: row.engagementStatus || payload.engagementStatus || 'normal',
    phone: row.phone,
    assignee: row.assignee || (row.assigneeName ? { name: row.assigneeName, role: row.assigneeRole } : null),
    relatedPersons: persons,
    interactions: payload.interactions || [],
    recordType: payload.recordType || 'CUSTOMER',
    personType: payload.personType || 'legal',
    linkaGazette: payload.linkaGazette || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
