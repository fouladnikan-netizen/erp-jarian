import { useState } from 'react';
import { formatOrderAmount, formatRegisteredAt } from '../orderCode';
import { UNPRICED_LABEL } from '../constants';
import { buildStatusHistory } from '../orderHistory';
import { getCustomerPreview } from '../customers';
import { countOrderLineItems } from '../inquiryService';
import { getOrderDisplayStatus, getOrderDisplayStatusKind } from '../orderStageService';
import {
  ORDER_DETAIL_TABS,
  ORDER_DETAIL_TAB_META,
} from '../inquiryConfig';
import OrderInquiriesNestedTable from './OrderInquiriesNestedTable';
import OrderEventsLog from './OrderEventsLog';
import OrderStageSelect from './OrderStageSelect';

function ProfileRow({ label, value }) {
  return (
    <div className="nabz-profile-panel__row">
      <span className="nabz-profile-panel__label">{label}</span>
      <span className="nabz-profile-panel__value">{value ?? '—'}</span>
    </div>
  );
}

const TAB_ORDER = [
  ORDER_DETAIL_TABS.OVERVIEW,
  ORDER_DETAIL_TABS.INQUIRIES,
  ORDER_DETAIL_TABS.EVENTS,
];

export default function OrderDetailContent({
  order,
  onCustomerClick,
  onAddInquiry,
  onStageChange,
  allowInquiryEdit = false,
}) {
  const [activeTab, setActiveTab] = useState(ORDER_DETAIL_TABS.OVERVIEW);
  const history = buildStatusHistory(order);
  const customer = getCustomerPreview(order.customerId);
  const lineItemCount = countOrderLineItems(order);

  return (
    <>
      <div className="nabz-order-tabs" role="tablist" aria-label="بخش‌های سفارش">
        {TAB_ORDER.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`nabz-order-tabs__btn${activeTab === tab ? ' is-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {ORDER_DETAIL_TAB_META[tab].label}
          </button>
        ))}
      </div>

      {activeTab === ORDER_DETAIL_TABS.OVERVIEW && (
        <div className="nabz-profile-panel">
          <ProfileRow label="تاریخ و زمان ثبت" value={formatRegisteredAt(order)} />
          <ProfileRow label="شوالیه ثبت‌کننده" value={order.assignee} />
          <ProfileRow
            label="وضعیت واقعی"
            value={(
              <span className={`nabz-order-status nabz-order-status--${getOrderDisplayStatusKind(order)}`}>
                {getOrderDisplayStatus(order)}
              </span>
            )}
          />
          {onStageChange && (
            <div className="nabz-profile-panel__section nabz-profile-panel__section--compact">
              <OrderStageSelect order={order} onChange={(stageId) => onStageChange(order.id, stageId)} />
            </div>
          )}
          <ProfileRow label="تعداد آیتم‌ها (سطر)" value={lineItemCount.toLocaleString('fa-IR')} />
          <ProfileRow label="مبلغ کل" value={formatOrderAmount(order) || UNPRICED_LABEL} />
          {order.failReason && (
            <ProfileRow label="علت توقف" value={order.failReason} />
          )}

          {(order.items || []).length > 0 && (
            <div className="nabz-profile-panel__section">
              <h3>اقلام سفارش</h3>
              <table className="nabz-profile-items-table">
                <thead>
                  <tr>
                    <th>ردیف</th>
                    <th>شرح کالا</th>
                    <th>مقدار</th>
                    <th>واحد</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td>{(i + 1).toLocaleString('fa-IR')}</td>
                      <td>{item.name}</td>
                      <td>{item.qty?.toLocaleString('fa-IR') ?? '—'}</td>
                      <td>{item.unit || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {customer && (
            <div className="nabz-profile-panel__section nabz-profile-panel__section--muted">
              <h3>خلاصه مشتری</h3>
              <ProfileRow label="استان" value={customer.province} />
              <ProfileRow label="حوزه فعالیت" value={customer.activityDomain} />
              <ProfileRow label="وضعیت رفتاری" value={customer.behavioralLabel} />
              {onCustomerClick && (
                <button
                  type="button"
                  className="btn btn--ghost nabz-profile-panel__more-btn"
                  onClick={() => onCustomerClick(order.customerId)}
                >
                  مشاهده جزئیات مشتری
                </button>
              )}
            </div>
          )}

          <div className="nabz-profile-panel__section">
            <h3>تاریخچه تغییرات وضعیت</h3>
            <ol className="nabz-status-timeline">
              {history.map((entry) => (
                <li
                  key={entry.stageId}
                  className={`nabz-status-timeline__item${entry.isCurrent ? ' is-current' : ''}`}
                >
                  <span className="nabz-status-timeline__dot" aria-hidden="true" />
                  <div className="nabz-status-timeline__content">
                    <span className="nabz-status-timeline__stage">{entry.stageLabel}</span>
                    <span className="nabz-status-timeline__at">{entry.at}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {activeTab === ORDER_DETAIL_TABS.INQUIRIES && (
        <OrderInquiriesNestedTable
          order={order}
          onAddInquiry={onAddInquiry}
          editable={allowInquiryEdit}
        />
      )}

      {activeTab === ORDER_DETAIL_TABS.EVENTS && (
        <OrderEventsLog events={order.events} />
      )}
    </>
  );
}
