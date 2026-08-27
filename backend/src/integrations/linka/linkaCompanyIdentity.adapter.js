/**
 * Linka production company identity adapter.
 * Login JWT + GET CompanyBaseInfo — contract verified 2026-08-27.
 */
import { normalizeNationalId } from '../../domain/companyIdentity/normalizeNationalId.js';
import { identityFailure } from '../../domain/companyIdentity/companyIdentityDto.js';
import { assertLinkaProductionReady } from './linkaConfig.js';
import { callLinkaLookup } from './linkaClient.js';
import { mapLinkaResponse } from './linkaMapper.js';
import { userMessageForCode } from './linkaErrors.js';

/**
 * @param {{ nationalId: string, companyName?: string|null, requestId?: string|null, fetchImpl?: typeof fetch }} input
 */
export async function resolveCompanyIdentityLinka(input = {}) {
  const normalized = normalizeNationalId(input.nationalId);
  if (!normalized.ok) {
    return identityFailure(
      'COMPANY_IDENTITY_INVALID_NATIONAL_ID',
      normalized.error,
      { nationalId: normalized.nationalId },
    );
  }

  const readiness = assertLinkaProductionReady();
  if (!readiness.ok) {
    return identityFailure(
      readiness.errorCode,
      userMessageForCode(readiness.errorCode, readiness.message),
    );
  }

  const http = await callLinkaLookup({
    nationalId: normalized.nationalId,
    requestId: input.requestId || null,
    fetchImpl: input.fetchImpl,
  });

  if (!http.ok) {
    return identityFailure(
      http.errorCode,
      userMessageForCode(http.errorCode),
      { status: http.status, ...(http.details || {}) },
    );
  }

  return mapLinkaResponse(http.data, {
    nationalId: normalized.nationalId,
    companyName: input.companyName,
  });
}

export default { resolveCompanyIdentityLinka };
