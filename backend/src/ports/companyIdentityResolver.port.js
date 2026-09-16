/**
 * Company identity resolver port (Linka boundary).
 * Lead services must not call Linka HTTP directly — use this port or injected resolver.
 */
import { createCompanyIdentityResolver } from '../integrations/companyIdentity/createCompanyIdentityResolver.js';
import { userMessageForCode } from '../integrations/linka/linkaErrors.js';

const defaultResolver = createCompanyIdentityResolver();

/**
 * Legacy-compatible port result for leadService.
 * @typedef {Object} LegacyIdentityResult
 * @property {boolean} ok
 * @property {string} [nationalId]
 * @property {string} [suggestedName]
 * @property {string} [errorCode]
 * @property {string} [error]
 * @property {Record<string, unknown>} [details]
 */

/**
 * @param {{ nationalId: string, companyName?: string|null, requestId?: string|null }} input
 * @param {{ resolver?: typeof defaultResolver }} [options]
 * @returns {Promise<LegacyIdentityResult>}
 */
export async function resolveCompanyIdentity(input = {}, options = {}) {
  const resolver = options.resolver || defaultResolver;
  const result = await resolver(input);

  if (!result.ok) {
    return {
      ok: false,
      errorCode: result.errorCode,
      error: userMessageForCode(result.errorCode, result.error),
      details: result.details,
    };
  }

  const { identity } = result;
  return {
    ok: true,
    nationalId: identity.nationalId,
    suggestedName: identity.name,
    identity,
  };
}

/** Re-create resolver after env changes (tests). */
export function refreshCompanyIdentityResolver() {
  return createCompanyIdentityResolver();
}

export default { resolveCompanyIdentity, refreshCompanyIdentityResolver };
