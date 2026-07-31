function TrophyIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 6H5a2 2 0 0 0 0 4h2M17 6h2a2 2 0 0 1 0 4h-2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 13.5c.8.9 1.9 1.5 3 1.5s2.2-.6 3-1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * مودال جشن پس از تایید معامله موفق — نقل‌قول تصادفی شوالیه فروش
 */
export default function DealCelebrationModal({ open, quote, onThanks }) {
  if (!open) return null;

  return (
    <div className="deal-celebration" role="presentation">
      <button
        type="button"
        className="deal-celebration__backdrop"
        aria-label="بستن"
        onClick={onThanks}
      />
      <div
        className="deal-celebration__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deal-celebration-quote"
      >
        <div className="deal-celebration__icon" aria-hidden="true">
          <TrophyIcon />
        </div>
        <p id="deal-celebration-quote" className="deal-celebration__quote font-meem">
          {quote}
        </p>
        <button
          type="button"
          className="btn deal-celebration__thanks"
          onClick={onThanks}
        >
          ممنون
        </button>
      </div>
    </div>
  );
}
