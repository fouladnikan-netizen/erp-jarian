/**
 * External web service integrations — managed from Shirazeh.
 * Linka: auto-fill official company data by national ID.
 */
export const WEB_SERVICES_CONFIG = {
  linka: {
    id: 'linka',
    label: 'لینکا',
    enabled: false,
    description: 'استخراج خودکار مشخصات رسمی شرکت با شناسه ملی',
    endpoint: null,
    fieldsAutoFilled: [
      'registrationNumber',
      'establishmentDate',
      'economicCode',
      'companyType',
      'companyStatus',
      'registrationRegion',
      'latestCapital',
      'phone',
      'website',
      'address',
      'postalCode',
      'city',
      'signatureAuthority',
      'latestGazette',
      'legalPersons',
      'boardMembers',
    ],
    fieldsPendingPhase2: [],
  },
};
