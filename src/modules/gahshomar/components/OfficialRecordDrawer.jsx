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
  FileText,
  ScrollText,
} from 'lucide-react';
import { DRAWER_MODE, PARTICIPANT_ROLE } from '../models/officialRecord';
import {
  getOfficialRecord,
  issueOfficialRecord,
  saveOfficialRecord,
} from '../officialRecordFacade';
import { getTodayJalali } from '../../nabz/dateUtils';
import {
  LETTER_BISMILLAH,
  buildDefaultEditableBody,
  ensureEditableLetterBody,
  formatHonorableCompany,
  getLetterSignatory,
} from '../services/letterDocument';
import ContactSelector from './ContactSelector';
import LetterRichEditor from './LetterRichEditor';
import LetterSubjectField from './LetterSubjectField';
import PrintableOfficialLetter, { PRINT_LETTER_VARIANT } from './PrintableOfficialLetter';
import '../../nabz/nabz.css';
import '../gahshomar-page.css';

function MetaRow({ label, value, numeric = false }) {
  return (
    <div className="gahshomar-drawer__row">
      <dt className="font-meem">{label}</dt>
      <dd className={numeric ? 'font-yekan' : 'font-meem'}>{value || '—'}</dd>
    </div>
  );
}

function resolveCompanyName(party) {
  if (!party) return '';
  return String(party.companyName || party.name || '').trim();
}

/**
 * Fixed letter header/footer around TipTap — one continuous sheet (not a separate card from body).
 * Header/footer only change via form fields above.
 */
function LetterDocumentChrome({ companyName = '', attentionName = '', children }) {
  const signatory = getLetterSignatory();
  const companyLine = formatHonorableCompany(companyName);
  const personLine = String(attentionName || '').trim();

  return (
    <div className="gahshomar-letter-doc" dir="rtl">
      <p className="gahshomar-letter-doc__bismillah font-meem">
        {LETTER_BISMILLAH}
      </p>
      {companyLine ? (
        <p className="gahshomar-letter-doc__company font-meem">{companyLine}</p>
      ) : null}
      {personLine ? (
        <p className="gahshomar-letter-doc__person font-meem">{personLine}</p>
      ) : null}
      <div className="gahshomar-letter-doc__editable">
        {children}
      </div>
      <footer className="gahshomar-letter-doc__signatory font-meem" aria-label="پایان نامه">
        <strong>{signatory.name}</strong>
        <strong>{signatory.title}</strong>
        <strong>{signatory.company}</strong>
      </footer>
    </div>
  );
}

function ViewBody({ record }) {
  return (
    <>
      <dl className="gahshomar-drawer__body">
        <MetaRow label="شماره" value={record.registryNumber || record.number} numeric />
        <MetaRow label="تاریخ" value={record.date || record.recordDate || record.receivedDate} numeric />
        <MetaRow
          label={record.direction === 'INCOMING' ? 'فرستنده' : 'گیرنده'}
          value={record.displayParty}
        />
        <MetaRow label="موضوع" value={record.subject} />
        {record.attentionName ? (
          <MetaRow label="نام شخص" value={record.attentionName} />
        ) : null}
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
          <LetterDocumentChrome
            companyName={resolveCompanyName(
              record.direction === 'INCOMING'
                ? record.participants?.sender
                : record.participants?.receiver,
            )}
            attentionName={record.attentionName}
          >
            <div
              className="gahshomar-drawer__body-text font-meem gahshomar-letter-html"
              dangerouslySetInnerHTML={{ __html: ensureEditableLetterBody(record.body) }}
            />
          </LetterDocumentChrome>
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
      <section className="gahshomar-compose__fields" aria-label="اطلاعات نامه">
        <div className="gahshomar-compose__row gahshomar-compose__row--single">
          <LetterSubjectField
            value={draft.subject}
            onChange={(subject) => onChange({ subject })}
            onSelectTemplate={(template) => {
              onChange({
                subject: template.subject,
                body: buildDefaultEditableBody(template.body),
                bodyRevision: Date.now(),
              });
            }}
            readOnly={locked}
          />
        </div>

        <div className="gahshomar-compose__row">
          <ContactSelector
            label={draft.direction === 'INCOMING' ? 'فرستنده' : 'گیرنده'}
            role={counterpartyRole}
            value={draft.counterparty}
            onChange={(participant) => onChange({ counterparty: participant })}
            readOnly={locked}
            required
          />
          <label className="gahshomar-modal__field font-meem">
            نام شخص
            <input
              className="gahshomar-modal__input font-meem"
              value={draft.attentionName || ''}
              readOnly={locked}
              onChange={(event) => onChange({ attentionName: event.target.value })}
              placeholder="در صورت نیاز وارد کنید…"
              autoComplete="off"
            />
          </label>
        </div>
      </section>

      <LetterDocumentChrome
        companyName={resolveCompanyName(draft.counterparty)}
        attentionName={draft.attentionName}
      >
        <LetterRichEditor
          value={draft.body}
          contentKey={draft.bodyRevision}
          onChange={(body) => onChange({ body })}
          readOnly={locked}
          label=""
          placeholder="متن نامه را بنویسید…"
        />
      </LetterDocumentChrome>
    </form>
  );
}

function PrintPreview({ record, onClose }) {
  const [variant, setVariant] = useState(PRINT_LETTER_VARIANT.LETTERHEAD);

  useEffect(() => {
    document.body.classList.add('gahshomar-print-active');
    return () => document.body.classList.remove('gahshomar-print-active');
  }, []);

  const withLetterhead = variant === PRINT_LETTER_VARIANT.LETTERHEAD;
  const hint = withLetterhead
    ? 'با سربرگ: نسخه الکترونیکی — تصویر سربرگ و مهر و امضا همراه نامه ارسال می‌شود.'
    : 'بدون سربرگ: برای چاپ روی کاغذ سربرگ فیزیکی — جانمایی متن یکسان است؛ مهر و امضا چاپ نمی‌شود.';

  return createPortal(
    <div className="gahshomar-print-preview gahshomar-print-root" dir="rtl">
      <div className="gahshomar-print-preview__toolbar">
        <div className="gahshomar-print-preview__toolbar-start">
          <div className="gahshomar-print-mode" role="group" aria-label="نوع چاپ">
            <button
              type="button"
              className={`gahshomar-print-mode__btn font-meem${withLetterhead ? ' is-active' : ''}`}
              aria-pressed={withLetterhead}
              onClick={() => setVariant(PRINT_LETTER_VARIANT.LETTERHEAD)}
            >
              <ScrollText size={15} strokeWidth={1.5} aria-hidden="true" />
              با سربرگ
            </button>
            <button
              type="button"
              className={`gahshomar-print-mode__btn font-meem${!withLetterhead ? ' is-active' : ''}`}
              aria-pressed={!withLetterhead}
              onClick={() => setVariant(PRINT_LETTER_VARIANT.PLAIN)}
            >
              <FileText size={15} strokeWidth={1.5} aria-hidden="true" />
              بدون سربرگ
            </button>
          </div>
          <p className="gahshomar-print-preview__hint font-meem">{hint}</p>
        </div>
        <div className="gahshomar-print-preview__toolbar-end">
          <button
            type="button"
            className="gahshomar-btn gahshomar-btn--primary font-meem"
            onClick={() => window.print()}
          >
            <Printer size={15} strokeWidth={1.5} aria-hidden="true" />
            تأیید و چاپ
          </button>
          <button
            type="button"
            className="gahshomar-btn gahshomar-btn--ghost font-meem"
            onClick={onClose}
          >
            بستن
          </button>
        </div>
      </div>
      <div className="gahshomar-print-preview__stage">
        <PrintableOfficialLetter record={record} variant={variant} />
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
      const today = getTodayJalali() || '';
      setDraft({
        subject,
        attentionName: detail.attentionName || '',
        counterparty: counterparty?.partyId ? counterparty : null,
        date: detail.date || detail.recordDate || detail.receivedDate || today,
        body: ensureEditableLetterBody(detail.body || ''),
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
      attentionName: String(draft.attentionName || '').trim() || null,
      body: ensureEditableLetterBody(draft.body || ''),
      recordDate: draft.date || getTodayJalali() || null,
      receivedDate: record.direction === 'INCOMING'
        ? (draft.date || getTodayJalali() || null)
        : record.receivedDate,
      companyId: draft.counterparty?.companyId ?? record.companyId,
      participants,
    };
  };

  const validateCounterparty = () => {
    if (!draft?.counterparty?.partyId || draft.counterparty.partyType !== 'CONTACT') {
      setError(record.direction === 'INCOMING'
        ? 'فرستنده باید از فهرست شرکت‌های کانن انتخاب شود.'
        : 'گیرنده باید از فهرست شرکت‌های کانن انتخاب شود.');
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
                  <Files
                    className="gahshomar-compose-popup__title-icon"
                    size={20}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <h2 className="gahshomar-compose-popup__title font-meem">{title}</h2>
                </div>
              </div>
              <button
                type="button"
                className="gahshomar-drawer__close"
                aria-label="بستن"
                onClick={onClose}
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </header>

            <div className="gahshomar-compose-popup__body">
              {draft ? (
                <EditorBody draft={draft} onChange={handleDraftChange} locked={locked} />
              ) : null}
              {error ? <p className="gahshomar-modal__error font-meem">{error}</p> : null}
            </div>

            <footer className="gahshomar-compose-popup__footer">
              <button
                type="button"
                className="gahshomar-btn gahshomar-btn--ghost font-meem"
                onClick={onClose}
              >
                {locked ? 'بستن' : 'انصراف'}
              </button>
              {!locked ? (
                <>
                  <button
                    type="button"
                    className="gahshomar-btn gahshomar-btn--secondary font-meem"
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
                      <PenLine size={15} strokeWidth={1.5} aria-hidden="true" />
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
                  <Printer size={15} strokeWidth={1.5} aria-hidden="true" />
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
