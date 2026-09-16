/**
 * Customer Completion Policy — rule registry.
 *
 * Add future requirements here (tax, billing address, credit, contracts)
 * without touching Nabz / Ofogh / Poyesh / Gahshomar call sites.
 *
 * Each rule:
 * - id: stable machine key (appears in `missing[]`)
 * - label: Persian UI label
 * - weight: relative share of completion % (normalized across active rules)
 * - required: if true, failing the rule blocks isOperational
 * - appliesTo: optional filter (company) => boolean — skip rule when false
 * - check: (company) => boolean — true when satisfied
 */

/** Local constant — avoid domain → module imports. */
const NATURAL = 'natural';

function hasRegistrationIdentity(company) {
  if (!company) return false;
  if (company.personType === NATURAL) {
    return Boolean(String(company.personName || '').trim());
  }
  return Boolean(String(company.companyName || '').trim());
}

function hasNationalId(company) {
  return Boolean(String(company?.nationalId || '').trim());
}

function hasContactPerson(company) {
  if (!company) return false;
  /* Natural person IS the contact — no relatedPersons required. */
  if (company.personType === NATURAL) return true;
  return Array.isArray(company.relatedPersons) && company.relatedPersons.length > 0;
}

/** Extensible rule table — append new rules; do not reorder ids casually. */
export const CUSTOMER_COMPLETION_RULES = [
  {
    id: 'companyRegistration',
    label: 'اطلاعات ثبتی',
    weight: 35,
    required: true,
    check: hasRegistrationIdentity,
  },
  {
    id: 'nationalId',
    label: 'شناسه ملی',
    weight: 35,
    required: true,
    check: hasNationalId,
  },
  {
    id: 'contactPerson',
    label: 'فرد مرتبط',
    weight: 30,
    required: true,
    /* Future M:N: still “at least one person linked to this company”. */
    check: hasContactPerson,
  },
  /* Future examples (keep commented — do not enable yet):
  { id: 'taxInfo', label: 'اطلاعات مالیاتی', weight: 10, required: false, check: (c) => Boolean(c?.taxId) },
  { id: 'billingAddress', label: 'آدرس صورتحساب', weight: 10, required: false, check: (c) => Boolean(c?.billingAddress) },
  { id: 'creditStatus', label: 'وضعیت اعتباری', weight: 10, required: false, check: (c) => c?.creditStatus != null },
  { id: 'contracts', label: 'قرارداد', weight: 10, required: false, check: (c) => (c?.contracts?.length || 0) > 0 },
  */
];
