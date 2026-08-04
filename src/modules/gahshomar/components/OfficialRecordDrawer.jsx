import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Paperclip,
  Files,
  Reply,
  Share2,
  Printer,
  FileDown,
  PenLine,
} from 'lucide-react';
import { DRAWER_MODE, DIRECTION_LABELS, PARTICIPANT_ROLE } from '../models/officialRecord';
import {
  getOfficialRecord,
  issueOfficialRecord,
  saveOfficialRecord,
} from '../officialRecordFacade';
import { ensureLetterHtml } from '../services/letterHtml';
import ContactSelector from './ContactSelector';
import LetterRichEditor from './LetterRichEditor';
import LetterSubjectField from './LetterSubjectField';
import PrintableOfficialLetter from './PrintableOfficialLetter';
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
        <MetaRow label="شماره" value={record.registryNumber || record.number} numeric />
        <MetaRow label="تاریخ" value={record.date || record.recordDate || record.receivedDate} numeric />
        <MetaRow label="جهت" value={DIRECTION_LABELS[record.direction]} />
        <MetaRow
          label={record.direction === 'INCOMING' ? 'فرستنده' : 'گیرنده'}
          value={record.displayParty}
        />
        <MetaRow label="موضوع" value={record.subject} />
        <MetaRow label="نوع" value={record.displayType} />
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
          <div
            className="gahshomar-drawer__body-text font-meem gahshomar-letter-html"
            dangerouslySetInnerHTML={{ __html: ensureLetterHtml(record.body) }}
          />
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
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function EditorBody({ draft, onChange, locked }) {
  const counterpartyRole = draft.direction === 'INCOMING'
    ? PARTICIPANT_ROLE.SENDER
    : PARTICIPANT_ROLE.RECEIVER;

  return (
    <form className="gahshomar-compose__editor" onSubmit={(event) => event.preventDefault()}>
      <div className="gahshomar-compose__grid">
        <LetterSubjectField
          value={draft.subject}
          onChange={(subject) => onChange({ subject })}
          onSelectTemplate={(template) => {
            const bodyHtml = template.bodyHtml || ensureLetterHtml(template.body);
            onChange({
              subject: template.subject,
              body: bodyHtml,
              bodyRevision: Date.now(),
            });
          }}
          readOnly={locked}
        />
        <ContactSelector
          label={draft.direction === 'INCOMING' ? 'فرستنده' : 'گیرنده'}
          role={counterpartyRole}
          value={draft.counterparty}
          onChange={(participant) => onChange({ counterparty: participant })}
          readOnly={locked}
        />
        <label className="gahshomar-modal__field font-meem">
          تاریخ
          <input
            className="gahshomar-modal__input font-yekan"
            value={draft.date}
            readOnly={locked}
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
        {locked && draft.registryNumber ? (
          <label className="gahshomar-modal__field font-meem">
            شماره ثبت
            <input
              className="gahshomar-modal__input font-yekan"
              value={draft.registryNumber}
              readOnly
            />
          </label>
        ) : null}
      </div>
      <LetterRichEditor
        value={draft.body}
        contentKey={draft.bodyRevision}
        onChange={(body) => onChange({ body })}
        readOnly={locked}
      />
    </form>
  );
}

function PrintPreview({ record, onClose }) {
  useEffect(() => {
    document.body.classList.add('gahshomar-print-active');
    return () => document.body.classList.remove('gahshomar-print-active');
  }, []);

  return createPortal(
    <div className="gahshomar-print-preview gahshomar-print-root" dir="rtl">
      <div className="gahshomar-print-preview__toolbar">
        <button
          type="button"
          className="gahshomar-btn gahshomar-btn--primary font-meem"
          onClick={() => window.print()}
        >
          <Printer size={15} strokeWidth={1.75} aria-hidden="true" />
          چاپ
        </button>
        <button type="button" className="gahshomar-btn font-meem" onClick={onClose}>
          بستن
        </button>
      </div>
      <div className="gahshomar-print-preview__stage">
        <PrintableOfficialLetter record={record} />
      </div>
    </div>,
    document.body,
  );
}

/**
 * VIEW → left drawer
 * CREATE / EDIT → centered compose popup
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
  const [printOpen, setPrintOpen] = useState(false);

  const hydrate = (detail) => {
    setRecord(detail);
    if (!detail) {
      setDraft(null);
      return;
    }
    if (mode === DRAWER_MODE.CREATE || mode === DRAWER_MODE.EDIT) {
      const counterparty = detail.direction === 'INCOMING'
        ? detail.participants?.sender
        : detail.participants?.receiver;
      const rawSubject = String(detail.subject || '').trim();
      const subject = (rawSubject === 'پیش‌نویس جدید' || rawSubject === 'بدون موضوع')
        ? ''
        : rawSubject;
      setDraft({
        subject,
        counterparty: counterparty?.partyId ? counterparty : null,
        date: detail.date || detail.recordDate || detail.receivedDate || '',
        body: ensureLetterHtml(detail.body || ''),
        bodyRevision: Date.now(),
        direction: detail.direction,
        registryNumber: detail.registryNumber || detail.number || '',
      });
    } else {
      setDraft(null);
    }
  };

  useEffect(() => {
    if (!mode || !recordId) {
      setRecord(null);
      setDraft(null);
      setError('');
      setEntered(false);
      setPrintOpen(false);
      return undefined;
    }

    hydrate(getOfficialRecord(recordId));
    setError('');
    setEntered(false);
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, recordId]);

  if (!mode || !recordId || !record) return null;

  const locked = Boolean(record.isLocked);
  const useComposeUi = mode === DRAWER_MODE.CREATE || mode === DRAWER_MODE.EDIT;

  const title = mode === DRAWER_MODE.VIEW
    ? 'جزئیات نامه'
    : (locked ? 'نامه صادر شده' : (mode === DRAWER_MODE.CREATE ? 'ثبت مکاتبه رسمی' : 'ویرایش / پاسخ'));
  const eyebrow = 'دبیرخانه گاه‌شمار';

  const handleDraftChange = (patch) => {
    if (locked) return;
    setDraft((current) => ({ ...current, ...patch }));
  };

  const buildPayload = () => {
    const participants = {
      sender: { ...record.participants?.sender },
      receiver: { ...record.participants?.receiver },
    };

    if (record.direction === 'INCOMING') {
      participants.sender = draft.counterparty || {
        partyType: 'CONTACT',
        role: 'SENDER',
        partyId: null,
        name: null,
      };
      participants.receiver = {
        ...participants.receiver,
        partyType: participants.receiver?.partyType || 'ORG',
        role: 'RECEIVER',
      };
    } else {
      participants.receiver = draft.counterparty || {
        partyType: 'CONTACT',
        role: 'RECEIVER',
        partyId: null,
        name: null,
      };
      participants.sender = {
        ...participants.sender,
        partyType: participants.sender?.partyType || 'ORG',
        role: 'SENDER',
      };
    }

    return {
      subject: draft.subject.trim(),
      body: ensureLetterHtml(draft.body || ''),
      recordDate: draft.date || null,
      receivedDate: record.direction === 'INCOMING' ? (draft.date || null) : record.receivedDate,
      companyId: draft.counterparty?.companyId ?? record.companyId,
      participants,
    };
  };

  const validateCounterparty = () => {
    if (!draft?.counterparty?.partyId || draft.counterparty.partyType !== 'CONTACT') {
      setError(record.direction === 'INCOMING'
        ? 'فرستنده باید از مخاطبین کانن انتخاب شود.'
        : 'گیرنده باید از مخاطبین کانن انتخاب شود.');
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (locked) return;
    if (!draft?.subject?.trim()) {
      setError('موضوع الزامی است.');
      return;
    }
    if (!validateCounterparty()) return;
    const saved = saveOfficialRecord(recordId, buildPayload());
    if (!saved) {
      setError('ذخیره ناموفق بود.');
      return;
    }
    onSaved?.(saved);
    onClose?.();
  };

  const handleIssue = () => {
    if (locked) return;
    if (!draft?.subject?.trim()) {
      setError('موضوع الزامی است.');
      return;
    }
    if (record.direction !== 'OUTGOING') {
      setError('صدور فقط برای نامه ارسال‌کرده مجاز است.');
      return;
    }
    if (!validateCounterparty()) return;
    const issued = issueOfficialRecord(recordId, buildPayload());
    if (!issued) {
      setError('صدور نامه ناموفق بود. گیرنده معتبر الزامی است.');
      return;
    }
    hydrate(issued);
    setError('');
  };

  const handlePrint = () => {
    const latest = getOfficialRecord(recordId);
    if (!latest?.canPrint && !latest?.isLocked) {
      setError('برای چاپ، ابتدا نامه را امضا و صادر کنید.');
      return;
    }
    setRecord(latest);
    setPrintOpen(true);
  };

  if (useComposeUi) {
    return (
      <>
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
              {draft ? (
                <EditorBody draft={draft} onChange={handleDraftChange} locked={locked} />
              ) : null}
              {error ? <p className="gahshomar-modal__error font-meem">{error}</p> : null}
            </div>

            <footer className="gahshomar-compose-popup__footer">
              <button type="button" className="gahshomar-btn font-meem" onClick={onClose}>
                {locked ? 'بستن' : 'انصراف'}
              </button>
              {!locked ? (
                <>
                  <button
                    type="button"
                    className="gahshomar-btn font-meem"
                    onClick={handleSave}
                  >
                    ذخیره پیش‌نویس
                  </button>
                  {record.direction === 'OUTGOING' ? (
                    <button
                      type="button"
                      className="gahshomar-btn gahshomar-btn--primary font-meem"
                      onClick={handleIssue}
                    >
                      <PenLine size={15} strokeWidth={1.75} aria-hidden="true" />
                      امضا و صدور
                    </button>
                  ) : null}
                </>
              ) : (
                <button
                  type="button"
                  className="gahshomar-btn gahshomar-btn--primary font-meem"
                  onClick={handlePrint}
                >
                  <Printer size={15} strokeWidth={1.75} aria-hidden="true" />
                  چاپ
                </button>
              )}
            </footer>
          </div>
        </div>
        {printOpen ? (
          <PrintPreview record={record} onClose={() => setPrintOpen(false)} />
        ) : null}
      </>
    );
  }

  return (
    <>
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
              {(record.registryNumber || record.number) ? (
                <p className="gahshomar-drawer__code font-yekan">
                  {record.registryNumber || record.number}
                </p>
              ) : null}
            </div>
            <button type="button" className="gahshomar-drawer__close" aria-label="بستن" onClick={onClose}>
              <X size={20} strokeWidth={1.75} />
            </button>
          </header>

          <div className="gahshomar-drawer__content">
            <ViewBody record={record} />
            {error ? <p className="gahshomar-modal__error font-meem">{error}</p> : null}
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
            <button
              type="button"
              className="gahshomar-btn font-meem"
              disabled={!record.canPrint}
              onClick={handlePrint}
            >
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
      {printOpen ? (
        <PrintPreview record={record} onClose={() => setPrintOpen(false)} />
      ) : null}
    </>
  );
}
