import { buildOrderActivityTimeline } from '../../orderProfileService';

export default function OrderProfileTimelineTab({ order }) {
  const entries = buildOrderActivityTimeline(order);

  return (
    <div className="order-profile-card order-profile-timeline">
      <ol className="order-profile-timeline__list">
        {entries.map((entry, index) => (
          <li
            key={entry.id}
            className={`order-profile-timeline__item order-profile-timeline__item--${entry.kind}`}
          >
            <div className="order-profile-timeline__marker" aria-hidden="true">
              <span className="order-profile-timeline__dot" />
              {index < entries.length - 1 && <span className="order-profile-timeline__line" />}
            </div>
            <div className="order-profile-timeline__content">
              <time className="order-profile-timeline__at">{entry.at}</time>
              <p className="order-profile-timeline__text">{entry.text}</p>
              {entry.by && (
                <p className="order-profile-timeline__by">توسط {entry.by}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
