import { useEffect, useState } from 'react';
import {
  X,
  Paperclip,
  Files,
  Reply,
  Share2,
  Printer,
  FileDown,
} from 'lucide-react';
import { DRAWER_MODE, DIRECTION_LABELS } from '../models/officialRecord';
import { getOfficialRecord, saveOfficialRecord } from '../officialRecordFacade';
import '../gahshomar-page.css';

function MetaRow({ label, value, numeric = false }) {
  return (
    <div className="gahshomar-drawer__row">
      <dt className="font-meem">{label}</dt>
      <dd className={numeric ? 'font-yekan' : 'font-meem'}>{value || '—'}</dd>
    </div>
  );
}

function ViewBody({ record }) {
  return (
    <>
      <dl className="gahshomar-drawer__body">
        <MetaRow label="شماره" value={record.number} numeric />
        <MetaRow label="تاریخ" value={record.date || record.recordDate || record.receivedDate} numeric />
        <MetaRow label="جهت" value={DIRECTION_LABELS[record.direction]} />
        <MetaRow
          label={record.direction === 'INCOMING' ? 'فرستنده' : 'گیرنده'}
          value={record.displayParty}
        />
        <MetaRow label="موضوع" value={record.subject} />
        <MetaRow label="نوع" value={record.displayType} />
        <MetaRow label="وضعیت" value={record.displayStatus} />
        {record.referenceId ? (
          <MetaRow label="ارجاع" value={record.referenceId} numeric />
        ) : null}
      </dl>

      {record.tags?.length ? (
        <div className="gahshomar-drawer__tags">
          {record.tags.map((tag) => (
            <span key={tag} className="gahshomar-drawer__tag font-meem">{tag}</span>
          ))}
        </div>
      ) : null}

      {record.body ? (
        <div className="gahshomar-drawer__section">
          <h3 className="gahshomar-drawer__section-title font-meem">متن نامه</h3>
          <p className="gahshomar-drawer__body-text font-meem">{record.body}</p>
        </div>
      ) : null}

      <div className="gahshomar-drawer__section">
        <h3 className="gahshomar-drawer__section-title font-meem">پیوست‌ها</h3>
        {record.attachments?.length ? (
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

      {record.threadPreview?.length ? (
        <div className="gahshomar-drawer__section">
          <h3 className="gahshomar-drawer__section-title font-meem">پیش‌نمایش رشته مکاتبه</h3>
          <ul className="gahshomar-drawer__thread-list">
            {record.threadPreview.map((item) => (
              <li key={item.id} className="font-meem">
                <span className="font-yekan">{item.number || '—'}</span>
                {' — '}
                {item.subject}
                <span className="gahshomar-drawer__thread-status font-meem">
                  {item.displayStatus}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function EditorBody({ draft, onChange }) {
  return (
    <form className="gahshomar-compose__editor" onSubmit={(event) => event.preventDefault()}>
      <div className="gahshomar-compose__grid">
        <label className="gahshomar-modal__field font-meem">
          موضوع
          <input
            className="gahshomar-modal__input font-meem"
            value={draft.subject}
            onChange={(event) => onChange({ subject: event.target.value })}
            required
          />
        </label>
        <label className="gahshomar-modal__field font-meem">
          {draft.direction === 'INCOMING' ? 'فرستنده' : 'گیرنده'}
          <input
            className="gahshomar-modal__input font-meem"
            value={draft.partyName}
            onChange={(event) => onChange({ partyName: event.target.value })}
          />
        </label>
        <label className="gahshomar-modal__field font-meem">
          تاریخ
          <input
            className="gahshomar-modal__input font-yekan"
            value={draft.date}
            onChange={(event) => onChange({ date: event.target.value })}
            placeholder="1404/01/01"
          />
        </label>
        <label className="gahshomar-modal__field font-meem">
          جهت
          <input
            className="gahshomar-modal__input font-meem"
            value={DIRECTION_LABELS[draft.direction] || '—'}
            readOnly
          />
        </label>
      </div>
      <label className="gahshomar-modal__field font-meem">
        متن نامه
        <textarea
          className="gahshomar-modal__textarea font-meem"
          rows={10}
          value={draft.body}
          onChange={(event) => onChange({ body: event.target.value })}
        />
      </label>
    </form>
  );
}

/**
 * VIEW → left drawer (What is this record?)
 * CREATE / EDIT → centered popup ~75% viewport (How do I create/modify?)
 */
export default function OfficialRecordDrawer({
  mode,
  recordId,
  onClose,
  onReply,
  onSaved,
}) {
  const [record, setRecord] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!mode || !recordId) {
      setRecord(null);
      setDraft(null);
      setError('');
      setEntered(false);
      return undefined;
    }

    const detail = getOfficialRecord(recordId);
    setRecord(detail);
    if (mode === DRAWER_MODE.CREATE || mode === DRAWER_MODE.EDIT) {
      const partyName = detail?.direction === 'INCOMING'
        ? detail?.participants?.sender?.name
        : detail?.participants?.receiver?.name;
      setDraft({
        subject: detail?.subject || '',
        partyName: partyName || '',
        date: detail?.date || detail?.recordDate || detail?.receivedDate || '',
        body: detail?.body || '',
        direction: detail?.direction,
      });
    } else {
      setDraft(null);
    }
    setError('');
    setEntered(false);
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, [mode, recordId]);

  if (!mode || !recordId || !record) return null;

  const isEditing = mode === DRAWER_MODE.CREATE || mode === DRAWER_MODE.EDIT;
  const title = mode === DRAWER_MODE.VIEW
    ? 'جزئیات نامه'
    : (mode === DRAWER_MODE.CREATE ? 'ثبت مکاتبه رسمی' : 'ویرایش / پاسخ');
  const eyebrow = mode === DRAWER_MODE.VIEW
    ? 'دبیرخانه گاه‌شمار'
    : (mode === DRAWER_MODE.CREATE ? 'دبیرخانه گاه‌شمار' : 'پاسخ مکاتبه');

  const handleDraftChange = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSave = () => {
    if (!draft?.subject?.trim()) {
      setError('موضوع الزامی است.');
      return;
    }

    const participants = { ...record.participants };
    if (record.direction === 'INCOMING') {
      participants.sender = { ...participants.sender, name: draft.partyName || null };
    } else {
      participants.receiver = { ...participants.receiver, name: draft.partyName || null };
    }

    const saved = saveOfficialRecord(recordId, {
      subject: draft.subject.trim(),
      body: draft.body || null,
      recordDate: draft.date || null,
      receivedDate: record.direction === 'INCOMING' ? (draft.date || null) : record.receivedDate,
      participants,
    });

    if (!saved) {
      setError('ذخیره ناموفق بود.');
      return;
    }

    onSaved?.(saved);
    onClose?.();
  };

  /* CREATE / EDIT — centered popup (75% viewport) */
  if (isEditing) {
    return (
      <div
        className={`gahshomar-compose-overlay${entered ? ' is-open' : ''}`}
        role="presentation"
        onClick={onClose}
      >
        <div
          className={`gahshomar-compose-popup kprofile-glass${entered ? ' is-open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          dir="rtl"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="gahshomar-compose-popup__header">
            <div className="gahshomar-compose-popup__header-copy">
              <p className="gahshomar-compose-popup__eyebrow font-meem">{eyebrow}</p>
              <div className="gahshomar-drawer__title-wrap">
                <Files size={20} strokeWidth={1.75} aria-hidden="true" />
                <h2 className="gahshomar-compose-popup__title font-meem">{title}</h2>
              </div>
            </div>
            <button
              type="button"
              className="gahshomar-drawer__close"
              aria-label="بستن"
              onClick={onClose}
            >
              <X size={20} strokeWidth={1.75} />
            </button>
          </header>

          <div className="gahshomar-compose-popup__body">
            <EditorBody draft={draft} onChange={handleDraftChange} />
            {error ? <p className="gahshomar-modal__error font-meem">{error}</p> : null}
          </div>

          <footer className="gahshomar-compose-popup__footer">
            <button type="button" className="gahshomar-btn font-meem" onClick={onClose}>
              انصراف
            </button>
            <button
              type="button"
              className="gahshomar-btn gahshomar-btn--primary font-meem"
              onClick={handleSave}
            >
              ذخیره
            </button>
          </footer>
        </div>
      </div>
    );
  }

  /* VIEW — left detail drawer */
  return (
    <div
      className={`gahshomar-drawer-overlay${entered ? ' is-open' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <aside
        className={`gahshomar-drawer${entered ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="gahshomar-drawer__header">
          <div className="gahshomar-drawer__header-copy">
            <p className="gahshomar-drawer__eyebrow font-meem">{eyebrow}</p>
            <div className="gahshomar-drawer__title-wrap">
              <Files size={20} strokeWidth={1.75} aria-hidden="true" />
              <h2 className="gahshomar-drawer__title font-meem">{title}</h2>
            </div>
            {record.number ? (
              <p className="gahshomar-drawer__code font-yekan">{record.number}</p>
            ) : null}
          </div>
          <button type="button" className="gahshomar-drawer__close" aria-label="بستن" onClick={onClose}>
            <X size={20} strokeWidth={1.75} />
          </button>
        </header>

        <div className="gahshomar-drawer__content">
          <ViewBody record={record} />
        </div>

        <footer className="gahshomar-drawer__actions">
          <button
            type="button"
            className="gahshomar-btn gahshomar-btn--primary font-meem"
            disabled={!record.canReply}
            onClick={() => onReply?.(recordId)}
          >
            <Reply size={15} strokeWidth={1.75} aria-hidden="true" />
            ثبت پاسخ
          </button>
          <button type="button" className="gahshomar-btn font-meem" disabled title="فاز بعدی">
            <Share2 size={15} strokeWidth={1.75} aria-hidden="true" />
            ارجاع
          </button>
          <button type="button" className="gahshomar-btn font-meem" disabled title="فاز بعدی">
            <Printer size={15} strokeWidth={1.75} aria-hidden="true" />
            چاپ
          </button>
          <button type="button" className="gahshomar-btn font-meem" disabled title="فاز بعدی">
            <FileDown size={15} strokeWidth={1.75} aria-hidden="true" />
            دانلود PDF
          </button>
          <button type="button" className="gahshomar-btn font-meem" onClick={onClose}>
            بستن
          </button>
        </footer>
      </aside>
    </div>
  );
}
