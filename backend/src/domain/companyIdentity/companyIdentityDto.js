/**
 * Provider-agnostic Company identity DTO — anti-corruption output for Kanoon create/link.
 * Only fields validated from a documented Linka contract belong here.
 */

/**
 * @typedef {Object} CompanyIdentityDto
 * @property {string} nationalId
 * @property {string} name
 * @property {string|null} [registrationNumber]
 * @property {string|null} [registrationDate]
 * @property {string|null} [companyType]
 * @property {number|null} [companyTypeProviderId]
 * @property {string|null} [legalStatus]
 * @property {number|null} [registeredCapital]
 * @property {string|null} [province]
 * @property {string|null} [city]
 * @property {string|null} [address]
 * @property {string|null} [postalCode]
 * @property {string|null} [activityDomain]
 * @property {string|null} [signatureAuthority]
 * @property {string|null} [economicCode]
 * @property {string|null} [rawProviderReference]
 * @property {Record<string, unknown>|null} [providerMeta]
 */

/**
 * @typedef {Object} CompanyIdentitySuccess
 * @property {true} ok
 * @property {CompanyIdentityDto} identity
 */

/**
 * @typedef {Object} CompanyIdentityFailure
 * @property {false} ok
 * @property {string} errorCode
 * @property {string} error
 * @property {Record<string, unknown>} [details]
 */

/** @typedef {CompanyIdentitySuccess | CompanyIdentityFailure} CompanyIdentityResult */

/**
 * @param {CompanyIdentityDto} identity
 * @returns {CompanyIdentitySuccess}
 */
export function identitySuccess(identity) {
  return { ok: true, identity };
}

/**
 * @param {string} errorCode
 * @param {string} message
 * @param {Record<string, unknown>} [details]
 * @returns {CompanyIdentityFailure}
 */
export function identityFailure(errorCode, message, details) {
  return { ok: false, errorCode, error: message, details };
}

export default { identitySuccess, identityFailure };
