/**
 * Map Linka CompanyIdentityDto → Kanoon legal payload (officialSpecs / governance / linkaIdentity).
 * activityDescription stays in linkaIdentity only — not the CRM activityDomain column.
 * Dates stored as Jalali YYYY/MM/DD; capital with thousand separators.
 */

import { toJalaliDateString, formatCapitalAmount } from './linkaDisplayFormat.js';

/**
 * @param {import('./companyIdentityDto.js').CompanyIdentityDto} identity
 */
export function buildLegalPayloadFromIdentity(identity) {
  if (!identity) {
    return { linkaIdentity: null, officialSpecs: {}, governance: {} };
  }

  const registrationDateJalali = identity.registrationDate
    ? toJalaliDateString(identity.registrationDate)
    : '';

  const linkaIdentity = {
    registrationNumber: identity.registrationNumber ?? null,
    registrationDate: registrationDateJalali || identity.registrationDate || null,
    companyType: identity.companyType ?? null,
    companyTypeProviderId: identity.companyTypeProviderId ?? null,
    legalStatus: identity.legalStatus ?? null,
    registeredCapital: identity.registeredCapital ?? null,
    city: identity.city ?? null,
    address: identity.address ?? null,
    postalCode: identity.postalCode ?? null,
    signatureAuthority: identity.signatureAuthority ?? null,
    economicCode: identity.economicCode ?? null,
    activityDescription: identity.activityDomain ?? null,
    provider: identity.rawProviderReference || 'LINKA',
    providerMeta: identity.providerMeta || null,
  };

  const officialSpecs = {
    registrationNumber: identity.registrationNumber ? String(identity.registrationNumber) : '',
    establishmentDate: registrationDateJalali,
    economicCode: identity.economicCode ? String(identity.economicCode) : '',
    postalCode: identity.postalCode ? String(identity.postalCode) : '',
    latestCapital: identity.registeredCapital != null
      ? formatCapitalAmount(identity.registeredCapital)
      : '',
    address: identity.address ? String(identity.address) : '',
    companyType: identity.companyType ? String(identity.companyType) : '',
    companyStatus: identity.legalStatus ? String(identity.legalStatus) : '',
    city: identity.city ? String(identity.city) : '',
    phone: '',
    website: '',
    latestGazette: '',
  };

  const governance = {
    signatureRight: identity.signatureAuthority ? String(identity.signatureAuthority) : '',
    ceo: { name: '', nationalId: '', validUntil: '' },
    boardMembers: [],
    boardValidUntil: '',
  };

  return { linkaIdentity, officialSpecs, governance };
}

export default { buildLegalPayloadFromIdentity };
