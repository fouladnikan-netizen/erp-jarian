import {
  isDocumentOrganizationPopulated,
  toDocumentOrganization,
} from '../../domain/organizationIdentity';
import { COMPANY_BRAND } from './proformaConfig';

/**
 * Frozen copy of the pre-SSOT COMPANY_BRAND shape.
 * Only for issued/historical documents that have no organizationSnapshot.
 * Not a live source of truth.
 */
export function legacyDocumentOrganizationFromBrand() {
  return toDocumentOrganization({
    tradeName: COMPANY_BRAND.name,
    legalName: COMPANY_BRAND.name,
    nationalId: COMPANY_BRAND.nationalId,
    registrationNumber: COMPANY_BRAND.registrationNumber,
    phone: COMPANY_BRAND.phone,
    website: COMPANY_BRAND.website,
    officialAddress: COMPANY_BRAND.address,
    postalCode: COMPANY_BRAND.postalCode,
  });
}

/** Issued version or signed payload — do not overlay live identity. */
export function isHistoricalProformaPayload(payload) {
  return Boolean(payload?.signed || payload?.versionId);
}

/**
 * Live unsigned preview → current Organization Identity (may be empty).
 * Historical issued/signed → stored snapshot, else legacy brand (never rewrite).
 */
export function resolveProformaOrganization(payload, liveOrg) {
  if (isHistoricalProformaPayload(payload)) {
    const stored = payload?.viewModel?.organization;
    if (isDocumentOrganizationPopulated(stored)) return stored;
    return legacyDocumentOrganizationFromBrand();
  }
  return liveOrg || toDocumentOrganization(null);
}

/** Issued shipping voucher reprint — do not overlay live identity. */
export function resolveShippingOrganization(payload, liveOrg) {
  if (payload?.issued) {
    const stored = payload?.viewModel?.organization
      || payload?.organizationSnapshot;
    if (isDocumentOrganizationPopulated(stored)) return stored;
    return legacyDocumentOrganizationFromBrand();
  }
  return liveOrg || toDocumentOrganization(null);
}

/**
 * SooratBar prints dispatched assignments only.
 * Snapshot object present → freeze. Missing → legacy COMPANY_BRAND (never live).
 */
export function resolveSooratBarOrganization(stored) {
  if (stored && typeof stored === 'object') {
    return {
      tradeName: stored.tradeName || '',
      phone: stored.phone || '',
      tagline: stored.tagline || COMPANY_BRAND.tagline,
    };
  }
  return {
    tradeName: COMPANY_BRAND.name,
    phone: COMPANY_BRAND.phone,
    tagline: COMPANY_BRAND.tagline,
  };
}
