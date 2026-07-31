import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContactsStore, LIFECYCLE_STAGES } from '../../stores/useContactsStore';
import { useNabzOrders } from '../nabz/NabzOrdersContext';
import { showSystemToast } from '../../utils/systemToast';
import { PIPELINE_STAGES, getContactDisplayName, getContactTag } from './pipelineConfig';

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

const ACTION_TABS = [
  { id: 'note', label: 'یادداشت', Icon: NoteIcon, placeholder: 'یادداشت جدید… (خلاصه جلسه، توافق، نکته مهم)' },
  { id: 'call', label: 'تماس', Icon: PhoneIcon, placeholder: 'گزارش تماس… (نتیجه مکالمه، درخواست مشتری)' },
  { id: 'task', label: 'وظیفه بعدی', Icon: TaskIcon, placeholder: 'شرح وظیفه بعدی… (ارسال پیش‌فاکتور، پیگیری پرداخت)' },
];

function SystemIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const INTERACTION_TYPE_META = {
  note: { label: 'یادداشت', Icon: NoteIcon },
  call: { label: 'تماس', Icon: PhoneIcon },
  task: { label: 'وظیفه', Icon: TaskIcon },
  system: { label: 'سیستم', Icon: SystemIcon },
};

/** دمای رابطه بر اساس مرحله چرخه حیات — داغ / گرم / سرد */
const STAGE_TEMPERATURE = {
  [LIFECYCLE_STAGES.COLD_LEAD]: 'cold',
  [LIFECYCLE_STAGES.ARCHIVED]: 'cold',
  [LIFECYCLE_STAGES.PITCHED]: 'warm',
  [LIFECYCLE_STAGES.NURTURING]: 'warm',
  [LIFECYCLE_STAGES.SALES_QUALIFIED]: 'hot',
  [LIFECYCLE_STAGES.FIRST_TIME_BUYER]: 'hot',
  [LIFECYCLE_STAGES.LOYAL]: 'hot',
};

const TEMPERATURE_META = {
  hot: { label: 'داغ', level: 3 },
  warm: { label: 'گرم', level: 2 },
  cold: { label: 'سرد', level: 1 },
};

/** تاریخ‌های seed کانون جلالی متنی هستند؛ ISO ها به فرمت فارسی تبدیل می‌شوند. */
function formatInteractionDate(value) {
  if (!value) return '—';
  if (/[۰-۹/]/.test(value) && !value.includes('T')) return value;
  try {
    return new Date(value).toLocaleDateString('fa-IR');
  } catch {
    return '—';
  }
}

function StageBadge({ stageId }) {
  const stage = PIPELINE_STAGES.find((item) => item.id === stageId) || PIPELINE_STAGES[0];
  return (
    <span
      className="ofoq-modal__stage-badge"
      style={{ '--stage-color': stage.color, '--stage-glow': stage.glow }}
    >
      <span className="ofoq-modal__stage-dot" aria-hidden="true" />
      {stage.label}
    </span>
  );
}

function LeadTemperature({ stageId }) {
  const temp = STAGE_TEMPERATURE[stageId] || 'cold';
  const meta = TEMPERATURE_META[temp];
  return (
    <div className={`ofoq-temperature ofoq-temperature--${temp}`}>
      <div className="ofoq-temperature__head">
        <span className="ofoq-temperature__title">دمای رابطه</span>
        <span className="ofoq-temperature__value">{meta.label}</span>
      </div>
      <div className="ofoq-temperature__bars" aria-hidden="true">
        {[1, 2, 3].map((level) => (
          <span
            key={level}
            className={`ofoq-temperature__bar${level <= meta.level ? ' is-on' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

function SidebarInfo({ contact }) {
  const rows = [
    { label: 'موبایل', value: contact.mobile || contact.relatedPersons?.[0]?.mobile, ltr: true },
    { label: 'تلفن ثابت', value: contact.officialSpecs?.phone, ltr: true },
    { label: 'ایمیل', value: contact.email, ltr: true },
  ];

  return (
    <aside className="ofoq-modal__sidebar">
      <h3 className="ofoq-modal__sidebar-title">اطلاعات تماس</h3>
      <dl className="ofoq-modal__info-list">
        {rows.map((row) => (
          <div key={row.label} className="ofoq-modal__info-row">
            <dt>{row.label}</dt>
            <dd dir={row.ltr && row.value ? 'ltr' : undefined}>{row.value || '—'}</dd>
          </div>
        ))}
      </dl>

      <LeadTemperature stageId={contact.lifecycle_stage} />

      <Link to="/" className="ofoq-modal__kanoon-link">
        مشاهده پروفایل کامل در کانون ←
      </Link>
    </aside>
  );
}

function ActionForm({ contactId }) {
  const addInteraction = useContactsStore((state) => state.addInteraction);
  const [activeTab, setActiveTab] = useState('note');
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const tabMeta = ACTION_TABS.find((tab) => tab.id === activeTab);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) return;
    const iso = followUpDate ? new Date(`${followUpDate}T09:00:00`).toISOString() : null;
    addInteraction(contactId, trimmed, iso, activeTab);
    setNote('');
    setFollowUpDate('');
  };

  return (
    <div className="ofoq-modal__action-box">
      <div className="ofoq-modal__action-tabs" role="tablist" aria-label="نوع اقدام">
        {ACTION_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={`ofoq-modal__action-tab${activeTab === id ? ' is-active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>

      <form className="ofoq-modal__action-form" onSubmit={handleSubmit}>
        <textarea
          className="ofoq-modal__note-input"
          rows={3}
          placeholder={tabMeta.placeholder}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <div className="ofoq-modal__action-row">
          <label className="ofoq-modal__date-field">
            <span>پیگیری بعدی</span>
            <input
              type="date"
              value={followUpDate}
              onChange={(event) => setFollowUpDate(event.target.value)}
            />
          </label>
          <button type="submit" className="btn btn--primary ofoq-modal__submit" disabled={!note.trim()}>
            ثبت {tabMeta.label}
          </button>
        </div>
      </form>
    </div>
  );
}

function InteractionsTimeline({ interactions }) {
  if (!interactions.length) {
    return <p className="ofoq-modal__timeline-empty">هنوز تعاملی ثبت نشده است.</p>;
  }

  return (
    <ol className="ofoq-timeline">
      {interactions.map((item) => {
        const meta = INTERACTION_TYPE_META[item.type];
        return (
          <li key={item.id} className="ofoq-timeline__item">
            <span className="ofoq-timeline__dot" aria-hidden="true" />
            <div className="ofoq-timeline__content">
              <div className="ofoq-timeline__meta">
                <span className={`ofoq-timeline__type ofoq-timeline__type--${meta ? item.type : 'other'}`}>
                  {meta ? <meta.Icon /> : <NoteIcon />}
                  {meta ? meta.label : item.type}
                </span>
                <span className="ofoq-timeline__date">{formatInteractionDate(item.date)}</span>
                <span className="ofoq-timeline__operator">{item.operator}</span>
              </div>
              <p className="ofoq-timeline__note">{item.note}</p>
              {item.nextFollowUp ? (
                <span className="ofoq-timeline__follow-up">
                  پیگیری بعدی: {formatInteractionDate(item.nextFollowUp)}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * مودال مرکزی لید افق — گلس‌مورفیسم، چیدمان دو ستونه سبک دیدار/هاب‌اسپات.
 * مستقیماً از useContactsStore می‌خواند/می‌نویسد (بدون دیتابیس جدا).
 */
export default function OfoqLeadModal({ contactId, onClose }) {
  const contact = useContactsStore(
    (state) => state.contacts.find((item) => item.id === contactId) || null,
  );
  const updateContactStage = useContactsStore((state) => state.updateContactStage);
  const addInteraction = useContactsStore((state) => state.addInteraction);
  const { createOrderForContact } = useNabzOrders();
  const navigate = useNavigate();
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!contact) return null;

  const name = getContactDisplayName(contact);
  const tag = getContactTag(contact);

  /** پل طلایی افق → نبض: تبدیل سرنخ به سفارش، جابه‌جایی کارت، رد ممیزی و ناوبری. */
  const handleCreateProforma = async () => {
    if (converting) return;
    setConverting(true);
    try {
      // ۱) ساخت سفارش خام فاز ۱ («پیش‌کش») در نبض، متصل به همین مخاطب
      const order = await Promise.resolve(createOrderForContact(contact.id));

      // ۲) کارت لید به ستون «آماده فروش» پایپ‌لاین منتقل می‌شود
      updateContactStage(contact.id, LIFECYCLE_STAGES.SALES_QUALIFIED);

      // ۳) رد ممیزی در تایم‌لاین مخاطب
      addInteraction(contact.id, 'سیستم: ارجاع به نبض برای صدور پیش‌فاکتور', null, 'system');

      // ۴) بازخورد و ناوبری به پروفایل سفارش تازه‌ساخته‌شده
      onClose();
      showSystemToast('سرنخ با موفقیت به سفارش تبدیل شد');
      navigate(`/nabz/order/${encodeURIComponent(order.code)}`);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="ofoq-modal" role="presentation">
      <button
        type="button"
        className="ofoq-modal__backdrop"
        aria-label="بستن"
        onClick={onClose}
      />
      <div
        className="ofoq-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ofoq-modal-title"
        dir="rtl"
      >
        <header className="ofoq-modal__head">
          <div className="ofoq-modal__identity">
            <h2 id="ofoq-modal-title" className="ofoq-modal__name">{name}</h2>
            {tag ? <span className="ofoq-modal__company">{tag}</span> : null}
            <StageBadge stageId={contact.lifecycle_stage} />
          </div>
          <div className="ofoq-modal__head-actions">
            <button
              type="button"
              className="btn btn--primary ofoq-modal__proforma-btn"
              onClick={handleCreateProforma}
              disabled={converting}
            >
              {converting ? 'در حال انتقال به نبض…' : 'صدور پیش‌کش (انتقال به نبض)'}
            </button>
            <button type="button" className="ofoq-modal__close" onClick={onClose} aria-label="بستن">
              <CloseIcon />
            </button>
          </div>
        </header>

        <div className="ofoq-modal__grid">
          <SidebarInfo contact={contact} />

          <section className="ofoq-modal__main">
            <ActionForm contactId={contact.id} />
            <InteractionsTimeline interactions={contact.interactions || []} />
          </section>
        </div>
      </div>
    </div>
  );
}
