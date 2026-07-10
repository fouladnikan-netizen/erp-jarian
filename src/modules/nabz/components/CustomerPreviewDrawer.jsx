import { getCustomerPreview } from '../customers';

function PreviewRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="nabz-customer-preview__row">
      <span className="nabz-customer-preview__label">{label}</span>
      <span className="nabz-customer-preview__value">{value}</span>
    </div>
  );
}

export default function CustomerPreviewDrawer({ customerId, stacked, onClose }) {
  const customer = getCustomerPreview(customerId);
  if (!customer) return null;

  return (
    <div
      className={`nabz-drawer-overlay nabz-drawer-overlay--secondary${stacked ? ' is-stacked' : ''}`}
      onClick={onClose}
      role="presentation"
    >
      <aside
        className={`nabz-drawer nabz-drawer--customer${stacked ? ' is-stacked' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`پروفایل مشتری ${customer.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="nabz-drawer__header">
          <div>
            <p className="nabz-drawer__eyebrow">مشتری</p>
            <h2 className="nabz-drawer__title nabz-drawer__title--name">{customer.name}</h2>
            {customer.behavioralLabel && (
              <p className="nabz-drawer__subtitle">{customer.behavioralLabel}</p>
            )}
          </div>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="nabz-drawer__body">
          <div className="nabz-customer-preview">
            <PreviewRow label="استان" value={customer.province} />
            <PreviewRow label="حوزه فعالیت" value={customer.activityDomain} />
            <PreviewRow
              label="شوالیه"
              value={customer.assignee ? `${customer.assignee} · ${customer.assigneeRole || ''}`.trim() : null}
            />
            <PreviewRow label="تلفن" value={customer.phone} />
            <PreviewRow label="آدرس" value={customer.address} />
            <PreviewRow label="ارزش تعامل" value={customer.interactionValue} />
            <PreviewRow
              label="سفارشات باز"
              value={customer.openOrders != null ? customer.openOrders.toLocaleString('fa-IR') : null}
            />

            {customer.relatedPersons.length > 0 && (
              <div className="nabz-customer-preview__section">
                <h3>افراد مرتبط</h3>
                <ul className="nabz-customer-preview__list">
                  {customer.relatedPersons.map((person, i) => (
                    <li key={i}>
                      <span className="nabz-customer-preview__person-name">{person.name}</span>
                      <span className="nabz-customer-preview__person-meta">
                        {person.role}
                        {person.mobile ? ` · ${person.mobile}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {customer.latestInteraction && (
              <div className="nabz-customer-preview__section">
                <h3>آخرین تعامل</h3>
                <p className="nabz-customer-preview__interaction">
                  {customer.latestInteraction.date}
                  {' · '}
                  {customer.latestInteraction.type}
                </p>
                <p className="nabz-customer-preview__interaction-summary">
                  {customer.latestInteraction.summary}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
