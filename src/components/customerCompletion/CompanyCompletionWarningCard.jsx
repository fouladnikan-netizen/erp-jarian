import { UserPlus } from 'lucide-react';
import './customerCompletion.css';

/**
 * Warning card when company is Registered but not Operational (no ContactPerson).
 * Optional CTA — when omitted, the page header owns the action button.
 */
export default function CompanyCompletionWarningCard({ onAddContactPerson }) {
  return (
    <section
      className="company-completion-warning"
      role="status"
      aria-live="polite"
      dir="rtl"
    >
      <h3 className="company-completion-warning__title font-meem">
        این شرکت هنوز آماده استفاده در سیستم نیست.
      </h3>
      <p
        className={`company-completion-warning__body font-meem${
          onAddContactPerson ? '' : ' company-completion-warning__body--solo'
        }`}
      >
        برای ادامه فعالیت، حداقل یک فرد مرتبط ثبت کنید.
      </p>
      {typeof onAddContactPerson === 'function' ? (
        <button
          type="button"
          className="company-completion-warning__action font-meem"
          onClick={onAddContactPerson}
        >
          <UserPlus size={16} strokeWidth={1.75} aria-hidden="true" />
          افزودن فرد مرتبط
        </button>
      ) : null}
    </section>
  );
}
