/**
 * Flatten Kanoon companies / contact persons into searchable letter recipients.
 * Gahshomar must not invent free-text receivers — only these catalog entries.
 */

import { PERSON_TYPES } from '../../kanoon/config';
import { useContactsStore } from '../../../stores/useContactsStore';

/**
 * @typedef {object} LetterContactOption
 * @property {string} id
 * @property {string} partyId
 * @property {string} fullName
 * @property {string} companyName
 * @property {string} position
 * @property {string} mobile
 * @property {string|number|null} companyId
 */

/**
 * @returns {LetterContactOption[]}
 */
export function listLetterContactOptions() {
  const contacts = useContactsStore.getState().contacts || [];
  const options = [];

  contacts.forEach((company) => {
    const companyName = String(company.companyName || company.personName || '').trim() || '—';
    const companyId = company.id ?? null;

    if (company.personType === PERSON_TYPES.NATURAL) {
      const fullName = String(company.personName || '').trim();
      if (fullName) {
        options.push({
          id: `natural-${company.id}`,
          partyId: String(company.id),
          fullName,
          companyName,
          position: String(company.activityDomain || 'شخص حقیقی').trim() || '—',
          mobile: String(company.mobile || '').trim(),
          companyId,
        });
      }
    }

    (company.relatedPersons || []).forEach((person) => {
      const fullName = String(person.fullName || '').trim();
      if (!fullName || person.id == null) return;
      options.push({
        id: String(person.id),
        partyId: String(person.id),
        fullName,
        companyName,
        position: String(person.jobPosition || '—').trim() || '—',
        mobile: String(person.mobile || '').trim(),
        companyId: person.companyId ?? companyId,
      });
    });
  });

  return options;
}

/**
 * @param {string} [query]
 * @param {{ limit?: number }} [options]
 * @returns {LetterContactOption[]}
 */
export function searchLetterContacts(query = '', options = {}) {
  const limit = Number(options.limit) > 0 ? Number(options.limit) : 40;
  const q = String(query || '').trim().toLowerCase();
  const all = listLetterContactOptions();
  if (!q) return all.slice(0, limit);

  return all
    .filter((item) => {
      const hay = [
        item.fullName,
        item.companyName,
        item.position,
        item.mobile,
      ].join(' ').toLowerCase();
      return hay.includes(q);
    })
    .slice(0, limit);
}

/**
 * Build a RecordParticipant from a Kanoon contact option.
 * @param {LetterContactOption} option
 * @param {'RECEIVER'|'SENDER'} role
 */
export function buildContactParticipant(option, role = 'RECEIVER') {
  if (!option?.partyId) return null;
  return {
    partyType: 'CONTACT',
    role,
    partyId: String(option.partyId),
    name: String(option.fullName || '').trim() || null,
    companyId: option.companyId ?? null,
    companyName: String(option.companyName || '').trim() || null,
    position: String(option.position || '').trim() || null,
    mobile: String(option.mobile || '').trim() || null,
    userId: null,
  };
}
