import { useMemo } from 'react';
import { History } from 'lucide-react';
import { getActivitiesForEntity } from '../../mockData/activityLog';
import ActivityItem from './ActivityItem';

/**
 * تایم‌لاین فعالیت entity-agnostic.
 * @param {{ entityType: string, entityId: string, activities?: object[] }} props
 */
export default function ActivityTimeline({
  entityType,
  entityId,
  activities,
}) {
  const items = useMemo(() => {
    if (Array.isArray(activities)) return activities;
    return getActivitiesForEntity(entityType, entityId);
  }, [activities, entityType, entityId]);

  if (!items.length) {
    return (
      <div className="activity-timeline activity-timeline--empty">
        <History size={20} strokeWidth={1.75} aria-hidden="true" />
        <p className="font-meem">هنوز رویدادی برای این موجودیت ثبت نشده است.</p>
      </div>
    );
  }

  return (
    <div className="activity-timeline" dir="rtl">
      <header className="activity-timeline__head">
        <History size={16} strokeWidth={1.75} aria-hidden="true" />
        <div>
          <h3 className="activity-timeline__title font-meem">سوابق فعالیت‌ها</h3>
          <p className="activity-timeline__sub font-meem">
            تاریخچه رویدادها برای
            {' '}
            <span className="font-yekan">{entityId}</span>
          </p>
        </div>
      </header>

      <div className="activity-timeline__list" role="list">
        {items.map((activity) => (
          <div key={activity.id} role="listitem">
            <ActivityItem activity={activity} />
          </div>
        ))}
      </div>
    </div>
  );
}
