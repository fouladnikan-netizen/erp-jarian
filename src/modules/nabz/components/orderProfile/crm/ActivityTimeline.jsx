import { useMemo, useState } from 'react';
import {
  CRM_ACTIVITY_META,
  CRM_ACTIVITY_TYPES,
  CRM_TIMELINE_FILTER_ORDER,
  CRM_TIMELINE_FILTER_META,
  CRM_TIMELINE_FILTERS,
} from '../../../orderCrmConfig';
import { filterCrmActivities } from '../../../orderCrmService';
import { formatJarianMoney } from '../../../../../config/JarianUI.config';
import { CrmActivityBody } from './MentionTextarea';

function ActivityTypeIcon({ type }) {
  const meta = CRM_ACTIVITY_META[type];
  return (
    <span className="order-crm-timeline__node-icon" aria-hidden="true">
      {meta?.icon || '📝'}
    </span>
  );
}

function formatFollowUpDate(dateValue) {
  if (!dateValue) return '—';
  // ورودی DatePicker به‌صورت ISO (YYYY-MM-DD) است؛ به تقویم فارسی تبدیل می‌شود.
  if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
    const parsed = new Date(dateValue);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('fa-IR');
    }
  }
  // در غیر این صورت (مثل داده نمونه) همان رشته نمایش داده می‌شود.
  return dateValue;
}

export default function ActivityTimeline({ activities, onCompleteFollowUp }) {
  const [filter, setFilter] = useState(CRM_TIMELINE_FILTERS.ALL);

  const filteredActivities = useMemo(
    () => filterCrmActivities(activities, filter),
    [activities, filter],
  );

  const sortedActivities = useMemo(
    () => [...filteredActivities].reverse(),
    [filteredActivities],
  );

  return (
    <section className="order-crm-card order-crm-timeline">
      <header className="order-crm-card__head order-crm-timeline__head">
        <h2 className="order-crm-card__title">تایم‌لاین تعاملات</h2>
        <div className="order-crm-filters" role="tablist" aria-label="فیلتر تایم‌لاین">
          {CRM_TIMELINE_FILTER_ORDER.map((filterId) => (
            <button
              key={filterId}
              type="button"
              role="tab"
              aria-selected={filter === filterId}
              className={`order-crm-filters__btn${filter === filterId ? ' is-active' : ''}`}
              onClick={() => setFilter(filterId)}
            >
              {CRM_TIMELINE_FILTER_META[filterId].label}
            </button>
          ))}
        </div>
      </header>

      <div className="order-crm-timeline__feed" aria-live="polite">
        {sortedActivities.length === 0 ? (
          <p className="order-crm-timeline__empty">تعاملی برای نمایش وجود ندارد.</p>
        ) : (
          <ol className="order-crm-timeline__list">
            {sortedActivities.map((activity) => {
              const meta = CRM_ACTIVITY_META[activity.type];
              const hasActiveFollowUp = activity.followUp && !activity.followUp.completed;

              return (
                <li key={activity.id} className="order-crm-timeline__item">
                  <div className="order-crm-timeline__track" aria-hidden="true">
                    <div className="order-crm-timeline__node">
                      <ActivityTypeIcon type={activity.type} />
                    </div>
                  </div>
                  <article className="order-crm-timeline__card">
                    <header className="order-crm-timeline__card-head">
                      <div className="order-crm-timeline__author">
                        <strong>
                          {activity.roleLabel}
                          {' '}
                          -
                          {' '}
                          {activity.author}
                        </strong>
                        <span className="order-crm-timeline__type">{meta?.label}</span>
                      </div>
                      <time className="order-crm-timeline__time">{activity.createdAt}</time>
                    </header>

                    <CrmActivityBody body={activity.body} />

                    {activity.type === CRM_ACTIVITY_TYPES.PAYMENT && activity.payment ? (
                      <div className="order-crm-payment-meta">
                        <span>
                          مبلغ:
                          {' '}
                          <strong className="font-vazir">
                            {formatJarianMoney(activity.payment.amountRial, { withCurrency: true })}
                          </strong>
                        </span>
                        <span>
                          تاریخ:
                          {' '}
                          <strong className="font-vazir">{activity.payment.date || '—'}</strong>
                        </span>
                        {activity.payment.receiptFileName ? (
                          <span className="font-vazir">
                            فیش:
                            {' '}
                            {activity.payment.receiptFileName}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {activity.followUp && (
                      <div className={`order-crm-reminder${activity.followUp.completed ? ' is-done' : ''}`}>
                        <div className="order-crm-reminder__content">
                          <span className="order-crm-reminder__label">یادآور پیگیری</span>
                          <strong>{activity.followUp.title || activity.followUp.actionType}</strong>
                          <span className="order-crm-reminder__meta">
                            مسئول:
                            {' '}
                            {activity.followUp.assignee || activity.roleLabel || '—'}
                            {' · '}
                            {formatFollowUpDate(activity.followUp.date)}
                            {' · '}
                            {activity.followUp.time}
                            {' · '}
                            {activity.followUp.actionType}
                          </span>
                        </div>
                        {hasActiveFollowUp && (
                          <button
                            type="button"
                            className="order-crm-reminder__done"
                            onClick={() => onCompleteFollowUp?.(activity.id)}
                          >
                            ✓ انجام شد
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
