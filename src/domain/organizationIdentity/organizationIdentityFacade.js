/**
 * Canonical Organization Identity (DDL-28 / DDL-29) — Shirazeh-owned singleton.
 * Any document/UI that shows the operating company must read through this facade.
 * Legal fields SSOT: GET/PUT /api/v1/organization-identity.
 * Marketing tagline SSOT: GET /api/v1/settings/document-chrome (`documentChromeFacade`).
 * COMPANY_BRAND is a deprecated historical fallback (`modules/sales/settings/legacyCompanyBrand`).
 */
import {
  EMPTY_ORGANIZATION_IDENTITY,
  OrganizationIdentityRepository,
} from '../../api/repositories/OrganizationIdentityRepository.js';
import { primaryAddress, primaryPhone } from './collections.js';

let cache = null;
let inflight = null;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

export function getCachedOrganizationIdentity() {
  return cache;
}

export function subscribeOrganizationIdentity(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setCachedOrganizationIdentity(row) {
  cache = { ...EMPTY_ORGANIZATION_IDENTITY, ...(row || {}) };
  notify();
  return cache;
}

/**
 * Load singleton from API. Never throws to callers — empty shape on failure
 * so document surfaces do not pageerror.
 */
export async function loadOrganizationIdentity({ force = false } = {}) {
  if (cache && !force) return cache;
  if (inflight) return inflight;
  inflight = OrganizationIdentityRepository.get()
    .then((row) => setCachedOrganizationIdentity(row))
    .catch(() => {
      if (!cache) setCachedOrganizationIdentity(EMPTY_ORGANIZATION_IDENTITY);
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Fields copied onto issued document versions (expand-only JSON). */
export function toDocumentOrganization(identity) {
  const src = identity || EMPTY_ORGANIZATION_IDENTITY;
  const addr = primaryAddress(src);
  return {
    tradeName: src.tradeName || '',
    legalName: src.legalName || '',
    nationalId: src.nationalId || '',
    registrationNumber: src.registrationNumber || '',
    economicNumber: src.economicNumber || '',
    phone: primaryPhone(src),
    email: src.email || '',
    website: src.website || '',
    fax: src.fax || '',
    province: addr.province,
    city: addr.city,
    officialAddress: addr.officialAddress,
    postalCode: addr.postalCode,
  };
}

export function isDocumentOrganizationPopulated(org) {
  if (!org || typeof org !== 'object') return false;
  return Boolean(
    org.tradeName
    || org.legalName
    || org.nationalId
    || org.phone
    || org.officialAddress
    || org.postalCode
    || org.website,
  );
}

/** Fields Proforma/Shipping chrome actually render. */
export function toShippingOrganizationSnapshot(identity) {
  const src = toDocumentOrganization(identity);
  return {
    tradeName: src.tradeName,
    nationalId: src.nationalId,
    registrationNumber: src.registrationNumber,
    officialAddress: src.officialAddress,
    phone: src.phone,
    postalCode: src.postalCode,
    website: src.website,
  };
}

/** SooratBar renders tradeName + tagline (tagline is not an Identity field). */
export function toSooratBarOrganizationSnapshot(identity, tagline = '') {
  return {
    tradeName: String(identity?.tradeName || '').trim(),
    phone: primaryPhone(identity),
    tagline: String(tagline || '').trim(),
  };
}

/** Official letter signatory line. */
export function toLetterOrganizationSnapshot(identity) {
  const tradeName = String(identity?.tradeName || '').trim();
  const phone = primaryPhone(identity);
  if (!tradeName && !phone) return null;
  return { tradeName, phone };
}

export const organizationIdentityFacade = {
  loadOrganizationIdentity,
  getCachedOrganizationIdentity,
  subscribeOrganizationIdentity,
  setCachedOrganizationIdentity,
  toDocumentOrganization,
  isDocumentOrganizationPopulated,
  toShippingOrganizationSnapshot,
  toSooratBarOrganizationSnapshot,
  toLetterOrganizationSnapshot,
};

export { EMPTY_ORGANIZATION_IDENTITY };
