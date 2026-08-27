import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { History, ShoppingCart, Phone, Banknote, FileText, CheckSquare } from 'lucide-react';
import { useOrders } from '../../nabz/public/index.js';
import { useCompanies } from '../../kanoon/public/index.js';
import { useActivitiesVersion, useTasksVersion } from '../public/index.js';
import { withReturnParams } from '../../../components/navigation/SmartBackButton';
import EntityMentionText from '../../../components/navigation/EntityMentionText';
import { ProfileTabSectionHeader } from '../../../components/profileLayout';
import { ENTITY_TYPES } from '../../kanoon/config';
import { getDisplayName } from '../../kanoon/columns';
import { fetchSubjectTimeline, getCompanyTimeline } from './companyTimelineFacade';
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
  task: { label: 'وظیفه', Icon: CheckSquare, color: 'var(--accent)' },
  'lead-activity': { label: 'فعالیت سرنخ', Icon: Phone, color: 'var(--color-neutral-400)' },
  'lead-task': { label: 'وظیفه سرنخ', Icon: CheckSquare, color: 'var(--accent)' },
  'lead-conversion': { label: 'تبدیل سرنخ', Icon: History, color: 'var(--color-brand-red)' },
};

/**
 * @param {{ company: object, returnTo?: string, returnName?: string }} props
 */
export default function CompanyTimelinePanel({ company, returnTo: returnToProp, returnName: returnNameProp }) {
  const companyId = company?.id;
  // Subscribe via public facades (no direct foreign-store imports).
  useCompanies();
  const activitiesVersion = useActivitiesVersion();
  const tasksVersion = useTasksVersion();
  const orders = useOrders();

  useEffect(() => {
    if (companyId == null) return undefined;
    void fetchSubjectTimeline(companyId);
    return undefined;
  }, [companyId]);

  const events = useMemo(
    () => getCompanyTimeline(companyId, { orders }),
    // activitiesVersion/tasksVersion: invalidate when Activity/Task cache updates after fetch/create
    [companyId, orders, company, activitiesVersion, tasksVersion],
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
            const primaryLeadPath = !primaryOrderPath && event.links?.[0]?.kind === 'lead'
              ? event.links[0].path
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
                      ) : primaryLeadPath ? (
                        <Link
                          to={withReturnParams(primaryLeadPath, returnTo, returnName)}
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
