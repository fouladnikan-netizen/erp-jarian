/**
 * Document chrome that is NOT Organization Identity (DDL-28).
 *
 * Legal / operating-company fields: GET/PUT /api/v1/organization-identity.
 * This file owns marketing tagline + the historical fallback used only when
 * an issued document has no organizationSnapshot.
 *
 * Frontend COMPANY_BRAND is a deprecated view of this + org identity — not SSOT.
 */
export const DOCUMENT_CHROME_TAGLINE =
  'تأمین‌کننده تخصصی مقاطع فولادی، استنلس استیل و چوب روسی';

/**
 * Frozen pre-SSOT operating-company copy. Never write this into new documents
 * when Organization Identity is populated. Historical reprints only.
 */
export const LEGACY_DOCUMENT_ORGANIZATION = Object.freeze({
  tradeName: 'پترو فولاد نیکان',
  legalName: 'پترو فولاد نیکان',
  nationalId: '۱۴۰۱۳۹۹۸۰۵۵',
  registrationNumber: '۶۴۲۴۹۰',
  website: 'www.fouladnikan.com',
  phone: '۰۲۱-۷۱۶۸۳۰۰۰',
  postalCode: '۱۵۴۹۸۴۷۱۲۰',
  officialAddress: 'تهران، بلوار میرداماد، خیابان مصدق جنوبی، کوچه تابان شرقی، پلاک ۳، واحد ۷',
});

export const documentChrome = {
  tagline: DOCUMENT_CHROME_TAGLINE,
  legacyOrganization: LEGACY_DOCUMENT_ORGANIZATION,
};
