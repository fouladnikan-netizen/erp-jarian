/**
 * Mock company identity resolver — development / tests without Linka HTTP.
 */
import { normalizeNationalId } from '../../domain/companyIdentity/normalizeNationalId.js';
import { identitySuccess, identityFailure } from '../../domain/companyIdentity/companyIdentityDto.js';
import { COMPANY_IDENTITY_ERRORS } from './linkaErrors.js';

/**
 * @param {{ nationalId: string, companyName?: string|null }} input
 * @returns {Promise<import('../../domain/companyIdentity/companyIdentityDto.js').CompanyIdentityResult>}
 */
export async function resolveCompanyIdentityMock(input = {}) {
  const normalized = normalizeNationalId(input.nationalId);
  if (!normalized.ok) {
    return identityFailure(
      COMPANY_IDENTITY_ERRORS.INVALID_NATIONAL_ID,
      normalized.error,
      { nationalId: normalized.nationalId },
    );
  }

  return identitySuccess({
    nationalId: normalized.nationalId,
    name: String(input.companyName || '').trim() || `شرکت ${normalized.nationalId}`,
    registrationNumber: null,
    registrationDate: null,
    companyType: null,
    companyTypeProviderId: null,
    legalStatus: null,
    registeredCapital: null,
    province: null,
    city: null,
    address: null,
    postalCode: null,
    activityDomain: null,
    signatureAuthority: null,
    economicCode: null,
    rawProviderReference: 'mock',
    providerMeta: null,
  });
}

export default { resolveCompanyIdentityMock };
