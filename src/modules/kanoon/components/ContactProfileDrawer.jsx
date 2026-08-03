import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BEHAVIORAL_STATUS,
  CUSTOMER_ACTIVITY_DOMAINS,
  ENTITY_TYPES,
  PERSON_TYPES,
} from '../config';
import { getDisplayName } from '../columns';
import { getReportCard } from '../reportCard';
import { formatProductGroups } from './ProductGroupMultiSelect';
import StatusTag from '../../../components/module/StatusTag';
import ContactPersonsSection from './ContactPersonsSection';

const OFFICIAL_SPEC_FIELDS = [
  { key: 'establishmentDate', label: 'تاریخ تاسیس' },
  { key: 'economicCode', label: 'کد اقتصادی' },
  { key: 'companyType', label: 'نوع شرکت' },
  { key: 'registrationRegion', label: 'منطقه ثبتی' },
  { key: 'latestGazette', label: 'آخرین آگهی رسمی' },
  { key: 'latestCapital', label: 'آخرین سرمایه ثبتی' },
  { key: 'phone', label: 'تلفن' },
  { key: 'website', label: 'وبسایت' },
  { key: 'address', label: 'آدرس' },
  { key: 'postalCode', label: 'کدپستی' },
];

const ORDER_STAGE_TAG = {
  مظنه: 'active',
  'پیش‌کش': 'pending',
  تحقق: 'success',
  کاوش: 'trial',
};

function buildTabs(contact) {
  const tabs = [
    { id: 'official', label: 'مشخصات رسمی' },
  ];
  if (contact.personType === PERSON_TYPES.LEGAL) {
    tabs.push({ id: 'related', label: 'اشخاص مرتبط' });
  }
  tabs.push(
    { id: 'interactions', label: 'سوابق تعاملات' },
    { id: 'orders', label: 'سفارش‌ها' },
    { id: 'report', label: 'کارنامه' },
  );
  return tabs;
}

export default function ContactProfileDrawer({ contact, onClose, onUpdateContact }) {
  const tabs = useMemo(() => buildTabs(contact), [contact.personType]);
  const [activeTab, setActiveTab] = useState(contact._initialTab || 'official');
  const displayName = getDisplayName(contact);
  const statusMeta = BEHAVIORAL_STATUS[contact.behavioralStatus];
  const specs = contact.officialSpecs || {};
  const legalPersons = contact.legalPersons || {};
  const report = getReportCard(contact);

  const sortedInteractions = [...(contact.interactions || [])].sort(
    (a, b) => b.date.localeCompare(a.date, 'fa'),
  );

  const sortedOrders = [...(contact.relatedOrders || [])].sort(
    (a, b) => (b.registeredAt || '').localeCompare(a.registeredAt || '', 'fa'),
  );

  useEffect(() => {
    setActiveTab(contact._initialTab || 'official');
  }, [contact.id, contact._initialTab]);

  const update = (patch) => onUpdateContact(contact.id, patch);

  return (
    <div className="kanoon-drawer-overlay" onClick={onClose} role="presentation">
      <aside
        className="kanoon-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`پروفایل ${displayName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="kanoon-drawer__header">
          <div>
            <h2 className="kanoon-drawer__title">{displayName}</h2>
            <p className="kanoon-drawer__subtitle">
              {contact.entityType === 'customer' ? 'مشتری' : 'تامین‌کننده'}
              {' · '}
              {contact.personType === PERSON_TYPES.LEGAL ? 'حقوقی' : 'حقیقی'}
              {statusMeta && (
                <>
                  {' · '}
                  <StatusTag value={`tag:${statusMeta.tag}:${statusMeta.label}`} />
                </>
              )}
            </p>
          </div>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="kanoon-drawer__tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`kanoon-drawer__tab${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="kanoon-drawer__body">
          {activeTab === 'official' && (
            <div className="kanoon-profile-panel">
              {contact.personType === PERSON_TYPES.LEGAL ? (
                <>
                  {/* Linka: officialSpecs + legalPersons auto-filled by nationalId via Shirazeh web service */}
                  <div className="kanoon-profile-panel__section">
                    <h3>اطلاعات ثبتی</h3>
                    <ProfileRow label="شماره ثبت" value={specs.registrationNumber} />
                    <ProfileRow label="شناسه ملی" value={contact.nationalId} />
                    {OFFICIAL_SPEC_FIELDS.map(({ key, label }) => (
                      <ProfileRow key={key} label={label} value={specs[key]} />
                    ))}
                    <ProfileRow label="آدرس کامل" value={contact.fullAddress} />
                  </div>

                  {contact.entityType === ENTITY_TYPES.CUSTOMER && (
                    <div className="kanoon-profile-panel__section">
                      <h3>پرونده هویتی</h3>
                      <label className="kanoon-form__field">
                        <span className="kanoon-form__label">استان</span>
                        <input
                          type="text"
                          className="kanoon-profile-panel__edit"
                          value={contact.province || ''}
                          placeholder="مثلاً تهران"
                          onChange={(e) => update({ province: e.target.value })}
                        />
                      </label>
                    </div>
                  )}

                  <div className="kanoon-profile-panel__section">
                    <h3>اشخاص قانونی</h3>
                    <ProfileRow label="مدیر عامل" value={legalPersons.ceo} />
                    <ProfileRow label="امضادار" value={legalPersons.signatory} />
                  </div>

                  {contact.entityType === ENTITY_TYPES.CUSTOMER && (
                    <div className="kanoon-profile-panel__section">
                      <h3>زمینه فعالیت ثبت شده</h3>
                      <label className="kanoon-form__field">
                        <select
                          className="kanoon-profile-panel__edit"
                          value={contact.activityDomain || ''}
                          onChange={(e) => update({ activityDomain: e.target.value })}
                        >
                          <option value="">— انتخاب کنید —</option>
                          {CUSTOMER_ACTIVITY_DOMAINS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}

                  {contact.entityType === ENTITY_TYPES.SUPPLIER && (
                    <div className="kanoon-profile-panel__section">
                      <h3>گروه‌های کالایی</h3>
                      <p className="kanoon-profile-panel__value kanoon-profile-panel__value--block">
                        {formatProductGroups(contact.productGroups)}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <ProfileRow label="نام شخص" value={contact.personName} />
                  <ProfileRow label="موبایل" value={contact.mobile} />
                  <ProfileRow label="حوزه فعالیت" value={contact.activityDomain} />
                  {contact.entityType === ENTITY_TYPES.CUSTOMER && (
                    <div className="kanoon-profile-panel__section">
                      <h3>پرونده هویتی</h3>
                      <label className="kanoon-form__field">
                        <span className="kanoon-form__label">استان</span>
                        <input
                          type="text"
                          className="kanoon-profile-panel__edit"
                          value={contact.province || ''}
                          placeholder="مثلاً اصفهان"
                          onChange={(e) => update({ province: e.target.value })}
                        />
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'related' && contact.personType === PERSON_TYPES.LEGAL && (
            <div className="kanoon-profile-panel">
              <ContactPersonsSection companyId={contact.id} />
            </div>
          )}

          {activeTab === 'interactions' && (
            <div className="kanoon-profile-panel">
              {sortedInteractions.length ? (
                <ul className="kanoon-timeline">
                  {sortedInteractions.map((item, i) => (
                    <li key={i} className="kanoon-timeline__item">
                      <span className="kanoon-timeline__date">{item.date}</span>
                      <span className="kanoon-timeline__type">{item.type}</span>
                      <p className="kanoon-timeline__summary">{item.summary}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="kanoon-profile-panel__empty">هنوز تعاملی ثبت نشده است.</p>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="kanoon-profile-panel">
              {sortedOrders.length ? (
                <div className="kanoon-order-cards">
                  {sortedOrders.map((order) => {
                    const stageTag = ORDER_STAGE_TAG[order.stage] || 'pending';
                    return (
                      <Link
                        key={order.id}
                        to={`/nabz?order=${encodeURIComponent(order.id)}`}
                        className="kanoon-order-card"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="kanoon-order-card__id">{order.id}</span>
                        <span className="kanoon-order-card__date">{order.registeredAt}</span>
                        <StatusTag value={`tag:${stageTag}:${order.stage}`} />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="kanoon-profile-panel__empty">سفارشی مرتبط ثبت نشده است.</p>
              )}
            </div>
          )}

          {activeTab === 'report' && (
            <div className="kanoon-profile-panel">
              {contact.entityType === ENTITY_TYPES.CUSTOMER ? (
                <>
                  <ReportSection title="آمار سفارش‌ها">
                    <ProfileRow label="تعداد کل سفارش‌ها" value={report.totalOrders} />
                    <ProfileRow label="سفارش‌های موفق" value={report.successfulOrders} />
                    <ProfileRow label="سفارش‌های ناموفق" value={report.failedOrders} />
                    <ProfileRow label="سفارش‌های جاری" value={report.activeOrders} />
                  </ReportSection>
                  <ReportSection title="اطلاعات مالی">
                    <ProfileRow label="مبلغ کل فروش" value={report.totalSales} />
                    <ProfileRow label="مبلغ کل سود کسب شده" value={report.totalProfit} />
                    <ProfileRow label="میانگین فروش هر فاکتور" value={report.avgSaleAmount} />
                    <ProfileRow label="میانگین سود هر فاکتور" value={report.avgSaleProfit} />
                  </ReportSection>
                </>
              ) : (
                <>
                  <ReportSection title="آمار خرید">
                    <ProfileRow label="تعداد کل خرید" value={report.totalPurchases} />
                    <ProfileRow label="تعداد استعلام ثبت شده" value={report.totalInquiries} />
                  </ReportSection>
                  <ReportSection title="اطلاعات مالی">
                    <ProfileRow label="مبلغ کل خرید" value={report.totalPurchaseAmount} />
                    <ProfileRow label="سود کل خرید" value={report.totalPurchaseProfit} />
                    <ProfileRow label="میانگین مبلغ خریدها" value={report.avgPurchaseAmount} />
                    <ProfileRow label="میانگین سود خریدها" value={report.avgPurchaseProfit} />
                  </ReportSection>
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function ProfileRow({ label, value }) {
  const display = value === 0 ? '۰' : (value ?? '—');
  return (
    <div className="kanoon-profile-panel__row">
      <span className="kanoon-profile-panel__label">{label}</span>
      <span className="kanoon-profile-panel__value">{display === '' ? '—' : display}</span>
    </div>
  );
}

function ReportSection({ title, children }) {
  return (
    <div className="kanoon-profile-panel__section">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
