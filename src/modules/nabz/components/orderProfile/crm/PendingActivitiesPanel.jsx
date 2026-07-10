import { CRM_ACTIVITY_META } from '../../../orderCrmConfig';
import { getPendingActivityTitle, getPendingCrmActivities } from '../../../orderCrmService';

export default function PendingActivitiesPanel({
  order,
  onComplete,
  onEdit,
  onAddNew,
}) {
  const pending = getPendingCrmActivities(order);

  return (
    <section className="order-crm-pending">
      <header className="order-crm-pending__head">
        <h2 className="order-crm-pending__title">برنامه‌های در پیش‌رو (Pending Activities)</h2>
        <span className="order-crm-pending__count">
          {pending.length.toLocaleString('fa-IR')}
        </span>
      </header>

      {pending.length === 0 ? (
        <div className="order-crm-pending__empty">
          <p>هیچ برنامه‌ای برای این سفارش تنظیم نشده است!</p>
          <button type="button" className="order-crm-pending__empty-btn" onClick={onAddNew}>
            + ثبت برنامه جدید
          </button>
        </div>
      ) : (
        <ul className="order-crm-pending__list">
          {pending.map((activity) => {
            const meta = CRM_ACTIVITY_META[activity.type];
            return (
              <li key={activity.id} className="order-crm-pending__item">
                <div className="order-crm-pending__item-main">
                  <div className="order-crm-pending__item-icon" aria-hidden="true">
                    {meta?.icon || '📌'}
                  </div>
                  <div className="order-crm-pending__item-body">
                    <strong className="order-crm-pending__item-title">
                      {getPendingActivityTitle(activity)}
                    </strong>
                    <span className="order-crm-pending__item-assignee">
                      مسئول:
                      {' '}
                      {activity.followUp?.assignee || activity.roleLabel || '—'}
                    </span>
                  </div>
                </div>
                <div className="order-crm-pending__item-actions">
                  <button
                    type="button"
                    className="order-crm-pending__action order-crm-pending__action--done"
                    onClick={() => onComplete?.(activity.id)}
                  >
                    ✓ علامت‌گذاری به عنوان انجام‌شده
                  </button>
                  <button
                    type="button"
                    className="order-crm-pending__action"
                    onClick={() => onEdit?.(activity)}
                  >
                    ویرایش/تغییر زمان
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
