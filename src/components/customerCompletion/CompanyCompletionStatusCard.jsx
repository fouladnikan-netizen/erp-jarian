import './customerCompletion.css';

/**
 * Glass status card — company completion checklist for Kanoon profile.
 */
export default function CompanyCompletionStatusCard({ evaluation }) {
  if (!evaluation) return null;

  const { completion, checks, isOperational } = evaluation;
  const pct = Math.max(0, Math.min(100, Number(completion) || 0));

  return (
    <section
      className={`company-completion-status${isOperational ? ' is-complete' : ''}`}
      aria-label="وضعیت اطلاعات شرکت"
      dir="rtl"
    >
      <header className="company-completion-status__head">
        <h3 className="company-completion-status__title font-meem">وضعیت اطلاعات شرکت</h3>
        <span className="company-completion-status__pct font-yekan" aria-live="polite">
          {pct.toLocaleString('fa-IR')}٪
        </span>
      </header>

      <div
        className="company-completion-status__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="درصد تکمیل اطلاعات"
      >
        <div
          className="company-completion-status__bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="company-completion-status__list">
        {checks.map((item) => (
          <li
            key={item.id}
            className={`company-completion-status__item${item.ok ? ' is-ok' : ' is-missing'}`}
          >
            <span className="company-completion-status__mark" aria-hidden="true">
              {item.ok ? '✓' : '✗'}
            </span>
            <span className="company-completion-status__label font-meem">{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
