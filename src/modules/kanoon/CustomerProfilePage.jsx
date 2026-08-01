import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useContactsStore } from '../../stores/useContactsStore';
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

  return (
    <section className="kprofile-glass kprofile-identity" aria-label="هویت مخاطب">
      <div className="kprofile-identity__avatar" aria-hidden="true">{getInitials(displayName)}</div>
      <h2 className="kprofile-identity__name">{displayName}</h2>
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

/* ═══ ورودی جادویی (Spotlight-style) ═══ */

function MagicInput({ contactId }) {
  const addInteraction = useContactsStore((state) => state.addInteraction);
  const [expanded, setExpanded] = useState(false);
  const [activityType, setActivityType] = useState('call');
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const trimmed = note.trim();
  const hasDate = Boolean(followUpDate);
  const hasValidDate = isValidJalaliDate(followUpDate);
  const isFutureDate = hasValidDate && compareJalaliDates(followUpDate, getTodayJalali()) > 0;
  /* متن الزامی؛ تاریخ پیگیری اختیاری اما اگر وارد شد باید معتبر و در آینده باشد */
  const canSubmit = Boolean(trimmed) && (!hasDate || isFutureDate);

  const reset = () => {
    setNote('');
    setFollowUpDate('');
    setExpanded(false);
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
    <div className="kprofile-magic">
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
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>

        <textarea
          className="kprofile-magic__textarea"
          placeholder="شرح فعالیت… (نتیجه تماس، توافق‌ها، اقدام بعدی)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          autoFocus
        />

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

  return (
    <div className="kprofile-orders">
      {liveOrders.map((order) => (
        <Link key={order.id} to={`/nabz/order/${encodeURIComponent(order.code)}`} className="kprofile-order">
          <span className="kprofile-order__code">{order.code}</span>
          <span className="kprofile-order__title">{getStageLabel(order.stageId)}</span>
          <span className="kprofile-order__date">{order.registeredDate}</span>
          <span className="kprofile-order__amount">{formatRial(order.amountRial)}</span>
        </Link>
      ))}
      {seedOrders.map((order) => (
        <Link key={order.id} to={`/nabz?order=${encodeURIComponent(order.id)}`} className="kprofile-order">
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
          <Link to="/" className="kprofile-topbar__back">→ بازگشت به کانون</Link>
        </div>
        <div className="kprofile-empty">مخاطبی با این شناسه پیدا نشد.</div>
      </div>
    );
  }

  return (
    <div className="module-page kanoon-profile-page" data-module="kanoon">
      <div className="kprofile-topbar">
        <Link to="/" className="kprofile-topbar__back">→ بازگشت به کانون</Link>
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
