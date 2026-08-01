import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContactsStore, LIFECYCLE_STAGES } from '../../stores/useContactsStore';
import { useNabzOrders } from '../nabz/NabzOrdersContext';
import { showSystemToast } from '../../utils/systemToast';
import JalaliDatePicker from '../nabz/components/JalaliDatePicker';
import {
  compareJalaliDates,
  getTodayJalali,
  isValidJalaliDate,
  jalaliToGregorian,
  parseJalaliDate,
} from '../nabz/dateUtils';
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

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

function MeetingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CatalogIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9Z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" />
      <path d="M5 16l.6 1.4L7 18l-1.4.6L5 20l-.6-1.4L3 18l1.4-.6Z" />
    </svg>
  );
}

/** انواع فعالیت به سبک دیدار — انتخاب نوع، پارامتر type در addInteraction می‌شود. */
const ACTIVITY_TYPES = [
  { id: 'call', label: 'تماس', Icon: PhoneIcon, placeholder: 'گزارش تماس… (نتیجه مکالمه، درخواست مشتری)' },
  { id: 'message', label: 'پیام/ایمیل', Icon: MailIcon, placeholder: 'خلاصه پیام یا ایمیل… (موضوع، پاسخ مشتری)' },
  { id: 'meeting', label: 'جلسه حضوری', Icon: MeetingIcon, placeholder: 'صورتجلسه… (حاضرین، توافق‌ها، اقدام بعدی)' },
  { id: 'catalog', label: 'ارسال کاتالوگ', Icon: CatalogIcon, placeholder: 'جزئیات ارسال کاتالوگ… (نسخه، کانال ارسال، بازخورد)' },
  { id: 'note', label: 'یادداشت داخلی', Icon: NoteIcon, placeholder: 'یادداشت داخلی… (نکته مهم، جمع‌بندی، هشدار)' },
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
  message: { label: 'پیام/ایمیل', Icon: MailIcon },
  meeting: { label: 'جلسه حضوری', Icon: MeetingIcon },
  catalog: { label: 'ارسال کاتالوگ', Icon: CatalogIcon },
  task: { label: 'وظیفه', Icon: TaskIcon },
  system: { label: 'سیستم', Icon: SystemIcon },
};

/**
 * ماک بازنویسی هوش مصنوعی — شبیه‌ساز فراخوانی DeepSeek در بک‌اند.
 * قالب رسمی «خلاصه نتایج» جریان (موضوع / توافق‌ها / دغدغه‌ها / قدم‌های بعدی).
 * هم‌راستا با DEFAULT_SYSTEM_PROMPT در src/server/api/aiRoutes.js
 */
const AI_SUBJECT_BY_TYPE = {
  call: 'تماس تلفنی با مشتری',
  message: 'مکاتبه (پیام/ایمیل) با مشتری',
  meeting: 'جلسه حضوری با مشتری',
  catalog: 'ارسال کاتالوگ محصولات',
  note: 'یادداشت داخلی پیگیری',
};

function mockAiRewrite(raw, type) {
  const text = raw.trim();
  const subject = AI_SUBJECT_BY_TYPE[type] || AI_SUBJECT_BY_TYPE.note;
  const today = new Date().toLocaleDateString('fa-IR');

  if (/گرو[نو]|قیمت\s*(بالا|زیاد)/.test(text)) {
    return [
      `**موضوع:** ${subject}`,
      `**تاریخ:** ${today}`,
      '',
      '**✅ توافق‌ها و دستاوردها:**',
      '- کانال گفتگو باز ماند و امکان ادامه مذاکره وجود دارد.',
      '',
      '**💬 نکات مهم / دغدغه‌های مشتری:**',
      '- قیمت از نظر مشتری بالاست و فعلاً برای خرید دست نگه داشته.',
      '',
      '**📌 قدم‌های بعدی:**',
      `- تماس پیگیری با پیشنهاد شرایط بهتر — مسئول: کارشناس فروش — تا ${today} (به‌روزرسانی موعد در فرم)`,
    ].join('\n');
  }

  if (/جواب\s*نداد|برنداشت|در دسترس نبود/.test(text)) {
    return [
      `**موضوع:** ${subject}`,
      `**تاریخ:** ${today}`,
      '',
      '**✅ توافق‌ها و دستاوردها:**',
      '- تماس برقرار نشد؛ توافق جدیدی شکل نگرفت.',
      '',
      '**💬 نکات مهم / دغدغه‌های مشتری:**',
      '- مشتری در دسترس نبود / پاسخ نداد.',
      '',
      '**📌 قدم‌های بعدی:**',
      `- تماس مجدد در بازه مناسب‌تر — مسئول: کارشناس فروش — تا ${today} (به‌روزرسانی موعد در فرم)`,
    ].join('\n');
  }

  const cleaned = text.replace(/[.!؟…]+$/u, '');
  return [
    `**موضوع:** ${subject}`,
    `**تاریخ:** ${today}`,
    '',
    '**✅ توافق‌ها و دستاوردها:**',
    `- ${cleaned}.`,
    '',
    '**💬 نکات مهم / دغدغه‌های مشتری:**',
    '- دغدغهٔ خاصی در متن خام ذکر نشده؛ در صورت نیاز تکمیل شود.',
    '',
    '**📌 قدم‌های بعدی:**',
    `- پیگیری ادامه فرآیند — مسئول: کارشناس فروش — تا ${today} (به‌روزرسانی موعد در فرم)`,
  ].join('\n');
}

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
  /** مخاطب اصلی + اشخاص مرتبط کانون — انتخاب شخص، اطلاعات تماس را عوض می‌کند. */
  const persons = useMemo(() => {
    const main = {
      id: 'main',
      name: getContactDisplayName(contact),
      role: 'مخاطب اصلی',
      mobile: contact.mobile,
    };
    const related = (contact.relatedPersons || []).map((person, index) => ({
      id: `person-${index}`,
      name: person.name,
      role: person.role || 'شخص مرتبط',
      mobile: person.mobile,
    }));
    return [main, ...related];
  }, [contact]);

  const [personId, setPersonId] = useState('main');
  useEffect(() => setPersonId('main'), [contact.id]);
  const person = persons.find((item) => item.id === personId) || persons[0];

  const rows = [
    { label: 'موبایل', value: person.mobile, ltr: true },
    { label: 'تلفن ثابت', value: contact.officialSpecs?.phone, ltr: true },
    { label: 'ایمیل', value: contact.email, ltr: true },
  ];

  return (
    <aside className="ofoq-modal__sidebar">
      <h3 className="ofoq-modal__sidebar-title">اطلاعات تماس</h3>

      <label className="ofoq-modal__person-field">
        <span>شخص مرتبط</span>
        <select
          className="ofoq-modal__person-select"
          value={personId}
          onChange={(event) => setPersonId(event.target.value)}
        >
          {persons.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <div className="ofoq-modal__person-chip">
        <strong>{person.name}</strong>
        <span>{person.role}</span>
      </div>

      <dl className="ofoq-modal__info-list">
        {rows.map((row) => (
          <div key={row.label} className="ofoq-modal__info-row">
            <dt>{row.label}</dt>
            <dd dir={row.ltr && row.value ? 'ltr' : undefined}>{row.value || '—'}</dd>
          </div>
        ))}
      </dl>

      <LeadTemperature stageId={contact.lifecycle_stage} />

      <Link to={`/kanoon/contact/${contact.id}`} className="ofoq-modal__kanoon-link">
        مشاهده پروفایل کامل در کانون ←
      </Link>
    </aside>
  );
}

function ActionForm({ contactId }) {
  const addInteraction = useContactsStore((state) => state.addInteraction);
  const [activityType, setActivityType] = useState('call');
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const aiTimer = useRef(null);

  useEffect(() => () => clearTimeout(aiTimer.current), []);

  const typeMeta = ACTIVITY_TYPES.find((item) => item.id === activityType);

  // اعتبارسنجی: متن الزامی + تاریخ پیگیری شمسی الزامی و حتماً در آینده
  const trimmedNote = note.trim();
  const hasValidDate = isValidJalaliDate(followUpDate);
  const isFutureDate = hasValidDate && compareJalaliDates(followUpDate, getTodayJalali()) > 0;
  const canSubmit = Boolean(trimmedNote) && isFutureDate && !aiBusy;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    const { year, month, day } = parseJalaliDate(followUpDate);
    const g = jalaliToGregorian(year, month, day);
    const iso = new Date(g.year, g.month - 1, g.day, 9, 0, 0).toISOString();
    addInteraction(contactId, trimmedNote, iso, activityType);
    setNote('');
    setFollowUpDate('');
  };

  /** شبیه‌سازی فراخوانی DeepSeek — دو ثانیه لودینگ گلس، سپس جایگزینی خلاصه بازنویسی‌شده. */
  const handleAiRewrite = () => {
    if (!note.trim() || aiBusy) return;
    setAiBusy(true);
    aiTimer.current = setTimeout(() => {
      setNote((current) => mockAiRewrite(current, activityType));
      setAiBusy(false);
    }, 2000);
  };

  return (
    <div className="ofoq-modal__action-box">
      <div className="ofoq-modal__action-tabs" role="tablist" aria-label="نوع فعالیت">
        {ACTIVITY_TYPES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activityType === id}
            className={`ofoq-modal__action-tab${activityType === id ? ' is-active' : ''}`}
            onClick={() => setActivityType(id)}
            disabled={aiBusy}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>

      <form className="ofoq-modal__action-form" onSubmit={handleSubmit}>
        <div className={`ofoq-ai-wrap${aiBusy ? ' is-busy' : ''}`} aria-busy={aiBusy}>
          <textarea
            className="ofoq-modal__note-input"
            rows={6}
            placeholder={typeMeta.placeholder}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={aiBusy}
          />
          <button
            type="button"
            className="ofoq-ai-btn"
            title="بازنویسی خلاصه نتایج با هوش مصنوعی"
            aria-label="بازنویسی خلاصه نتایج با هوش مصنوعی"
            onClick={handleAiRewrite}
            disabled={!note.trim() || aiBusy}
          >
            <SparklesIcon />
          </button>
          {aiBusy ? (
            <div className="ofoq-ai-overlay" role="status">
              <span className="ofoq-ai-spinner" aria-hidden="true" />
              دستیار هوش مصنوعی در حال پردازش...
            </div>
          ) : null}
        </div>
        <div className="ofoq-modal__action-row">
          <div className="ofoq-modal__date-field">
            <JalaliDatePicker
              label="پیگیری بعدی (شمسی)"
              value={followUpDate}
              onChange={setFollowUpDate}
              placeholder="انتخاب تاریخ"
              disabled={aiBusy}
            />
          </div>
          <button type="submit" className="btn btn--primary ofoq-modal__submit" disabled={!canSubmit}>
            ثبت پویش
          </button>
        </div>
        {hasValidDate && !isFutureDate ? (
          <p className="ofoq-modal__date-hint" role="alert">
            تاریخ پیگیری باید بعد از امروز باشد.
          </p>
        ) : null}
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
  const { createOrderDirect } = useNabzOrders();
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

  /** پل طلایی افق → نبض: ارجاع مستقیم به فرم «ثبت سفارش» با مشتری پیش‌پرشده. */
  const handleCreateProforma = async () => {
    if (converting) return;
    setConverting(true);
    try {
      // ۱) مخاطب برای فرم ثبت سفارش نبض آماده می‌شود (مشتری پیش‌پرشده)
      await Promise.resolve(createOrderDirect(contact.id));

      // ۲) کارت لید به ستون «آستانه» پایپ‌لاین منتقل می‌شود
      updateContactStage(contact.id, LIFECYCLE_STAGES.SALES_QUALIFIED);

      // ۳) رد ممیزی در تایم‌لاین مخاطب
      addInteraction(contact.id, 'سیستم: انتقال مستقیم به ثبت سفارش نهایی', null, 'system');

      // ۴) بازخورد و ناوبری مستقیم به فرم ثبت سفارش
      onClose();
      showSystemToast('سرنخ با موفقیت به سفارش تبدیل شد');
      navigate('/nabz/new-order');
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
              {converting ? 'در حال انتقال به نبض…' : 'ثبت سفارش'}
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
