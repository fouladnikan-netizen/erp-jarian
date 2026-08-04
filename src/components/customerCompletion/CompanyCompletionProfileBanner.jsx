import { useMemo } from 'react';
import { evaluateCompanyCompletion } from '../../domain/customerCompletion';
import './customerCompletion.css';

/**
 * Compact company-completion indicator for Customer Profile.
 * Large status / warning cards were removed to reclaim vertical space.
 * Policy evaluation is unchanged — this is presentation only.
 */
export default function CompanyCompletionProfileBanner({ company }) {
  const evaluation = useMemo(
    () => evaluateCompanyCompletion(company),
    [company],
  );

  if (!company || evaluation.isOperational) return null;

  const needsContactPerson = evaluation.missing.includes('contactPerson');
  const label = needsContactPerson
    ? 'نیازمند تکمیل فرد مرتبط'
    : 'نیازمند تکمیل اطلاعات شرکت';

  return (
    <p
      className="company-completion-badge company-completion-badge--warn font-meem"
      role="status"
      aria-live="polite"
      dir="rtl"
    >
      {label}
    </p>
  );
}
