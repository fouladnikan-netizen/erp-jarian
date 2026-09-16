/**
 * Party / Company vocabulary — shared business constants.
 *
 * Domain language:
 * - Company  ≡ Contact aggregate root (runtime field names still use "contact")
 * - Customer ≡ Company with entityType customer
 * - Supplier ≡ Company with entityType supplier
 * - Opportunity ≡ Company viewed via lifecycle_stage (Ofogh UX) — DDL-04; not a separate table
 * - Raw Lead ≡ independent Ofogh aggregate (DDL-13) — NOT a Company facet; see useLeadsStore (temporary client-only)
 *
 * @see Docs/architecture/ENTITY_OWNERSHIP.md
 * @see Docs/architecture/DOMAIN_DECISION_LOG.md (DDL-04, DDL-13)
 */

export const ENTITY_TYPES = Object.freeze({
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
});

export const PERSON_TYPES = Object.freeze({
  LEGAL: 'legal',
  NATURAL: 'natural',
});
