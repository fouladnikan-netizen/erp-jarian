import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { History, ShoppingCart, Phone, Banknote, FileText } from 'lucide-react';
import { useContactsStore } from '../../../stores/useContactsStore';
import { useNabzStore } from '../../nabz/store/useNabzStore';
import { withReturnParams } from '../../../components/navigation/SmartBackButton';
import EntityMentionText from '../../../components/navigation/EntityMentionText';
import { ProfileTabSectionHeader } from '../../../components/profileLayout';
import { ENTITY_TYPES } from '../../kanoon/config';
import { getDisplayName } from '../../kanoon/columns';
import { getCompanyTimeline } from './companyTimelineFacade';
import '../../kanoon/customerProfile.css';
import '../pooyesh-panel.css';

/**
 * Pooyesh ownership surface for the company vertical activity timeline.
 * UI preserved from CustomerProfilePage EventsTimelinePanel — domain owner is Pooyesh.
 * CustomerProfilePage must only compose this panel.
 */

const EVENT_META = {
  order: { label: 'سفارش', Icon: ShoppingCart, color: 'var(--color-brand-red)' },
  followup: { label: 'پیگیری', Icon: Phone, color: 'var(--color-neutral-400)' },
  payment: { label: 'پرداخت', Icon: Banknote, color: 'var(--success)' },
  invoice: { label: 'صورتحساب', Icon: FileText, color: 'var(--success)' },
};

/**
 * @param {{ company: object, returnTo?: string, returnName?: string }} props
 */
export default function CompanyTimelinePanel({ company, returnTo: returnToProp, returnName: returnNameProp }) {
  const companyId = company?.id;
  // Subscribe so timeline refreshes when Pooyesh activities or Nabz orders change.
  useContactsStore((state) => state.contacts);
  const orders = useNabzStore((state) => state.orders);

  const events = useMemo(
    () => getCompanyTimeline(companyId, { orders }),
    [companyId, orders, company],
  );

  const returnTo = returnToProp ?? (companyId != null
    ? `/kanoon/contact/${companyId}?tab=timeline`
    : undefined);
  const returnName = returnNameProp ?? (
    getDisplayName(company)
    || (company?.entityType === ENTITY_TYPES.SUPPLIER ? 'پروفایل تامین‌کننده' : 'پروفایل مشتری')
  );  const companyMentions = useMemo(() => {
    const name = getDisplayName(company);
    if (!name || companyId == null) return [];
    return [{ id: companyId, name }];
  }, [company, companyId]);

  return (
    <section
      className="kprofile-events"
      data-domain="pooyesh"
      aria-label="تایم‌لاین وقایع"
    >
      <ProfileTabSectionHeader
        title="تایم‌لاین وقایع"
        subtitle="سفارش‌ها، پیگیری‌ها، دریافت‌ها و صدور صورتحساب — به‌ترتیب زمان"
        Icon={History}
      />

      {!events.length ? (
        <div className="kprofile-empty font-meem">
          هنوز واقعه‌ای برای این مخاطب ثبت نشده است.
        </div>
      ) : (
        <ol className="kprofile-timeline kprofile-events__list">
          {events.map((event) => {
            const meta = EVENT_META[event.kind] || EVENT_META.followup;
            const Icon = meta.Icon;
            const primaryOrderPath = event.orderCode
              ? `/nabz/order/${encodeURIComponent(event.orderCode)}`
              : null;
            return (
              <li
                key={event.id}
                className="kprofile-timeline__item"
                style={{ '--node-color': meta.color }}
              >
                <span className="kprofile-timeline__node" aria-hidden="true" />
                <article className="kprofile-timeline__card kprofile-events__card">
                  <header className="kprofile-timeline__head">
                    <span className="kprofile-events__kind font-meem">
                      <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
                      {meta.label}
                    </span>
                    <span className="kprofile-timeline__type font-meem">
                      {primaryOrderPath ? (
                        <Link
                          to={withReturnParams(primaryOrderPath, returnTo, returnName)}
                          className="entity-mention-link font-meem"
                        >
                          {event.title}
                        </Link>
                      ) : (
                        event.title
                      )}
                    </span>
                    <span className="kprofile-timeline__date font-yekan">{event.dateLabel}</span>
                  </header>
                  <p className="kprofile-timeline__note font-meem">
                    <EntityMentionText
                      text={event.body}
                      returnTo={returnTo}
                      returnName={returnName}
                      companies={companyMentions}
                      extraLabels={event.links}
                    />
                  </p>
                  {event.meta ? (
                    <span className="kprofile-events__meta font-yekan">
                      <EntityMentionText
                        text={event.meta}
                        returnTo={returnTo}
                        returnName={returnName}
                        extraLabels={event.links}
                      />
                    </span>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
