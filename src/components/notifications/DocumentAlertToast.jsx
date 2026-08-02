import { Eye } from 'lucide-react';
import { useDocumentTracker } from '../../context/DocumentTrackerContext';
import '../../styles/DocumentAlertToast.css';

/**
 * Toast سراسری ردیابی سند — Layer 3 Path B.
 * از DocumentTrackerContext تغذیه می‌شود؛ آماده اتصال WebSocket/SSE.
 */
export default function DocumentAlertToast() {
  const { alert, hideDocumentAlert } = useDocumentTracker();
  const isOpen = Boolean(alert?.visible);

  return (
    <div
      className={`doc-alert-toast${isOpen ? ' is-open' : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={!isOpen}
      dir="rtl"
    >
      <div className="doc-alert-toast__card">
        <span className="doc-alert-toast__icon" aria-hidden="true">
          <Eye size={18} strokeWidth={1.75} />
        </span>

        <div className="doc-alert-toast__body">
          <p className="doc-alert-toast__title font-meem">{alert?.title}</p>
          <p className="doc-alert-toast__message font-meem">{alert?.message}</p>
        </div>

        <button
          type="button"
          className="doc-alert-toast__action font-meem"
          onClick={hideDocumentAlert}
          tabIndex={isOpen ? 0 : -1}
        >
          مشاهده
        </button>
      </div>
    </div>
  );
}
