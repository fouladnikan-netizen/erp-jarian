/**
 * Finance eligibility gate (DDL-14).
 * No Finance backend yet — domain contract only for future services.
 */

import {
  assertEntityEligibleFor,
  ERP_CAPABILITY,
  companyReference,
} from '../entityReference';

/**
 * @param {string|number|{entityType:string,entityId:string}} subjectOrCompanyId
 */
export function assertEligibleForFinance(subjectOrCompanyId) {
  const subject = typeof subjectOrCompanyId === 'object'
    ? subjectOrCompanyId
    : companyReference(subjectOrCompanyId);
  return assertEntityEligibleFor(subject, ERP_CAPABILITY.FINANCE);
}

export function assertEligibleForQuotation(subjectOrCompanyId) {
  const subject = typeof subjectOrCompanyId === 'object'
    ? subjectOrCompanyId
    : companyReference(subjectOrCompanyId);
  return assertEntityEligibleFor(subject, ERP_CAPABILITY.QUOTATION);
}

export default {
  assertEligibleForFinance,
  assertEligibleForQuotation,
};
