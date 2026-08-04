import { X, Paperclip, Files } from 'lucide-react';
import {
  DIRECTION_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  PRIORITY_LABELS,
} from '../models/correspondence';
import '../gahshomar-page.css';

function Row({ label, value, numeric = false }) {
  return (
    <div className="gahshomar-drawer__row">
      <dt className="font-meem">{label}</dt>
      <dd className={numeric ? 'font-yekan' : 'font-meem'}>{value || '—'}</dd>
    </div>
  );
}

/**
 * Glass side drawer for correspondence detail — stays on list page.
 */
export default function CorrespondenceDetailDrawer({ record, companyName = '', onClose }) {
  if (!record) return null;

  return (
    <div className="gahshomar-drawer-overlay" role="presentation" onClick={onClose}>
      <aside
        className="gahshomar-drawer kprofile-glass"
        role="dialog"
        aria-modal="true"
        aria-label="جزئیات مکاتبه"
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="gahshomar-drawer__header">
          <div className="gahshomar-drawer__title-wrap">
            <Files size={18} strokeWidth={1.75} aria-hidden="true" />
            <h2 className="gahshomar-drawer__title font-meem">جزئیات نامه</h2>
          </div>
          <button
            type="button"
            className="gahshomar-modal__close"
            aria-label="بستن"
            onClick={onClose}
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <dl className="gahshomar-drawer__body">
          <Row label="شماره نامه" value={record.letterNumber} numeric />
          <Row
            label="تاریخ"
            value={record.receivedDate || record.letterDate}
            numeric
          />
          <Row label="جهت" value={DIRECTION_LABELS[record.direction]} />
          <Row label="نوع" value={TYPE_LABELS[record.type]} />
          <Row label="فرستنده" value={record.senderName || record.counterpartyName} />
          <Row label="گیرنده" value={record.receiverName || record.counterpartyName} />
          <Row label="موضوع" value={record.subject} />
          <Row label="دسته‌بندی" value={record.category} />
          <Row label="اولویت" value={PRIORITY_LABELS[record.priority]} />
          <Row label="وضعیت" value={STATUS_LABELS[record.status]} />
          <Row label="سازمان مرتبط" value={companyName || (record.companyId != null ? String(record.companyId) : null)} />
          <Row label="سفارش مرتبط" value={record.relatedOrderCode} numeric />
        </dl>

        {record.body ? (
          <div className="gahshomar-drawer__section">
            <h3 className="gahshomar-drawer__section-title font-meem">متن / شرح</h3>
            <p className="gahshomar-drawer__body-text font-meem">{record.body}</p>
          </div>
        ) : null}

        <div className="gahshomar-drawer__section">
          <h3 className="gahshomar-drawer__section-title font-meem">پیوست‌ها</h3>
          {Array.isArray(record.attachments) && record.attachments.length ? (
            <ul className="gahshomar-drawer__attach-list">
              {record.attachments.map((att) => (
                <li key={att.id} className="font-meem">
                  <Paperclip size={14} strokeWidth={1.75} aria-hidden="true" />
                  {att.fileName}
                </li>
              ))}
            </ul>
          ) : (
            <p className="gahshomar-drawer__muted font-meem">پیوستی ثبت نشده است.</p>
          )}
        </div>

        <div className="gahshomar-drawer__section">
          <h3 className="gahshomar-drawer__section-title font-meem">تاریخچه وضعیت</h3>
          <p className="gahshomar-drawer__muted font-meem">
            جای‌نگهدار — گردش کار تایید در فازهای بعدی.
          </p>
        </div>
      </aside>
    </div>
  );
}
