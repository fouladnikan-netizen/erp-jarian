import {
  isDocumentOrganizationPopulated,
  toDocumentOrganization,
} from '../../domain/organizationIdentity';
import {
  DOCUMENT_CHROME_TAGLINE,
  LEGACY_DOCUMENT_ORGANIZATION,
} from '../../domain/settings/documentChrome.js';

/**
 * Frozen pre-SSOT operating-company copy.
 * Only for issued/historical documents that have no organizationSnapshot.
 * Not a live source of truth — live chrome uses Organization Identity + document-chrome API.
 */
export function legacyDocumentOrganizationFromBrand() {
  return toDocumentOrganization({
    tradeName: LEGACY_DOCUMENT_ORGANIZATION.tradeName,
    legalName: LEGACY_DOCUMENT_ORGANIZATION.legalName,
    nationalId: LEGACY_DOCUMENT_ORGANIZATION.nationalId,
    registrationNumber: LEGACY_DOCUMENT_ORGANIZATION.registrationNumber,
    phone: LEGACY_DOCUMENT_ORGANIZATION.phone,
    website: LEGACY_DOCUMENT_ORGANIZATION.website,
    officialAddress: LEGACY_DOCUMENT_ORGANIZATION.officialAddress,
    postalCode: LEGACY_DOCUMENT_ORGANIZATION.postalCode,
  });
}

/** Issued version or signed payload — do not overlay live identity. */
export function isHistoricalProformaPayload(payload) {
  return Boolean(payload?.signed || payload?.versionId);
}

/**
 * Live unsigned preview → current Organization Identity (may be empty).
 * Historical issued/signed → stored snapshot, else frozen legacy (never rewrite).
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
 * Snapshot object present → freeze. Missing → frozen legacy chrome (never live).
 */
export function resolveSooratBarOrganization(stored) {
  if (stored && typeof stored === 'object') {
    return {
      tradeName: stored.tradeName || '',
      phone: stored.phone || '',
      tagline: stored.tagline || DOCUMENT_CHROME_TAGLINE,
    };
  }
  return {
    tradeName: LEGACY_DOCUMENT_ORGANIZATION.tradeName,
    phone: LEGACY_DOCUMENT_ORGANIZATION.phone,
    tagline: DOCUMENT_CHROME_TAGLINE,
  };
}
