import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useContactsStore } from '../../stores/useContactsStore';
import SmartBackButton, { withReturnParams } from '../../components/navigation/SmartBackButton';
import { useNabzOrders } from '../nabz/NabzOrdersContext';
import { getStageLabel } from '../nabz/config';
import {
  SupplierPurchaseOrdersPanel,
  SupplierInquiriesPanel,
} from './SupplierSupplyPanels';
import {
  getCompanyProfileTabs,
  resolveCompanyProfileTab,
} from './companyProfileTabs';
import { BEHAVIORAL_STATUS, ENTITY_TYPES, PERSON_TYPES } from './config';
import { getDisplayName } from './columns';
import { getSupplierCapabilityTags } from './supplierCapabilities';
import { UserPlus, ShoppingCart, Target, Wallet, Plus } from 'lucide-react';
import ContactPersonsSection from '../../components/contactPerson/ContactPersonsSection';
import ContactPersonModal from '../../components/contactPerson/ContactPersonModal';
import { CompanyCompletionProfileBanner } from '../../components/customerCompletion';
import { ProfilePageShell, ProfileTabs, ProfileTabSectionHeader } from '../../components/profileLayout';
import PooyeshInteractionsPanel, { MagicInput } from '../pooyesh/PooyeshInteractionsPanel';
import CompanyTimelinePanel from '../pooyesh/timeline/CompanyTimelinePanel';
import GahshomarDocumentsPanel from '../gahshomar/GahshomarDocumentsPanel';
import CustomerFinancialCockpit from '../finance/components/CustomerFinancialCockpit';
import { formatRial } from '../finance/customerFinancialProjection';
import LegalInfoModal from './components/LegalInfoModal';
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
const ContactIcon = () => icon(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>);
const PinIcon = () => icon(<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>);
const GlobeIcon = () => icon(<><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>);
const InfoIcon = () => icon(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>, 13);

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/);
  if (!parts[0]) return '؟';
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2);
}

/* ═══ ستون راست: هویت ═══ */

function IdentityCard({ company, onCompanySaved }) {
  const displayName = getDisplayName(company) || '—';
  const statusMeta = BEHAVIORAL_STATUS[company.behavioralStatus];
  const isCustomer = company.entityType === ENTITY_TYPES.CUSTOMER;
  const isLegal = company.personType === PERSON_TYPES.LEGAL;
  const [isLegalModalOpen, setLegalModalOpen] = useState(false);
  const capabilityTags = !isCustomer ? getSupplierCapabilityTags(company) : [];

  const handleCompanyRefresh = () => {
    if (typeof onCompanySaved === 'function') onCompanySaved(company.id);
  };

  return (
    <section className="kprofile-glass kprofile-identity" aria-label="هویت مخاطب">
      <div className="kprofile-identity__avatar" aria-hidden="true">{getInitials(displayName)}</div>
      <div className="kprofile-identity__name-row">
        <h2 className="kprofile-identity__name font-meem">{displayName}</h2>
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
      <p className="kprofile-identity__meta font-meem">
        {isCustomer ? 'مشتری' : 'تامین‌کننده'} · {isLegal ? 'حقوقی' : 'حقیقی'}
      </p>
      {isLegal ? <CompanyCompletionProfileBanner company={company} /> : null}
      {!isCustomer && capabilityTags.length > 0 && (
        <div
          className="kprofile-identity__capabilities"
          data-testid="supplier-capability-tags"
          aria-label="توانمندی‌های تامین"
        >
          {capabilityTags.map((tag) => (
            <span
              key={tag.id}
              className={`kprofile-capability-tag font-meem${tag.type === 'custom' ? ' is-custom' : ''}`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}
      <div className="kprofile-identity__tags">
        {statusMeta && <span className="kprofile-chip">{statusMeta.label}</span>}
        {company.activityDomain && <span className="kprofile-chip">{company.activityDomain}</span>}
        {company.supplierType && <span className="kprofile-chip">{company.supplierType}</span>}
        {company.province && <span className="kprofile-chip">{company.province}</span>}
      </div>
      {company.assignee?.name && (
        <p className="kprofile-identity__assignee">
          {company.assignee.role || 'مسئول'}: <strong>{company.assignee.name}</strong>
        </p>
      )}

      {isLegalModalOpen && (
        <LegalInfoModal
          company={company}
          onClose={() => setLegalModalOpen(false)}
          onSaved={handleCompanyRefresh}
        />
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

  return (
    <section className="kprofile-glass kprofile-side-card" aria-label="تماس سریع">
      <h3 className="kprofile-side-card__title"><ContactIcon /> تماس‌ها و آدرس‌ها</h3>

      {rows.length === 0 && (
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
    </section>
  );
}

/* ═══ تب سفارش‌ها ═══ */

function OrdersPanel({ contact }) {
  const { orders } = useNabzOrders();

  const liveOrders = useMemo(
    () => (orders || []).filter((order) => String(order.customerId) === String(contact.id)),
    [orders, contact.id],
  );

  const liveCodes = new Set(liveOrders.map((order) => order.code));
  const seedOrders = (contact.relatedOrders || []).filter((order) => !liveCodes.has(order.id));
  const profileLabel = contact.entityType === ENTITY_TYPES.SUPPLIER
    ? 'پروفایل تامین‌کننده'
    : 'پروفایل مشتری';
  const profileReturn = [`/kanoon/contact/${contact.id}`, profileLabel];
  const newOrderTo = withReturnParams('/nabz', ...profileReturn);

  return (
    <div className="kprofile-orders-hub">
      <ProfileTabSectionHeader
        title="نبض — سفارشات"
        subtitle="سفارش‌های مرتبط با این مخاطب و ثبت سفارش جدید"
        Icon={ShoppingCart}
        action={(
          <Link to={newOrderTo} className="kprofile-orders-hub__new font-meem">
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
            ثبت سفارش جدید
          </Link>
        )}
      />

      {!liveOrders.length && !seedOrders.length ? (
        <div className="kprofile-empty font-meem">سفارشی برای این مخاطب ثبت نشده است.</div>
      ) : (
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
              <span className="kprofile-order__code font-yekan">{order.code}</span>
              <span className="kprofile-order__title font-meem">{getStageLabel(order.stageId)}</span>
              <span className="kprofile-order__date font-yekan">{order.registeredDate}</span>
              <span className="kprofile-order__amount font-yekan">{formatRial(order.amountRial)}</span>
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
              <span className="kprofile-order__code font-yekan">{order.id}</span>
              <span className="kprofile-order__title font-meem">{order.title || order.stage || '—'}</span>
              <span className="kprofile-order__date font-yekan">{order.registeredAt}</span>
              <span className="kprofile-order__amount font-yekan">{formatRial(order.amount)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══ تب‌ها و صفحه اصلی — چیدمان اصلی ۲۵/۷۵ ═══ */

function ComingSoonPanel({ title, subtitle, Icon }) {
  return (
    <section className="kprofile-tab-panel" aria-label={title}>
      <ProfileTabSectionHeader title={title} subtitle={subtitle} Icon={Icon} />
      <div className="kprofile-coming kprofile-glass">
        <span className="kprofile-coming__icon" aria-hidden="true">
          <Icon size={42} strokeWidth={1.25} />
        </span>
        <h3 className="kprofile-coming__title font-meem">{title}</h3>
        <p className="kprofile-coming__body font-meem">در دست توسعه</p>
      </div>
    </section>
  );
}

export default function CustomerProfilePage() {
  const { contactId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const contacts = useContactsStore((state) => state.contacts);

  const contact = useMemo(
    () => contacts.find((c) => String(c.id) === String(contactId)) || null,
    [contacts, contactId],
  );

  const entityType = contact?.entityType || ENTITY_TYPES.CUSTOMER;
  const profileTabs = useMemo(() => getCompanyProfileTabs(entityType), [entityType]);
  const activeTab = resolveCompanyProfileTab(searchParams.get('tab'), entityType);
  const [addPersonOpen, setAddPersonOpen] = useState(false);

  const handleTabChange = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next, { replace: true });
  };

  const tabs = useMemo(
    () => profileTabs.map(({ id, label, Icon }) => ({
      id,
      label,
      icon: <Icon size={14} strokeWidth={1.75} />,
    })),
    [profileTabs],
  );

  if (!contact) {
    return (
      <ProfilePageShell className="module-page kanoon-profile-page" dataModule="kanoon">
        <div className="kprofile-topbar">
          <SmartBackButton fallbackTo="/" fallbackName="کانون" />
        </div>
        <div className="kprofile-empty">مخاطبی با این شناسه پیدا نشد.</div>
      </ProfilePageShell>
    );
  }

  const isLegalCompany = contact.personType === PERSON_TYPES.LEGAL;
  const isSupplier = contact.entityType === ENTITY_TYPES.SUPPLIER;

  return (
    <ProfilePageShell className="module-page kanoon-profile-page" dataModule="kanoon">
      <div className="kprofile-topbar" role="toolbar" aria-label="عملیات پروفایل">
        <SmartBackButton fallbackTo="/" fallbackName="کانون" />
        {isLegalCompany ? (
          <button
            type="button"
            className="kprofile-topbar__add-person font-meem"
            onClick={() => setAddPersonOpen(true)}
          >
            <UserPlus size={16} strokeWidth={1.75} aria-hidden="true" />
            افزودن فرد مرتبط
          </button>
        ) : null}
      </div>

      <div className="kprofile">
        <aside className="kprofile__side" aria-label="کابین هویت و مالی">
          <IdentityCard company={contact} />
          <CustomerFinancialCockpit company={contact} />
          <QuickContacts contact={contact} />
          {isLegalCompany ? (
            <ContactPersonsSection companyId={contact.id} showAddButton={false} />
          ) : null}
        </aside>

        <main className="kprofile__main">
          <div className="kprofile-quick-activity" aria-label="ثبت سریع فعالیت">
            <MagicInput companyId={contact.id} />
          </div>

          <ProfileTabs
            className="kprofile-tabs"
            ariaLabel="بخش‌های پروفایل"
            tabs={tabs}
            activeId={activeTab}
            onChange={handleTabChange}
            tabClassName={(_tab, active) => `kprofile-tabs__btn${active ? ' is-active' : ''}`}
          />

          {activeTab === 'timeline' && <CompanyTimelinePanel company={contact} />}
          {activeTab === 'orders' && !isSupplier && <OrdersPanel contact={contact} />}
          {activeTab === 'purchases' && isSupplier && (
            <SupplierPurchaseOrdersPanel contact={contact} />
          )}
          {activeTab === 'opportunities' && !isSupplier && (
            <ComingSoonPanel
              title="افق — فرصت‌ها"
              subtitle="فرصت‌های فروش و پیگیری‌های مرتبط با این مخاطب"
              Icon={Target}
            />
          )}
          {activeTab === 'inquiries' && isSupplier && (
            <SupplierInquiriesPanel contact={contact} />
          )}
          {activeTab === 'interactions' && (
            <PooyeshInteractionsPanel company={contact} />
          )}
          {activeTab === 'documents' && (
            <GahshomarDocumentsPanel companyId={contact.id} />
          )}
          {activeTab === 'financial' && (
            <ComingSoonPanel
              title="صورت‌حساب مالی"
              subtitle="مانده حساب، دریافت‌ها، پرداخت‌ها و صورت‌حساب‌های مرتبط"
              Icon={Wallet}
            />
          )}
        </main>
      </div>

      <ContactPersonModal
        open={addPersonOpen}
        companyId={contact.id}
        onClose={() => setAddPersonOpen(false)}
      />
    </ProfilePageShell>
  );
}
