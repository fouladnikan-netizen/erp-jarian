/**
 * @deprecated Historical reprint fallback only — not a live SSOT.
 * Live legal fields: Organization Identity API.
 * Live tagline: GET /api/v1/settings/document-chrome (documentChromeFacade).
 */
import {
  DOCUMENT_CHROME_TAGLINE,
  LEGACY_DOCUMENT_ORGANIZATION,
} from '../../../domain/settings/documentChrome.js';

export const COMPANY_BRAND = Object.freeze({
  name: LEGACY_DOCUMENT_ORGANIZATION.tradeName,
  tagline: DOCUMENT_CHROME_TAGLINE,
  nationalId: LEGACY_DOCUMENT_ORGANIZATION.nationalId,
  registrationNumber: LEGACY_DOCUMENT_ORGANIZATION.registrationNumber,
  website: LEGACY_DOCUMENT_ORGANIZATION.website,
  phone: LEGACY_DOCUMENT_ORGANIZATION.phone,
  postalCode: LEGACY_DOCUMENT_ORGANIZATION.postalCode,
  address: LEGACY_DOCUMENT_ORGANIZATION.officialAddress,
});
