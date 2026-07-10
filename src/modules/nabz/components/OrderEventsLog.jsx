export default function OrderEventsLog({ events = [] }) {
  if (!events.length) {
    return <p className="nabz-events-empty">رویدادی ثبت نشده است.</p>;
  }

  const eventTypeLabel = {
    inquiry_registered: 'ثبت استعلام',
    inquiry_item_finalized: 'تکمیل استعلام سطر',
    inquiry_finalized: 'تکمیل استعلام',
    inquiry_order_completed: 'تکمیل کاوش و تغییر مرحله',
    stage_advanced: 'تغییر مرحله',
  };

  return (
    <ol className="nabz-events-log">
      {[...events].reverse().map((event) => (
        <li key={event.id} className="nabz-events-log__item">
          <div className="nabz-events-log__head">
            <span className="nabz-events-log__type">
              {eventTypeLabel[event.type] || 'رویداد'}
            </span>
            <span className="nabz-events-log__at">{event.at}</span>
          </div>
          <p className="nabz-events-log__summary">{event.summary}</p>
          {event.fromStageLabel && event.toStageLabel && (
            <p className="nabz-events-log__detail">
              مرحله:
              {' '}
              {event.fromStageLabel}
              {' '}
              ←
              {' '}
              {event.toStageLabel}
            </p>
          )}
          <p className="nabz-events-log__by">
            توسط
            {' '}
            {event.by}
          </p>
          {event.discrepancyDescription && (
            <p className="nabz-events-log__detail">
              شرح مغایرت:
              {' '}
              {event.discrepancyDescription}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
