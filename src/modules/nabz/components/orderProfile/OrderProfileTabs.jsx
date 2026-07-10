import { useState } from 'react';
import {
  ORDER_PROFILE_TAB_META,
  ORDER_PROFILE_TAB_ORDER,
  ORDER_PROFILE_TABS,
} from '../../orderProfileConfig';
import OrderProfileItemsTab from './OrderProfileItemsTab';
import OrderProfileCommentsTab from './OrderProfileCommentsTab';
import OrderProfileTimelineTab from './OrderProfileTimelineTab';
import OrderProfileAttachmentsTab from './OrderProfileAttachmentsTab';

export default function OrderProfileTabs({
  order,
  onAddComment,
  onUploadAttachment,
}) {
  const [activeTab, setActiveTab] = useState(ORDER_PROFILE_TABS.GATEWAY);

  return (
    <div className="order-profile-tabs">
      <div className="order-profile-tabs__sticky">
        <div className="order-profile-tabs__nav" role="tablist" aria-label="بخش‌های پروفایل سفارش">
        {ORDER_PROFILE_TAB_ORDER.map((tabId) => (
          <button
            key={tabId}
            type="button"
            role="tab"
            id={`order-profile-tab-${tabId}`}
            aria-selected={activeTab === tabId}
            aria-controls={`order-profile-panel-${tabId}`}
            className={`order-profile-tabs__btn${activeTab === tabId ? ' order-profile-tabs__btn--active' : ''}`}
            onClick={() => setActiveTab(tabId)}
          >
            {ORDER_PROFILE_TAB_META[tabId].label}
          </button>
        ))}
        </div>
      </div>

      <div className="order-profile-tabs__panels">
        {activeTab === ORDER_PROFILE_TABS.GATEWAY && (
          <div
            role="tabpanel"
            id="order-profile-panel-gateway"
            aria-labelledby="order-profile-tab-gateway"
          >
            <OrderProfileItemsTab order={order} />
          </div>
        )}
        {activeTab === ORDER_PROFILE_TABS.COMMENTS && (
          <div
            role="tabpanel"
            id="order-profile-panel-comments"
            aria-labelledby="order-profile-tab-comments"
          >
            <OrderProfileCommentsTab order={order} onAddComment={onAddComment} />
          </div>
        )}
        {activeTab === ORDER_PROFILE_TABS.TIMELINE && (
          <div
            role="tabpanel"
            id="order-profile-panel-timeline"
            aria-labelledby="order-profile-tab-timeline"
          >
            <OrderProfileTimelineTab order={order} />
          </div>
        )}
        {activeTab === ORDER_PROFILE_TABS.ATTACHMENTS && (
          <div
            role="tabpanel"
            id="order-profile-panel-attachments"
            aria-labelledby="order-profile-tab-attachments"
          >
            <OrderProfileAttachmentsTab order={order} onUpload={onUploadAttachment} />
          </div>
        )}
      </div>
    </div>
  );
}
