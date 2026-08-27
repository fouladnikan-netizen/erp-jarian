/**
 * Factory — selects CompanyIdentity resolver adapter from ENV.
 * Domain services inject nothing; tests may override via leadService deps.
 */
import { loadLinkaConfig } from '../linka/linkaConfig.js';
import { resolveCompanyIdentityMock } from '../linka/mockCompanyIdentity.adapter.js';
import { resolveCompanyIdentityLinka } from '../linka/linkaCompanyIdentity.adapter.js';

/**
 * @returns {(input: { nationalId: string, companyName?: string|null, requestId?: string|null }) => Promise<import('../../domain/companyIdentity/companyIdentityDto.js').CompanyIdentityResult>}
 */
export function createCompanyIdentityResolver() {
  const cfg = loadLinkaConfig();
  if (cfg.enabled) {
    return resolveCompanyIdentityLinka;
  }
  return resolveCompanyIdentityMock;
}

export default { createCompanyIdentityResolver };
