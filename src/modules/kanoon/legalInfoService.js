/**
 * Kanoon Legal Information Service
 *
 * Persistence boundary for Company registry / legal identity fields.
 * UI (LegalInfoModal) must call this module — not `useContactsStore.updateContact`
 * directly — so CustomerProfilePage stays a composition layer.
 *
 * Current storage:
 *   Service → useContactsStore.updateContact → Company aggregate
 *
 * No schema / API migration in this layer.
 */

import { useContactsStore } from '../../stores/useContactsStore';

function findCompany(companyId) {
  if (companyId == null || companyId === '') return null;
  return useContactsStore.getState().contacts.find(
    (contact) => String(contact.id) === String(companyId),
  ) || null;
}

function trimText(value) {
  return String(value ?? '').trim();
}

/**
 * Persist legal / registry fields for a Company.
 *
 * @param {string|number} companyId
 * @param {{
 *   nationalId?: string,
 *   registrationNumber?: string,
 *   establishmentDate?: string,
 *   economicCode?: string,
 *   postalCode?: string,
 *   latestCapital?: string,
 *   website?: string,
 *   phone?: string,
 *   latestGazette?: string,
 *   address?: string,
 *   ceoName?: string,
 *   ceoNationalId?: string,
 *   ceoValidUntil?: string,
 *   boardMembers?: Array<{ role?: string, name?: string, nationalId?: string }>,
 *   boardValidUntil?: string,
 *   signatureRight?: string,
 * }} payload — flat draft shape from LegalInfoModal
 * @returns {boolean} true when the company existed and was updated
 */
export function updateCompanyLegalInfo(companyId, payload = {}) {
  const company = findCompany(companyId);
  if (!company) return false;

  const specs = company.officialSpecs || {};
  const gov = company.governance || {};
  const boardMembers = Array.isArray(payload.boardMembers) ? payload.boardMembers : [];

  useContactsStore.getState().updateContact(companyId, {
    nationalId: trimText(payload.nationalId),
    officialSpecs: {
      ...specs,
      registrationNumber: trimText(payload.registrationNumber),
      establishmentDate: trimText(payload.establishmentDate),
      economicCode: trimText(payload.economicCode),
      postalCode: trimText(payload.postalCode),
      latestCapital: trimText(payload.latestCapital),
      website: trimText(payload.website),
      phone: trimText(payload.phone),
      latestGazette: trimText(payload.latestGazette),
      address: trimText(payload.address),
    },
    governance: {
      ...gov,
      ceo: {
        name: trimText(payload.ceoName),
        nationalId: trimText(payload.ceoNationalId),
        validUntil: trimText(payload.ceoValidUntil),
      },
      boardMembers: boardMembers.filter(
        (member) => trimText(member?.name) || trimText(member?.nationalId),
      ),
      boardValidUntil: trimText(payload.boardValidUntil),
      signatureRight: trimText(payload.signatureRight),
    },
  });

  return true;
}

export const legalInfoService = {
  updateCompanyLegalInfo,
};

export default legalInfoService;
