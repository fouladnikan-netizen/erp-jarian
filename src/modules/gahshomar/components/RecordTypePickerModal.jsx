import { Inbox, Send, X } from 'lucide-react';
import { RECORD_DIRECTION } from '../models/officialRecord';
import '../gahshomar-page.css';

/**
 * Step 3 — type selection before editor opens.
 * Answers: "What kind of record am I creating?"
 */
export default function RecordTypePickerModal({ open, onSelect, onClose }) {
  if (!open) return null;

  return (
    <div className="gahshomar-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="gahshomar-modal kprofile-glass"
        role="dialog"
        aria-modal="true"
        aria-label="انتخاب نوع مکاتبه"
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="gahshomar-modal__header">
          <h2 className="gahshomar-modal__title font-meem">نوع مکاتبه</h2>
          <button type="button" className="gahshomar-modal__close" aria-label="بستن" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <p className="gahshomar-type-picker__hint font-meem">
          ابتدا نوع مکاتبه را انتخاب کنید؛ سپس فرم ثبت باز می‌شود.
        </p>

        <div className="gahshomar-type-picker__options">
          <button
            type="button"
            className="gahshomar-type-picker__option font-meem"
            onClick={() => onSelect?.(RECORD_DIRECTION.INCOMING)}
          >
            <Inbox size={20} strokeWidth={1.75} aria-hidden="true" />
            <span>وارده</span>
          </button>
          <button
            type="button"
            className="gahshomar-type-picker__option font-meem"
            onClick={() => onSelect?.(RECORD_DIRECTION.OUTGOING)}
          >
            <Send size={20} strokeWidth={1.75} aria-hidden="true" />
            <span>صادره</span>
          </button>
        </div>
      </div>
    </div>
  );
}
