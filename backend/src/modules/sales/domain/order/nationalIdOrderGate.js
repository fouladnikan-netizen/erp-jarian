/**
 * Legal Customer Order gate — nationalId required before order create.
 * Lead nationalId remains optional; this applies only to Company/Customer.
 */

import { appError } from '../../../../lib/errors.js';

/**
 * @param {object|null|undefined} company
 */
export function assertLegalCustomerHasNationalId(company) {
  if (!company) return;

  const entityType = String(company.entityType || '').toUpperCase();
  if (entityType === 'SUPPLIER') return;

  const personType = String(
    company.payload?.personType
    || company.personType
    || 'legal',
  ).toLowerCase();

  // Natural persons may use nationalId differently; product gate targets legal.
  if (personType === 'natural') return;

  const nationalId = String(company.nationalId || '').trim();
  if (!nationalId) {
    throw appError(
      'CUSTOMER_NATIONAL_ID_REQUIRED',
      'برای ثبت سفارش، ابتدا شناسه ملی مشتری را در کانون تکمیل کنید.',
      400,
      {
        companyId: company.id,
        kanoonPath: company.id ? `/kanoon/customers/${company.id}` : '/kanoon',
      },
    );
  }
}

export default { assertLegalCustomerHasNationalId };
