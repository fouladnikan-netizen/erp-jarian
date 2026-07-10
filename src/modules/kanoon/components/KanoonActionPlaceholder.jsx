import { KANOON_ACTION } from '../kanoonActionTypes';
import { getDisplayName } from '../columns';

const TITLES = {
  [KANOON_ACTION.NEW_ORDER]: 'ثبت سفارش جدید',
  [KANOON_ACTION.NEW_ACTIVITY]: 'ثبت پویش جدید',
};

export default function KanoonActionPlaceholder({ action, contact, onClose }) {
  const title = TITLES[action.type] || 'عملیات';

  return (
    <div className="kanoon-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="kanoon-modal kanoon-action-placeholder"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="kanoon-modal__header">
          <h2 className="kanoon-modal__title">{title}</h2>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="kanoon-modal__body">
          <p className="kanoon-action-placeholder__text">
            فرم «{title}» برای مخاطب <strong>{getDisplayName(contact)}</strong> به‌زودی در ماژول مربوطه فعال می‌شود.
          </p>
          <p className="kanoon-action-placeholder__meta">
            شناسه مخاطب: {contact.id.toLocaleString('fa-IR')}
          </p>
        </div>
        <footer className="kanoon-modal__footer">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            بستن
          </button>
        </footer>
      </div>
    </div>
  );
}
