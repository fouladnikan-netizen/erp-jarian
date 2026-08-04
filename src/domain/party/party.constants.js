/**
 * Party / Company vocabulary — shared business constants.
 *
 * Domain language:
 * - Company  ≡ Contact aggregate root (runtime field names still use "contact")
 * - Customer ≡ Company with entityType customer
 * - Supplier ≡ Company with entityType supplier
 * - Opportunity / Lead ≡ Company viewed via lifecycle_stage (Ofogh) — not a separate table
 *
 * @see Docs/architecture/ENTITY_OWNERSHIP.md
 */

export const ENTITY_TYPES = Object.freeze({
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
});

export const PERSON_TYPES = Object.freeze({
  LEGAL: 'legal',
  NATURAL: 'natural',
});
