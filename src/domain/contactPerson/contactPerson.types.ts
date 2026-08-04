/**
 * ContactPerson — reusable child entity under Company (1:N).
 *
 * Company is the aggregate root. ContactPerson belongs to exactly one company.
 * Shape is intentionally flat so a future CompanyPerson ↔ Person migration
 * can lift these fields without rewriting consumers (keep `id` + `companyId` stable).
 */

export type ContactPersonGender = 'male' | 'female' | 'unspecified' | '';

export interface ContactPerson {
  id: string;
  companyId: string;
  fullName: string;
  mobile: string;
  gender?: ContactPersonGender;
  jobPosition?: string;
  email?: string;
  /** UI convenience — at most one primary per company */
  isPrimary?: boolean;
  /**
   * Audit-only (DDL-08): probabilistic mobile-reuse signal at create time.
   * Not a confirmed same-person identity. Not for UI; future merge candidate hint.
   */
  possibleDuplicateMobile?: boolean;
  possibleDuplicateMatches?: Array<{
    companyId: string;
    contactPersonId: string;
    matchedMobile: string;
  }>;
}

export interface ContactPersonInput {
  fullName: string;
  mobile: string;
  gender?: ContactPersonGender;
  jobPosition?: string;
  email?: string;
  isPrimary?: boolean;
  id?: string;
}
