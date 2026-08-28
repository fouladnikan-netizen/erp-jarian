/**
 * Canonical Contact orchestration — company create + Linka enrichment (DDL-26).
 * Single write path: Contact + CompanyContactRelationship (never contact_persons).
 */
import { newEntityId } from '../lib/ids.js';
import * as contactRepo from '../repositories/contactRepository.js';
import * as relationshipRepo from '../repositories/companyContactRelationshipRepository.js';
import {
  buildContactFields,
} from './contactService.js';
import {
  buildContactPersonUpserts,
} from '../domain/companyIdentity/linkaPersonMapper.js';

const CEO_POST_RE = /مدیر\s*عامل/;

/** Linka official person: verified nationalCode + display name → canonical Contact candidate. */
export function isLinkaCanonicalContactCandidate(person) {
  const code = String(person?.nationalCode || '').replace(/\D/g, '');
  const name = String(person?.fullName || '').trim();
  return name.length >= 2 && code.length >= 10;
}

/** CRM create input: fullName + normalized mobile required. */
export function isCompanyCreateContactInput(person) {
  const fullName = String(person?.fullName || person?.name || '').trim();
  const mobile = String(person?.mobile || '').trim();
  return Boolean(fullName && mobile);
}

/**
 * Attach user-supplied persons during Company create (same TX).
 * @param {Array<object>} persons
 */
export async function attachPersonsFromCompanyCreate(
  companyId,
  persons,
  actorUserId,
  client,
) {
  if (!Array.isArray(persons) || persons.length === 0) return [];

  let primaryAssigned = persons.some((p) => p.isPrimary);
  const created = [];

  for (let i = 0; i < persons.length; i += 1) {
    const person = persons[i];
    if (!isCompanyCreateContactInput(person)) continue;

    const isPrimary = Boolean(person.isPrimary) || (!primaryAssigned && i === 0);
    if (isPrimary) primaryAssigned = true;

    const fields = buildContactFields({
      fullName: person.fullName || person.name,
      mobile: person.mobile,
      email: person.email || null,
      payload: {
        ...(person.payload && typeof person.payload === 'object' ? person.payload : {}),
        ...(person.gender ? { gender: person.gender } : {}),
      },
    });

    let contact = null;
    if (fields.mobileNormalized) {
      contact = await contactRepo.findByMobileNormalizedForUpdate(fields.mobileNormalized, client);
    }

    if (!contact) {
      const contactId = newEntityId('ct');
      await contactRepo.insert({ id: contactId, ...fields, actorUserId }, client);
      contact = await contactRepo.findById(contactId, client);
    } else {
      await contactRepo.update(contact.id, {
        fullName: fields.fullName,
        email: fields.email,
        emailNormalized: fields.emailNormalized,
        fullNameNormalized: fields.fullNameNormalized,
        payload: { ...(contact.payload || {}), ...(fields.payload || {}) },
      }, actorUserId, client);
    }

    const existingLink = await relationshipRepo.findActiveLink(companyId, contact.id, client);
    if (!existingLink) {
      await relationshipRepo.insert({
        id: newEntityId('ccr'),
        companyId,
        contactId: contact.id,
        roleTitle: person.roleTitle || person.jobPosition || null,
        isPrimary,
        payload: { source: 'COMPANY_CREATE' },
        actorUserId,
      }, client);
    } else if (isPrimary) {
      await relationshipRepo.setPrimary(existingLink.id, companyId, actorUserId, client);
    }

    created.push(contact);
  }

  return created;
}

/**
 * Upsert Linka official persons as canonical Contact + relationship.
 * Weak rows (no nationalCode) remain governance-only — not canonical Contacts.
 * @param {ReturnType<import('../domain/companyIdentity/linkaPersonMapper.js').dedupeLinkaPersonsByNationalCode>} personDedupe
 */
export async function upsertLinkaOfficialPersons(
  companyId,
  personDedupe,
  actorUserId,
  client,
) {
  const upserts = buildContactPersonUpserts(personDedupe, companyId);
  let primaryAssigned = false;
  let upserted = 0;

  for (const row of upserts) {
    const code = String(row.payload?.providerNationalCode || '').replace(/\D/g, '');
    if (!isLinkaCanonicalContactCandidate({ nationalCode: code, fullName: row.fullName })) {
      continue;
    }

    const roleTitles = row.payload?.linkaRoleTitles || [];
    const isCeo = roleTitles.some((t) => CEO_POST_RE.test(String(t)));
    const isPrimary = isCeo && !primaryAssigned;
    if (isPrimary) primaryAssigned = true;

    let contact = await contactRepo.findByProviderNationalCode(code, client);
    if (!contact) {
      const contactId = newEntityId('ct');
      const fields = buildContactFields({
        fullName: row.fullName,
        mobile: null,
        email: null,
        payload: row.payload,
      });
      await contactRepo.insert({ id: contactId, ...fields, actorUserId }, client);
      contact = await contactRepo.findById(contactId, client);
    } else {
      await contactRepo.update(contact.id, {
        fullName: row.fullName,
        payload: { ...(contact.payload || {}), ...row.payload },
      }, actorUserId, client);
    }

    const existingLink = await relationshipRepo.findActiveLink(companyId, contact.id, client);
    if (!existingLink) {
      await relationshipRepo.insert({
        id: newEntityId('ccr'),
        companyId,
        contactId: contact.id,
        roleTitle: row.roleTitle,
        isPrimary,
        payload: { source: 'LINKA' },
        actorUserId,
      }, client);
    } else {
      if (row.roleTitle) {
        await relationshipRepo.update(existingLink.id, { roleTitle: row.roleTitle }, actorUserId, client);
      }
      if (isPrimary) {
        await relationshipRepo.setPrimary(existingLink.id, companyId, actorUserId, client);
      }
    }
    upserted += 1;
  }

  return upserted;
}

export default {
  isLinkaCanonicalContactCandidate,
  isCompanyCreateContactInput,
  attachPersonsFromCompanyCreate,
  upsertLinkaOfficialPersons,
};
