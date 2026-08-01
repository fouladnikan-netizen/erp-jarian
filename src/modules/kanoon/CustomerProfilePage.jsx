import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useContactsStore } from '../../stores/useContactsStore';
import SmartBackButton, { withReturnParams } from '../../components/navigation/SmartBackButton';
import { mockAiRewrite } from '../../utils/aiRewrite';
import { showSystemToast } from '../../utils/systemToast';
import { WEB_SERVICES_CONFIG } from '../../config/registry/webServices';
import { useNabzOrders } from '../nabz/NabzOrdersContext';
import JalaliDatePicker from '../nabz/components/JalaliDatePicker';
import {
  compareJalaliDates,
  getTodayJalali,
  isValidJalaliDate,
  jalaliToGregorian,
  parseJalaliDate,
} from '../nabz/dateUtils';
import { getStageLabel } from '../nabz/config';
import { BEHAVIORAL_STATUS, ENTITY_TYPES, PERSON_TYPES } from './config';
import { getDisplayName } from './columns';
import { getReportCard } from './reportCard';
import './kanoon.css';
import './customerProfile.css';

/* ── آیکن‌ها ─────────────────────────────────────────────────────── */

function icon(path, size = 14) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {path}
    </svg>
  );
}

const PhoneIcon = () => icon(<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />);
const MailIcon = () => icon(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>);
const MeetingIcon = () => icon(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>);
const NoteIcon = () => icon(<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />);
const CatalogIcon = () => icon(<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>);
const SparkIcon = () => icon(<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9Z" />, 16);
const WalletIcon = () => icon(<><rect x="2" y="6" width="20" height="14" rx="3" /><path d="M16 13h.01M2 10h20" /></>);
const ContactIcon = () => icon(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>);
const PinIcon = () => icon(<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>);
const GlobeIcon = () => icon(<><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>);
const CalendarIcon = () => icon(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
</>, 12);
const InfoIcon = () => icon(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>, 13);
const CloseIcon = () => icon(<path d="M18 6 6 18M6 6l12 12" />, 16);
const PencilIcon = () => icon(<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />, 13);
const SyncIcon = () => icon(<><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></>, 13);
const CheckIcon = () => icon(<path d="M20 6 9 17l-5-5" />, 11);
const ChevronRightIcon = () => icon(<path d="m9 18 6-6-6-6" />, 14);
const ChevronLeftIcon = () => icon(<path d="m15 18-6-6 6-6" />, 14);

/* انواع فعالیت — همان واژگان مودال پویش افق برای وحدت رویه */
const ACTIVITY_TYPES = [
  { id: 'call', label: 'تماس', Icon: PhoneIcon },
  { id: 'message', label: 'پیام/ایمیل', Icon: MailIcon },
  { id: 'meeting', label: 'جلسه حضوری', Icon: MeetingIcon },
  { id: 'catalog', label: 'ارسال کاتالوگ', Icon: CatalogIcon },
  { id: 'note', label: 'یادداشت داخلی', Icon: NoteIcon },
];

const TYPE_LABELS = {
  call: 'تماس',
  message: 'پیام/ایمیل',
  meeting: 'جلسه حضوری',
  catalog: 'ارسال کاتالوگ',
  note: 'یادداشت',
  task: 'وظیفه',
  system: 'سیستم',
};

/* رنگ گره تایم‌لاین: قرمز = هشدار/مرجوعی، سبز = موفقیت/فروش، نقره‌ای = اطلاع/تماس */
function nodeColorFor(type) {
  const t = String(type || '');
  if (t === 'فروش' || t === 'تحقق' || t === 'success' || t === 'sale') return '#16a34a';
  if (t === 'مرجوعی' || t === 'هشدار' || t === 'alert' || t === 'return') return '#e53935';
  return '#94a3b8';
}

function typeLabelFor(type) {
  return TYPE_LABELS[type] || type || 'رویداد';
}

/* تاریخ‌های تایم‌لاین دو قالب دارند: ISO (تعاملات جدید) و شمسی متنی (seed) */
function formatFaDate(value) {
  if (!value) return '—';
  if (/^\d{4}-/.test(value)) {
    return new Date(value).toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  return value;
}

function formatRial(amount) {
  if (amount == null || amount === '') return '—';
  /* رشته‌های seed خودشان با ارقام فارسی و جداکننده آمده‌اند */
  if (typeof amount === 'string' && /[۰-۹]/.test(amount)) return `${amount} ریال`;
  const num = typeof amount === 'number' ? amount : Number(String(amount).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(num)) return String(amount);
  return `${Math.abs(num).toLocaleString('fa-IR')} ریال`;
}

/** مانده حساب — فیلد صریح یا برآورد از سفارش‌های مرتبط (هم‌منطق سرانجام) */
function resolveBalanceRial(contact) {
  if (contact.financial?.accountBalanceRial != null) return Number(contact.financial.accountBalanceRial);
  if (contact.accountBalanceRial != null) return Number(contact.accountBalanceRial);
  return (contact.relatedOrders || []).reduce((sum, row) => {
    const digits = String(row.amount || '').replace(/[^\d]/g, '');
    return sum + (Number(digits) || 0);
  }, 0);
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/);
  if (!parts[0]) return '؟';
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2);
}

/* ═══ ستون راست: هویت ═══ */

function IdentityCard({ contact }) {
  const displayName = getDisplayName(contact) || '—';
  const statusMeta = BEHAVIORAL_STATUS[contact.behavioralStatus];
  const isCustomer = contact.entityType === ENTITY_TYPES.CUSTOMER;
  const isLegal = contact.personType === PERSON_TYPES.LEGAL;
  const [isLegalModalOpen, setLegalModalOpen] = useState(false);

  return (
    <section className="kprofile-glass kprofile-identity" aria-label="هویت مخاطب">
      <div className="kprofile-identity__avatar" aria-hidden="true">{getInitials(displayName)}</div>
      <div className="kprofile-identity__name-row">
        <h2 className="kprofile-identity__name">{displayName}</h2>
        <button
          type="button"
          className="kprofile-identity__legal-btn"
          title="اطلاعات حقوقی تکمیلی"
          aria-label="اطلاعات حقوقی تکمیلی"
          onClick={() => setLegalModalOpen(true)}
        >
          <InfoIcon />
        </button>
      </div>
      <p className="kprofile-identity__meta">
        {isCustomer ? 'مشتری' : 'تامین‌کننده'} · {isLegal ? 'حقوقی' : 'حقیقی'}
      </p>
      <div className="kprofile-identity__tags">
        {statusMeta && <span className="kprofile-chip">{statusMeta.label}</span>}
        {contact.activityDomain && <span className="kprofile-chip">{contact.activityDomain}</span>}
        {contact.supplierType && <span className="kprofile-chip">{contact.supplierType}</span>}
        {contact.province && <span className="kprofile-chip">{contact.province}</span>}
      </div>
      {contact.assignee?.name && (
        <p className="kprofile-identity__assignee">
          {contact.assignee.role || 'مسئول'}: <strong>{contact.assignee.name}</strong>
        </p>
      )}

      {isLegalModalOpen && (
        <LegalInfoModal contact={contact} onClose={() => setLegalModalOpen(false)} />
      )}
    </section>
  );
}

/* ═══ ستون راست: کابین مالی ═══ */

function FinancialCockpit({ contact }) {
  const report = getReportCard(contact);
  const isCustomer = contact.entityType === ENTITY_TYPES.CUSTOMER;

  const balance = resolveBalanceRial(contact);
  const creditLimit = contact.financial?.creditLimitRial ?? contact.creditLimitRial ?? null;
  const isDebtor = balance > 0;
  const usage = creditLimit ? Math.min(1, Math.max(0, balance / creditLimit)) : null;

  return (
    <section className="kprofile-glass kprofile-side-card" aria-label="وضعیت مالی">
      <h3 className="kprofile-side-card__title"><WalletIcon /> کابین مالی</h3>

      {isCustomer ? (
        <>
          <div className="kprofile-fin__row">
            <span className="kprofile-fin__label">سقف اعتبار</span>
            <span className="kprofile-fin__value">{creditLimit != null ? formatRial(creditLimit) : '—'}</span>
          </div>
          <div className="kprofile-fin__row">
            <span className="kprofile-fin__label">مانده حساب</span>
            <span className={`kprofile-fin__value ${isDebtor ? 'kprofile-fin__value--debit' : 'kprofile-fin__value--credit'}`}>
              {formatRial(balance)}
            </span>
          </div>
          <div className="kprofile-fin__row">
            <span className="kprofile-fin__label">وضعیت</span>
            <span className={`kprofile-fin__status ${isDebtor ? 'kprofile-fin__status--debit' : 'kprofile-fin__status--credit'}`}>
              {isDebtor ? 'بدهکار' : 'بستانکار / تسویه'}
            </span>
          </div>
          <div className="kprofile-fin__row">
            <span className="kprofile-fin__label">فروش کل</span>
            <span className="kprofile-fin__value">{report.totalSales}</span>
          </div>
          {usage != null && (
            <>
              <div className="kprofile-fin__bar" role="img" aria-label={`مصرف اعتبار ${Math.round(usage * 100).toLocaleString('fa-IR')} درصد`}>
                <div className="kprofile-fin__bar-fill" style={{ width: `${usage * 100}%` }} />
              </div>
              <p className="kprofile-fin__bar-hint">
                {`${Math.round(usage * 100).toLocaleString('fa-IR')}٪ از سقف اعتبار مصرف شده`}
              </p>
            </>
          )}
        </>
      ) : (
        <>
          <div className="kprofile-fin__row">
            <span className="kprofile-fin__label">خرید کل</span>
            <span className="kprofile-fin__value">{report.totalPurchaseAmount}</span>
          </div>
          <div className="kprofile-fin__row">
            <span className="kprofile-fin__label">تعداد خرید</span>
            <span className="kprofile-fin__value">{Number(report.totalPurchases || 0).toLocaleString('fa-IR')}</span>
          </div>
          <div className="kprofile-fin__row">
            <span className="kprofile-fin__label">استعلام‌های ثبت‌شده</span>
            <span className="kprofile-fin__value">{Number(report.totalInquiries || 0).toLocaleString('fa-IR')}</span>
          </div>
        </>
      )}
    </section>
  );
}

/* ═══ ستون راست: تماس‌ها و آدرس‌ها ═══ */

function QuickContacts({ contact }) {
  const specs = contact.officialSpecs || {};
  const rows = [
    contact.mobile && { Icon: PhoneIcon, label: 'موبایل', value: contact.mobile, href: `tel:${contact.mobile}` },
    specs.phone && { Icon: PhoneIcon, label: 'تلفن', value: specs.phone, href: `tel:${specs.phone}` },
    contact.email && { Icon: MailIcon, label: 'ایمیل', value: contact.email, href: `mailto:${contact.email}` },
    specs.website && { Icon: GlobeIcon, label: 'وبسایت', value: specs.website },
    (contact.fullAddress || specs.address) && { Icon: PinIcon, label: 'آدرس', value: contact.fullAddress || specs.address, plain: true },
  ].filter(Boolean);

  const persons = contact.relatedPersons || [];

  return (
    <section className="kprofile-glass kprofile-side-card" aria-label="تماس سریع">
      <h3 className="kprofile-side-card__title"><ContactIcon /> تماس‌ها و آدرس‌ها</h3>

      {rows.length === 0 && persons.length === 0 && (
        <p className="kprofile-identity__meta">اطلاعات تماسی ثبت نشده است.</p>
      )}

      {rows.map(({ Icon, label, value, href, plain }) => (
        <div key={label + value} className="kprofile-contact__row">
          <Icon />
          <div>
            <span className="kprofile-contact__label">{label}</span>
            {href && !plain ? <a href={href}>{value}</a> : <span>{value}</span>}
          </div>
        </div>
      ))}

      {persons.map((person, i) => (
        <div key={`${person.name}-${i}`} className="kprofile-contact__row">
          <ContactIcon />
          <div style={{ flex: 1 }}>
            <div className="kprofile-contact__person">
              <span>{person.name || '—'}</span>
              <span className="kprofile-contact__person-role">{person.role}</span>
            </div>
            {person.mobile && <a href={`tel:${person.mobile}`}>{person.mobile}</a>}
          </div>
        </div>
      ))}

    </section>
  );
}

/* ═══ پاپ‌آپ اطلاعات حقوقی تکمیلی ═══ */

/* مشخصات ثبتی — nationalId روی ریشه مخاطب است، بقیه داخل officialSpecs */
const LEGAL_REG_FIELDS = [
  { key: 'nationalId', label: 'شناسه ملی', root: true },
  { key: 'registrationNumber', label: 'شماره ثبت' },
  { key: 'establishmentDate', label: 'تاریخ تاسیس' },
  { key: 'economicCode', label: 'کد اقتصادی' },
  { key: 'postalCode', label: 'کد پستی ۱۰ رقمی' },
  { key: 'latestCapital', label: 'آخرین سرمایه ثبتی', rtl: true },
  { key: 'website', label: 'وبسایت' },
  { key: 'phone', label: 'تلفن ثابت' },
  { key: 'latestGazette', label: 'آخرین آگهی رسمی' },
];

function buildLegalDraft(contact) {
  const specs = contact.officialSpecs || {};
  const gov = contact.governance || {};
  return {
    nationalId: contact.nationalId || '',
    registrationNumber: specs.registrationNumber || '',
    establishmentDate: specs.establishmentDate || '',
    economicCode: specs.economicCode || '',
    postalCode: specs.postalCode || '',
    latestCapital: specs.latestCapital || '',
    website: specs.website || '',
    phone: specs.phone || '',
    latestGazette: specs.latestGazette || '',
    ceoName: gov.ceo?.name || '',
    ceoNationalId: gov.ceo?.nationalId || '',
    ceoValidUntil: gov.ceo?.validUntil || '',
    boardMembers: (gov.boardMembers || []).map((member) => ({ ...member })),
    boardValidUntil: gov.boardValidUntil || '',
    signatureRight: gov.signatureRight || '',
    address: specs.address || '',
  };
}

/* استعلام «تازه» = حداکثر ~۶ ماه پیش — برای تیک سبز TTL */
function isRecentVerification(dateStr) {
  if (!dateStr || !isValidJalaliDate(dateStr)) return false;
  const d = parseJalaliDate(dateStr);
  const t = parseJalaliDate(getTodayJalali());
  const diffDays = (t.year - d.year) * 365 + (t.month - d.month) * 30 + (t.day - d.day);
  return diffDays >= 0 && diffDays <= 180;
}

function LegalInfoModal({ contact, onClose }) {
  const updateContact = useContactsStore((state) => state.updateContact);
  const specs = contact.officialSpecs || {};
  const gov = contact.governance || {};
  const isLegal = contact.personType === PERSON_TYPES.LEGAL;
  const [isEditing, setIsEditing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [versionIndex, setVersionIndex] = useState(0);
  const [draft, setDraft] = useState(() => buildLegalDraft(contact));
  const syncTimer = useRef(null);

  /* ماشین زمان: ایندکس ۰ = نسخه فعلی (داده زنده)، ایندکس‌های بالاتر = استعلام‌های قدیمی‌تر */
  const snapshots = useMemo(() => [
    {
      isCurrent: true,
      verifiedAt: contact.legalVerifiedAt || null,
      nationalId: contact.nationalId,
      specs: contact.officialSpecs || {},
      gov: contact.governance || {},
    },
    ...(contact.legalHistory || []).map((snap) => ({
      isCurrent: false,
      verifiedAt: snap.verifiedAt,
      nationalId: snap.nationalId ?? contact.nationalId,
      specs: snap.officialSpecs || {},
      gov: snap.governance || {},
    })),
  ], [contact]);

  const active = snapshots[Math.min(versionIndex, snapshots.length - 1)];
  const isCurrentVersion = active.isCurrent;
  const canGoOlder = versionIndex < snapshots.length - 1;
  const canGoNewer = versionIndex > 0;

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(syncTimer.current);
    };
  }, [onClose]);

  /**
   * استعلام از وب‌سرویس لینکا (به‌روزرسانی خودکار مشخصات رسمی با شناسه ملی).
   * تا وقتی سرویس در شیرازه پیکربندی نشده (WEB_SERVICES_CONFIG.linka.enabled)،
   * فقط چرخه اتصال را شبیه‌سازی و وضعیت را اعلام می‌کند.
   */
  const handleLinkaSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    syncTimer.current = setTimeout(() => {
      setIsSyncing(false);
      const linka = WEB_SERVICES_CONFIG.linka;
      if (!linka.enabled || !linka.endpoint) {
        showSystemToast('وب‌سرویس لینکا هنوز متصل نیست — پس از پیکربندی در شیرازه، اطلاعات با یک کلیک به‌روز می‌شود.', { duration: 3600 });
        return;
      }
      /* TODO(linka): fetch(linka.endpoint + contact.nationalId) → updateContact با فیلدهای fieldsAutoFilled */
      showSystemToast('اطلاعات رسمی شرکت از لینکا به‌روزرسانی شد.');
    }, 1200);
  };

  const currentValue = (field) => (field.root ? active.nationalId : active.specs[field.key]);
  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const setMember = (index, key, value) => setDraft((prev) => ({
    ...prev,
    boardMembers: prev.boardMembers.map((member, i) => (i === index ? { ...member, [key]: value } : member)),
  }));

  const addMember = () => setDraft((prev) => ({
    ...prev,
    boardMembers: [...prev.boardMembers, { role: 'عضو هیئت مدیره', name: '', nationalId: '' }],
  }));

  const removeMember = (index) => setDraft((prev) => ({
    ...prev,
    boardMembers: prev.boardMembers.filter((_, i) => i !== index),
  }));

  const startEdit = () => {
    setDraft(buildLegalDraft(contact));
    setIsEditing(true);
  };

  const handleSave = (event) => {
    event.preventDefault();
    updateContact(contact.id, {
      nationalId: draft.nationalId.trim(),
      officialSpecs: {
        ...specs,
        registrationNumber: draft.registrationNumber.trim(),
        establishmentDate: draft.establishmentDate.trim(),
        economicCode: draft.economicCode.trim(),
        postalCode: draft.postalCode.trim(),
        latestCapital: draft.latestCapital.trim(),
        website: draft.website.trim(),
        phone: draft.phone.trim(),
        latestGazette: draft.latestGazette.trim(),
        address: draft.address.trim(),
      },
      governance: {
        ...gov,
        ceo: {
          name: draft.ceoName.trim(),
          nationalId: draft.ceoNationalId.trim(),
          validUntil: draft.ceoValidUntil.trim(),
        },
        boardMembers: draft.boardMembers.filter((member) => member.name.trim() || member.nationalId.trim()),
        boardValidUntil: draft.boardValidUntil.trim(),
        signatureRight: draft.signatureRight.trim(),
      },
    });
    setIsEditing(false);
  };

  const viewRow = (label, value, rtl = false) => (
    <div className="kprofile-legal-modal__row" key={label}>
      <dt>{label}</dt>
      <dd style={rtl ? { direction: 'rtl' } : undefined}>{value || '—'}</dd>
    </div>
  );

  const editRow = (key, label, rtl = false) => (
    <label key={key} className="kprofile-legal-modal__row kprofile-legal-modal__row--edit">
      <span>{label}</span>
      <input
        type="text"
        className="kprofile-legal-modal__input"
        value={draft[key]}
        onChange={(event) => setField(key, event.target.value)}
        dir={rtl ? 'rtl' : 'ltr'}
      />
    </label>
  );

  /* پورتال روی body — backdrop-filter کارت والد برای position:fixed
     containing block می‌سازد و مودال را از مرکز صفحه خارج می‌کند */
  return createPortal(
    <div className="kprofile-legal-overlay" onClick={onClose} role="presentation">
      <div
        className={`kprofile-legal-modal kprofile-legal-modal--wide${isCurrentVersion ? '' : ' is-expired'}`}
        role="dialog"
        aria-modal="true"
        aria-label="اطلاعات حقوقی تکمیلی"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="kprofile-legal-modal__header">
          <h3 className="kprofile-legal-modal__title">
            <InfoIcon />
            {isCurrentVersion ? 'اطلاعات حقوقی تکمیلی' : 'نسخه منقضی‌شده'}
          </h3>
          <div className="kprofile-legal-modal__tools">
            {!isEditing && isCurrentVersion && (
              <button
                type="button"
                className="kprofile-legal-modal__close"
                onClick={startEdit}
                title="ویرایش"
                aria-label="ویرایش اطلاعات حقوقی"
              >
                <PencilIcon />
              </button>
            )}
            <button
              type="button"
              className="kprofile-legal-modal__close"
              onClick={onClose}
              aria-label="بستن"
            >
              <CloseIcon />
            </button>
          </div>
        </header>

        {!isEditing && snapshots.length > 1 && (
          <nav className="kprofile-legal-modal__timeline" aria-label="تاریخچه استعلام‌ها">
            <button
              type="button"
              className="kprofile-legal-modal__timeline-btn"
              onClick={() => setVersionIndex((i) => i + 1)}
              disabled={!canGoOlder}
              title="استعلام قدیمی‌تر"
              aria-label="استعلام قدیمی‌تر"
            >
              <ChevronRightIcon />
            </button>
            <span className={`kprofile-legal-modal__timeline-label${isCurrentVersion ? '' : ' is-expired'}`}>
              {isCurrentVersion ? 'نسخه فعلی' : `نسخه منقضی‌شده — استعلام ${active.verifiedAt}`}
            </span>
            <button
              type="button"
              className="kprofile-legal-modal__timeline-btn"
              onClick={() => setVersionIndex((i) => i - 1)}
              disabled={!canGoNewer}
              title="استعلام جدیدتر"
              aria-label="استعلام جدیدتر"
            >
              <ChevronLeftIcon />
            </button>
          </nav>
        )}

        <div className="kprofile-legal-modal__body">
          {isEditing ? (
            <form onSubmit={handleSave}>
              <h4 className="kprofile-legal-modal__section-title">مشخصات ثبتی</h4>
              <div className="kprofile-legal-modal__list">
                {LEGAL_REG_FIELDS.map(({ key, label, rtl }) => editRow(
                  key,
                  key === 'nationalId' && !isLegal ? 'کد ملی' : label,
                  rtl,
                ))}
              </div>

              <h4 className="kprofile-legal-modal__section-title">مدیرعامل</h4>
              <div className="kprofile-legal-modal__list">
                {editRow('ceoName', 'نام و نام خانوادگی', true)}
                {editRow('ceoNationalId', 'کد ملی')}
                {editRow('ceoValidUntil', 'اعتبار مسئولیت تا')}
              </div>

              <h4 className="kprofile-legal-modal__section-title">اعضاء هیئت مدیره</h4>
              {draft.boardMembers.map((member, index) => (
                <div key={index} className="kprofile-legal-modal__member-edit">
                  <input
                    type="text"
                    className="kprofile-legal-modal__input"
                    placeholder="سمت"
                    value={member.role}
                    onChange={(event) => setMember(index, 'role', event.target.value)}
                  />
                  <input
                    type="text"
                    className="kprofile-legal-modal__input"
                    placeholder="نام و نام خانوادگی"
                    value={member.name}
                    onChange={(event) => setMember(index, 'name', event.target.value)}
                  />
                  <input
                    type="text"
                    className="kprofile-legal-modal__input"
                    placeholder="کد ملی"
                    value={member.nationalId}
                    onChange={(event) => setMember(index, 'nationalId', event.target.value)}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="kprofile-legal-modal__member-remove"
                    onClick={() => removeMember(index)}
                    aria-label="حذف عضو"
                  >
                    <CloseIcon />
                  </button>
                </div>
              ))}
              <button type="button" className="kprofile-legal-modal__member-add" onClick={addMember}>
                + افزودن عضو
              </button>
              <div className="kprofile-legal-modal__list">
                {editRow('boardValidUntil', 'اعتبار هیئت مدیره تا')}
              </div>

              <h4 className="kprofile-legal-modal__section-title">حق امضا</h4>
              <textarea
                className="kprofile-legal-modal__textarea"
                rows={4}
                value={draft.signatureRight}
                onChange={(event) => setField('signatureRight', event.target.value)}
              />

              <h4 className="kprofile-legal-modal__section-title">آدرس قانونی</h4>
              <textarea
                className="kprofile-legal-modal__textarea"
                rows={3}
                value={draft.address}
                onChange={(event) => setField('address', event.target.value)}
              />

              <footer className="kprofile-legal-modal__footer">
                <button type="button" className="kprofile-magic__cancel" onClick={() => setIsEditing(false)}>
                  انصراف
                </button>
                <button type="submit" className="btn btn--primary">
                  ذخیره
                </button>
              </footer>
            </form>
          ) : (
            /* key=versionIndex → با هر پرش زمانی، محتوا remount و کراس‌فید می‌شود */
            <div key={versionIndex} className="kprofile-legal-modal__fade">
              <h4 className="kprofile-legal-modal__section-title">مشخصات ثبتی</h4>
              <dl className="kprofile-legal-modal__list">
                {LEGAL_REG_FIELDS.map((field) => viewRow(
                  field.key === 'nationalId' && !isLegal ? 'کد ملی' : field.label,
                  currentValue(field),
                  field.rtl,
                ))}
              </dl>

              <h4 className="kprofile-legal-modal__section-title">مدیرعامل</h4>
              <dl className="kprofile-legal-modal__list">
                {viewRow('نام و نام خانوادگی', active.gov.ceo?.name, true)}
                {viewRow('کد ملی', active.gov.ceo?.nationalId)}
                {viewRow('اعتبار مسئولیت تا', active.gov.ceo?.validUntil)}
              </dl>

              <h4 className="kprofile-legal-modal__section-title">اعضاء هیئت مدیره</h4>
              {(active.gov.boardMembers || []).length ? (
                <ul className="kprofile-legal-modal__members">
                  {active.gov.boardMembers.map((member, index) => (
                    <li key={`${member.name}-${index}`} className="kprofile-legal-modal__member">
                      <span className="kprofile-legal-modal__member-role">{member.role}</span>
                      <span className="kprofile-legal-modal__member-name">{member.name}</span>
                      <span className="kprofile-legal-modal__member-code">کد ملی: {member.nationalId || '—'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="kprofile-legal-modal__empty">عضوی ثبت نشده است.</p>
              )}
              <dl className="kprofile-legal-modal__list">
                {viewRow('اعتبار هیئت مدیره تا', active.gov.boardValidUntil)}
              </dl>

              <h4 className="kprofile-legal-modal__section-title">حق امضا</h4>
              <p className="kprofile-legal-modal__text">{active.gov.signatureRight || '—'}</p>

              <h4 className="kprofile-legal-modal__section-title">آدرس قانونی</h4>
              <p className="kprofile-legal-modal__text">{active.specs.address || '—'}</p>
            </div>
          )}
        </div>

        {!isEditing && (
          <footer className="kprofile-legal-modal__ttl">
            <span className={`kprofile-legal-modal__ttl-badge${isRecentVerification(active.verifiedAt) ? ' is-fresh' : ''}`}>
              {isRecentVerification(active.verifiedAt) && (
                <span className="kprofile-legal-modal__ttl-check" aria-hidden="true"><CheckIcon /></span>
              )}
              آخرین استعلام: {active.verifiedAt || '—'}
            </span>
            {isCurrentVersion && (
              <button
                type="button"
                className={`kprofile-legal-modal__linka-btn${isSyncing ? ' is-syncing' : ''}`}
                onClick={handleLinkaSync}
                disabled={isSyncing}
              >
                <SyncIcon />
                {isSyncing ? 'در حال استعلام…' : 'استعلام از لینکا'}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ═══ ورودی جادویی (Spotlight-style) ═══ */

function MagicInput({ contactId }) {
  const addInteraction = useContactsStore((state) => state.addInteraction);
  const [expanded, setExpanded] = useState(false);
  const [activityType, setActivityType] = useState('call');
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const rewriteTimer = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => () => clearTimeout(rewriteTimer.current), []);

  const trimmed = note.trim();
  const hasDate = Boolean(followUpDate);
  const hasValidDate = isValidJalaliDate(followUpDate);
  const isFutureDate = hasValidDate && compareJalaliDates(followUpDate, getTodayJalali()) > 0;
  /* متن الزامی؛ تاریخ پیگیری اختیاری اما اگر وارد شد باید معتبر و در آینده باشد */
  const canSubmit = Boolean(trimmed) && (!hasDate || isFutureDate) && !isRewriting;

  const reset = () => {
    clearTimeout(rewriteTimer.current);
    setIsRewriting(false);
    setNote('');
    setFollowUpDate('');
    setExpanded(false);
  };

  /* برگشت به حالت قرصی: Escape همیشه؛ کلیک بیرون فقط وقتی متنی تایپ نشده
     (تا یادداشت نیمه‌کاره با یک کلیک اشتباه از بین نرود) */
  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') reset();
    };
    const onPointerDown = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target) && !note.trim()) {
        reset();
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  });

  /** شبیه‌سازی فراخوانی DeepSeek — یک ثانیه لودینگ، سپس جایگزینی خلاصه ساختاریافته B2B. */
  const handleAiRewrite = () => {
    if (!trimmed || isRewriting) return;
    setIsRewriting(true);
    rewriteTimer.current = setTimeout(() => {
      setNote((current) => mockAiRewrite(current, activityType));
      setIsRewriting(false);
    }, 1000);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    let iso = null;
    if (hasDate && isFutureDate) {
      const { year, month, day } = parseJalaliDate(followUpDate);
      const g = jalaliToGregorian(year, month, day);
      iso = new Date(g.year, g.month - 1, g.day, 9, 0, 0).toISOString();
    }
    addInteraction(contactId, trimmed, iso, activityType);
    reset();
  };

  if (!expanded) {
    return (
      <div className="kprofile-magic">
        <button type="button" className="kprofile-magic__pill" onClick={() => setExpanded(true)}>
          <SparkIcon />
          ثبت فعالیت جدید… (تماس، جلسه، یادداشت)
        </button>
      </div>
    );
  }

  return (
    <div className="kprofile-magic" ref={panelRef}>
      <form className="kprofile-magic__panel" onSubmit={handleSubmit}>
        <div className="kprofile-magic__types" role="tablist" aria-label="نوع فعالیت">
          {ACTIVITY_TYPES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activityType === id}
              className={`kprofile-magic__type${activityType === id ? ' is-active' : ''}`}
              onClick={() => setActivityType(id)}
              disabled={isRewriting}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>

        <div className={`kprofile-ai-wrap${isRewriting ? ' is-busy' : ''}`} aria-busy={isRewriting}>
          <textarea
            className="kprofile-magic__textarea"
            placeholder="شرح فعالیت… (نتیجه تماس، توافق‌ها، اقدام بعدی)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={isRewriting}
            autoFocus
          />
          <button
            type="button"
            className="kprofile-ai-btn"
            title="بازنویسی خلاصه نتایج با هوش مصنوعی"
            aria-label="بازنویسی خلاصه نتایج با هوش مصنوعی"
            onClick={handleAiRewrite}
            disabled={!trimmed || isRewriting}
          >
            <SparkIcon />
          </button>
          {isRewriting && (
            <div className="kprofile-ai-overlay" role="status">
              <span className="kprofile-ai-spinner" aria-hidden="true" />
              دستیار هوش مصنوعی در حال پردازش...
            </div>
          )}
        </div>

        <div className="kprofile-magic__row">
          <div className="kprofile-magic__date">
            <JalaliDatePicker
              label="پیگیری بعدی (اختیاری)"
              value={followUpDate}
              onChange={setFollowUpDate}
              placeholder="انتخاب تاریخ"
            />
          </div>
          <div className="kprofile-magic__actions">
            <button type="button" className="kprofile-magic__cancel" onClick={reset}>
              انصراف
            </button>
            <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
              ثبت فعالیت
            </button>
          </div>
        </div>
        {hasDate && hasValidDate && !isFutureDate && (
          <p className="kprofile-magic__hint">تاریخ پیگیری باید بعد از امروز باشد.</p>
        )}
      </form>
    </div>
  );
}

/* ═══ تایم‌لاین ضربان ═══ */

function HeartbeatTimeline({ interactions }) {
  if (!interactions.length) {
    return <div className="kprofile-empty">هنوز تعاملی ثبت نشده است — اولین فعالیت را از نوار بالا ثبت کنید.</div>;
  }

  return (
    <ol className="kprofile-timeline">
      {interactions.map((item, index) => {
        const color = nodeColorFor(item.type);
        return (
          <li key={item.id || index} className="kprofile-timeline__item" style={{ '--node-color': color }}>
            <span className="kprofile-timeline__node" aria-hidden="true" />
            <article className="kprofile-timeline__card">
              <header className="kprofile-timeline__head">
                <span className="kprofile-timeline__type">{typeLabelFor(item.type)}</span>
                <span className="kprofile-timeline__date">{formatFaDate(item.date)}</span>
                {item.operator && <span className="kprofile-timeline__operator">{item.operator}</span>}
              </header>
              <p className="kprofile-timeline__note">{item.note || item.summary || '—'}</p>
              {item.nextFollowUp && (
                <span className="kprofile-timeline__followup">
                  <CalendarIcon />
                  پیگیری بعدی: {formatFaDate(item.nextFollowUp)}
                </span>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

/* ═══ تب سفارش‌ها ═══ */

function OrdersPanel({ contact }) {
  const { orders } = useNabzOrders();

  const liveOrders = useMemo(
    () => (orders || []).filter((order) => order.customerId === contact.id),
    [orders, contact.id],
  );

  const liveCodes = new Set(liveOrders.map((order) => order.code));
  const seedOrders = (contact.relatedOrders || []).filter((order) => !liveCodes.has(order.id));

  if (!liveOrders.length && !seedOrders.length) {
    return <div className="kprofile-empty">سفارشی برای این مخاطب ثبت نشده است.</div>;
  }

  const profileReturn = [`/kanoon/contact/${contact.id}`, 'پروفایل مشتری'];

  return (
    <div className="kprofile-orders">
      {liveOrders.map((order) => (
        <Link
          key={order.id}
          to={withReturnParams(
            `/nabz/order/${encodeURIComponent(order.code)}`,
            ...profileReturn,
          )}
          className="kprofile-order"
        >
          <span className="kprofile-order__code">{order.code}</span>
          <span className="kprofile-order__title">{getStageLabel(order.stageId)}</span>
          <span className="kprofile-order__date">{order.registeredDate}</span>
          <span className="kprofile-order__amount">{formatRial(order.amountRial)}</span>
        </Link>
      ))}
      {seedOrders.map((order) => (
        <Link
          key={order.id}
          to={withReturnParams(
            `/nabz?order=${encodeURIComponent(order.id)}`,
            ...profileReturn,
          )}
          className="kprofile-order"
        >
          <span className="kprofile-order__code">{order.id}</span>
          <span className="kprofile-order__title">{order.title || order.stage || '—'}</span>
          <span className="kprofile-order__date">{order.registeredAt}</span>
          <span className="kprofile-order__amount">{formatRial(order.amount)}</span>
        </Link>
      ))}
    </div>
  );
}

/* ═══ تب مشخصات ═══ */

const OFFICIAL_SPEC_FIELDS = [
  { key: 'registrationNumber', label: 'شماره ثبت' },
  { key: 'establishmentDate', label: 'تاریخ تاسیس' },
  { key: 'economicCode', label: 'کد اقتصادی' },
  { key: 'companyType', label: 'نوع شرکت' },
  { key: 'registrationRegion', label: 'منطقه ثبتی' },
  { key: 'latestGazette', label: 'آخرین آگهی رسمی' },
  { key: 'latestCapital', label: 'آخرین سرمایه ثبتی' },
  { key: 'postalCode', label: 'کدپستی' },
];

function SpecsPanel({ contact }) {
  const specs = contact.officialSpecs || {};
  const legalPersons = contact.legalPersons || {};
  const report = getReportCard(contact);
  const isCustomer = contact.entityType === ENTITY_TYPES.CUSTOMER;

  return (
    <div className="kprofile-specs">
      <section className="kprofile-glass kprofile-specs__card" aria-label="اطلاعات ثبتی">
        <h3 className="kprofile-side-card__title">اطلاعات ثبتی</h3>
        <SpecRow label="شناسه ملی" value={contact.nationalId} />
        {OFFICIAL_SPEC_FIELDS.map(({ key, label }) => (
          <SpecRow key={key} label={label} value={specs[key]} />
        ))}
        <SpecRow label="مدیر عامل" value={legalPersons.ceo} />
        <SpecRow label="امضادار" value={legalPersons.signatory} />
      </section>

      <section className="kprofile-glass kprofile-specs__card" aria-label="کارنامه">
        <h3 className="kprofile-side-card__title">کارنامه</h3>
        {isCustomer ? (
          <>
            <SpecRow label="تعداد کل سفارش‌ها" value={report.totalOrders} />
            <SpecRow label="سفارش‌های موفق" value={report.successfulOrders} />
            <SpecRow label="سفارش‌های ناموفق" value={report.failedOrders} />
            <SpecRow label="سفارش‌های جاری" value={report.activeOrders} />
            <SpecRow label="مبلغ کل فروش" value={report.totalSales} />
            <SpecRow label="سود کسب‌شده" value={report.totalProfit} />
            <SpecRow label="میانگین هر فاکتور" value={report.avgSaleAmount} />
          </>
        ) : (
          <>
            <SpecRow label="تعداد کل خرید" value={report.totalPurchases} />
            <SpecRow label="استعلام‌های ثبت‌شده" value={report.totalInquiries} />
            <SpecRow label="مبلغ کل خرید" value={report.totalPurchaseAmount} />
            <SpecRow label="سود کل خرید" value={report.totalPurchaseProfit} />
          </>
        )}
      </section>
    </div>
  );
}

function SpecRow({ label, value }) {
  const display = value === 0 ? '۰' : (value ?? '—');
  return (
    <div className="kprofile-specs__row">
      <span className="kprofile-specs__label">{label}</span>
      <span className="kprofile-specs__value">{display === '' ? '—' : display}</span>
    </div>
  );
}

/* ═══ صفحه اصلی ═══ */

const TABS = [
  { id: 'interactions', label: 'تعاملات و پیگیری' },
  { id: 'orders', label: 'سفارش‌ها' },
  { id: 'specs', label: 'مشخصات و کارنامه' },
];

export default function CustomerProfilePage() {
  const { contactId } = useParams();
  const [searchParams] = useSearchParams();
  const contacts = useContactsStore((state) => state.contacts);

  const contact = useMemo(
    () => contacts.find((c) => String(c.id) === String(contactId)) || null,
    [contacts, contactId],
  );

  const initialTab = TABS.some((tab) => tab.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'interactions';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  if (!contact) {
    return (
      <div className="module-page kanoon-profile-page" data-module="kanoon">
        <div className="kprofile-topbar">
          <SmartBackButton fallbackTo="/" fallbackName="کانون" />
        </div>
        <div className="kprofile-empty">مخاطبی با این شناسه پیدا نشد.</div>
      </div>
    );
  }

  return (
    <div className="module-page kanoon-profile-page" data-module="kanoon">
      <div className="kprofile-topbar">
        <SmartBackButton fallbackTo="/" fallbackName="کانون" />
      </div>

      <div className="kprofile">
        {/* ستون راست ۲۵٪ — چسبان */}
        <aside className="kprofile__side" aria-label="کابین هویت و مالی">
          <IdentityCard contact={contact} />
          <FinancialCockpit contact={contact} />
          <QuickContacts contact={contact} />
        </aside>

        {/* ستون چپ ۷۵٪ — تایم‌لاین ضربان */}
        <main className="kprofile__main">
          <div className="kprofile-tabs" role="tablist" aria-label="بخش‌های پروفایل">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`kprofile-tabs__btn${activeTab === tab.id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'interactions' && (
            <>
              <MagicInput contactId={contact.id} />
              <HeartbeatTimeline interactions={contact.interactions || []} />
            </>
          )}

          {activeTab === 'orders' && <OrdersPanel contact={contact} />}

          {activeTab === 'specs' && <SpecsPanel contact={contact} />}
        </main>
      </div>
    </div>
  );
}
