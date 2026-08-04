/**
 * Contact Person duplicate detection policy (ADR-08 / DDL-08).
 *
 * Read-only scan of Company.relatedPersons[]. Does NOT introduce a Person
 * registry, M:N graph, or identity keys. Future standalone Person entity can
 * replace the scan inside this module while preserving the return contract.
 *
 * Mobile match = probabilistic data-quality signal, NOT confirmed identity.
 */

import { getContactPersonDisplayName } from './contactPerson.normalize.js';
import { normalizeMobile } from './mobileNormalize.js';

/**
 * @typedef {object} ContactPersonMobileMatch
 * @property {string|number} companyId
 * @property {string} companyName
 * @property {string} personId
 * @property {string} personName
 * @property {string} role
 * @property {string} mobile  Raw stored mobile (display); comparison uses normalizeMobile
 */

/**
 * @param {object} company
 * @returns {string}
 */
function resolveCompanyName(company) {
  return String(
    company?.companyName
    || company?.personName
    || company?.ownerName
    || '',
  ).trim() || '—';
}

/**
 * Pure domain lookup — scan ALL companies for ContactPersons with the same mobile.
 * Company-level exclusion is forbidden (DDL-08 scope fix).
 *
 * @param {Array<object>} companies  Company aggregates from the contacts SSOT
 * @param {unknown} mobile
 * @param {{
 *   excludeContactPersonId?: string|number,
 * }} [options]  Edit-mode only: exclude the record being edited (avoid self-match)
 * @returns {ContactPersonMobileMatch[]}
 */
export function lookupMobile(companies, mobile, options = {}) {
  const needle = normalizeMobile(mobile);
  if (!needle) return [];

  const excludeContactPersonId = options.excludeContactPersonId != null
    ? String(options.excludeContactPersonId)
    : (options.excludePersonId != null ? String(options.excludePersonId) : null);

  const matches = [];
  const list = Array.isArray(companies) ? companies : [];

  for (const company of list) {
    if (!company) continue;

    const persons = Array.isArray(company.relatedPersons) ? company.relatedPersons : [];
    for (const person of persons) {
      if (!person) continue;
      if (excludeContactPersonId && String(person.id) === excludeContactPersonId) continue;
      if (normalizeMobile(person.mobile) !== needle) continue;

      matches.push({
        companyId: company.id,
        companyName: resolveCompanyName(company),
        personId: String(person.id),
        personName: getContactPersonDisplayName(person),
        role: String(person.jobPosition || person.role || '').trim(),
        mobile: String(person.mobile || '').trim(),
      });
    }
  }

  return matches;
}

/**
 * Map lookup hits → audit / person metadata shape (DDL-08).
 * @param {ContactPersonMobileMatch[]} matches
 * @returns {Array<{ companyId: string, contactPersonId: string, matchedMobile: string }>}
 */
export function toPossibleDuplicateMatches(matches) {
  return (Array.isArray(matches) ? matches : []).map((m) => ({
    companyId: String(m.companyId),
    contactPersonId: String(m.personId),
    matchedMobile: normalizeMobile(m.mobile) || String(m.mobile || ''),
  }));
}
