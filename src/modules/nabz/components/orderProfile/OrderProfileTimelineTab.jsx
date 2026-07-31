import { buildOrderActivityTimeline } from '../../orderProfileService';
import { getProformaVersions } from '../../proformaService';
import {
  openProformaVersionPreview,
  printProformaVersion,
} from '../../proformaPrint';

export default function OrderProfileTimelineTab({
  order,
  onSendProformaVersion,
}) {
  const entries = buildOrderActivityTimeline(order);
  const versions = [...getProformaVersions(order)].reverse();

  return (
    <div className="order-profile-timeline-wrap">
      {versions.length > 0 && (
        <section className="order-profile-card order-profile-proforma-archive">
          <h3 className="order-profile-proforma-archive__title">نسخه‌های پیش‌فاکتور</h3>
          <ul className="order-profile-proforma-archive__list">
            {versions.map((version) => (
              <li key={version.id} className="order-profile-proforma-archive__item">
                <div className="order-profile-proforma-archive__meta">
                  <strong className="order-profile-proforma-archive__number font-yekan">
                    {version.documentNumber}
                  </strong>
                  <span className="order-profile-proforma-archive__at font-yekan">
                    {version.issuedAt}
                  </span>
                  {version.issuedBy ? (
                    <span className="order-profile-proforma-archive__by">
                      توسط {version.issuedBy}
                    </span>
                  ) : null}
                  {version.revision > 1 ? (
                    <span className="order-profile-proforma-archive__rev">
                      بازنگری {version.revision.toLocaleString('fa-IR')}
                    </span>
                  ) : (
                    <span className="order-profile-proforma-archive__rev">نسخه اولیه</span>
                  )}
                </div>
                <div className="order-profile-proforma-archive__actions">
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => openProformaVersionPreview(version, order.id)}
                  >
                    پیش‌نمایش
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => printProformaVersion(version, order.id)}
                  >
                    چاپ
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => onSendProformaVersion?.(version)}
                  >
                    ارسال برای مشتری
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="order-profile-card order-profile-timeline">
        <h3 className="order-profile-proforma-archive__title">تایم‌لاین فعالیت‌ها</h3>
        {entries.length === 0 ? (
          <p className="order-profile-timeline__empty">سابقه‌ای ثبت نشده است.</p>
        ) : (
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
                  <time className="order-profile-timeline__at font-yekan">{entry.at}</time>
                  <p className="order-profile-timeline__text">{entry.text}</p>
                  {entry.by && (
                    <p className="order-profile-timeline__by">توسط {entry.by}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
