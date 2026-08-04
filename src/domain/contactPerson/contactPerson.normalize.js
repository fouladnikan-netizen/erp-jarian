/**
 * Normalize ContactPerson shapes from seed / legacy fields into the shared model.
 * Legacy aliases: name → fullName, role → jobPosition.
 * Owner: Company aggregate (useContactsStore). IDs for new rows via domain/identity.
 */

import { createContactPersonId } from '../identity';

/**
 * @param {object} person
 * @param {string|number} companyId
 * @returns {import('./contactPerson.types').ContactPerson}
 */
export function normalizeContactPerson(person, companyId) {
  const fullName = String(person?.fullName || person?.name || '').trim();
  const id = String(person?.id || createContactPersonId(companyId));
  const normalized = {
    id,
    companyId: String(companyId),
    fullName,
    mobile: String(person?.mobile || '').trim(),
    gender: person?.gender || '',
    jobPosition: String(person?.jobPosition || person?.role || '').trim(),
    email: String(person?.email || '').trim(),
    isPrimary: Boolean(person?.isPrimary),
  };

  /* Audit metadata (DDL-08) — probabilistic mobile reuse hint; not used by UI */
  if (person?.possibleDuplicateMobile === true) {
    normalized.possibleDuplicateMobile = true;
  }
  if (Array.isArray(person?.possibleDuplicateMatches) && person.possibleDuplicateMatches.length > 0) {
    normalized.possibleDuplicateMatches = person.possibleDuplicateMatches.map((entry) => ({
      companyId: String(entry?.companyId ?? ''),
      contactPersonId: String(entry?.contactPersonId ?? entry?.personId ?? ''),
      matchedMobile: String(entry?.matchedMobile ?? ''),
    }));
  }

  return normalized;
}

/**
 * Display helper — prefer fullName.
 * @param {import('./contactPerson.types').ContactPerson | { fullName?: string, name?: string }} person
 */
export function getContactPersonDisplayName(person) {
  return String(person?.fullName || person?.name || '').trim() || '—';
}
