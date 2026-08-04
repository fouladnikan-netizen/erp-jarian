/**
 * Letter counterparties = Kanoon companies (same catalog shape as Nabz CustomerCombobox).
 * No free-text receivers.
 */

import { getDisplayName } from '../../kanoon/columns';
import { useContactsStore } from '../../../stores/useContactsStore';

/**
 * Active companies from Kanoon (customers + suppliers), same SSOT as order form.
 */
export function listLetterCompanies() {
  return (useContactsStore.getState().contacts || []).filter(
    (contact) => contact.isActive !== false,
  );
}

/**
 * @param {string} [query]
 * @param {{ limit?: number }} [options]
 */
export function searchLetterContacts(query = '', options = {}) {
  const limit = Number(options.limit) > 0 ? Number(options.limit) : 40;
  const q = String(query || '').trim().toLowerCase();
  const all = listLetterCompanies();
  if (!q) return all.slice(0, limit);

  return all
    .filter((contact) => {
      const hay = [
        getDisplayName(contact),
        contact.province,
        contact.activityDomain,
        contact.mobile,
        contact.nationalId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    })
    .slice(0, limit);
}

/**
 * Build a RecordParticipant from a Kanoon company (CustomerCombobox-equivalent pick).
 * @param {object} company
 * @param {'RECEIVER'|'SENDER'} role
 */
export function buildCompanyParticipant(company, role = 'RECEIVER') {
  if (company?.id == null) return null;
  const name = getDisplayName(company) || null;
  return {
    partyType: 'CONTACT',
    role,
    partyId: String(company.id),
    name,
    companyId: company.id,
    companyName: name,
    position: String(company.activityDomain || '').trim() || null,
    mobile: String(company.mobile || '').trim() || null,
    userId: null,
  };
}

/** @deprecated Use buildCompanyParticipant — kept for older call sites. */
export function buildContactParticipant(option, role = 'RECEIVER') {
  if (option?.id != null && (option.companyName != null || option.personName != null || option.entityType)) {
    return buildCompanyParticipant(option, role);
  }
  if (!option?.partyId) return null;
  return {
    partyType: 'CONTACT',
    role,
    partyId: String(option.partyId),
    name: String(option.fullName || option.name || '').trim() || null,
    companyId: option.companyId ?? null,
    companyName: String(option.companyName || '').trim() || null,
    position: String(option.position || '').trim() || null,
    mobile: String(option.mobile || '').trim() || null,
    userId: null,
  };
}
