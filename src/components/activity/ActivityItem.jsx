import { User } from 'lucide-react';
import { getActivityConfig } from '../../config/activityEvents';
import { toPersianDigits } from '../../utils/numberUtils';

function formatActivityTime(iso) {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      calendar: 'persian',
    }).format(new Date(iso));
  } catch {
    return toPersianDigits(String(iso || '—'));
  }
}

/**
 * کارت شیشه‌ای یک رویداد در تایم‌لاین فعالیت.
 */
export default function ActivityItem({ activity }) {
  const config = getActivityConfig(activity?.eventType);
  const Icon = config.icon;
  const actorName = activity?.actor?.name || '—';
  const category = config.category || 'system';

  return (
    <article className={`activity-item activity-item--${category}`}>
      <div className="activity-item__rail" aria-hidden="true">
        <span className="activity-item__dot">
          <Icon size={13} strokeWidth={1.75} />
        </span>
        <span className="activity-item__line" />
      </div>

      <div className="activity-item__card">
        <header className="activity-item__head">
          <h4 className="activity-item__title font-meem">{config.title}</h4>
          <time className="activity-item__time font-yekan" dateTime={activity?.createdAt}>
            {formatActivityTime(activity?.createdAt)}
          </time>
        </header>

        <p className="activity-item__desc font-meem">
          {activity?.description || '—'}
        </p>

        <footer className="activity-item__meta">
          <span className="activity-item__actor font-meem">
            <User size={12} strokeWidth={1.75} aria-hidden="true" />
            {actorName}
          </span>
          {activity?.actor?.type ? (
            <span className="activity-item__actor-type font-meem">
              {activity.actor.type}
            </span>
          ) : null}
        </footer>
      </div>
    </article>
  );
}
