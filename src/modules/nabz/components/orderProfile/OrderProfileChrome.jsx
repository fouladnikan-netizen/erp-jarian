import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toDisplayOrderCode } from '../../orderCode';
import { getOrderDisplayStatus, getOrderDisplayStatusKind } from '../../orderStageService';
import { canEditWholeOrder } from '../../orderEditPermissions';
import {
  getOrderProfileBreadcrumb,
  getOrderProfileNextAction,
  shouldShowIssueProforma,
} from '../../orderProfileService';
import { getProformaTerms } from '../../proformaService';
import { printProforma } from '../../proformaPrint';
import {
  ORDER_PROFILE_TAB_META,
  getOrderProfileTabOrder,
  ORDER_PROFILE_TABS,
} from '../../orderProfileConfig';
import GatewayHorizontalStepper from './gateway/GatewayHorizontalStepper';
import OrderProfileCancelDialog from './OrderProfileCancelDialog';
import { ORDER_TABS } from '../../config';

function BackArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function ActivityBellIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function EditOrderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function CancelOrderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  );
}

export default function OrderProfileChrome({
  order,
  activeTab,
  onTabChange,
  orderPhase,
  operationalPhase,
  operationalViewPhase,
  viewPhase,
  viewMode,
  onPhaseChange,
  onOperationalPhaseChange,
  onCancelOrder,
  onEditOrder,
  onNextAction,
  onOpenActivityModal,
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const breadcrumb = getOrderProfileBreadcrumb(order);
  const statusKind = getOrderDisplayStatusKind(order);
  const statusLabel = getOrderDisplayStatus(order);
  const nextAction = getOrderProfileNextAction(order);
  const showIssueProforma = shouldShowIssueProforma(order);
  const profileTabs = getOrderProfileTabOrder();
  const expertName = order.requesterName || '—';
  const knightName = order.assignee || '—';
  const displayCode = toDisplayOrderCode(order.code);
  const registeredAt = [order.registeredDate, order.registeredTime].filter(Boolean).join(' · ');
  const canEdit = canEditWholeOrder();
  const canCancel = order.status !== ORDER_TABS.FAILED;

  return (
    <div className="order-profile-chrome">
      <div className="order-profile-smart-header">
        <div className="order-profile-smart-header__main">
          <h1 className="order-profile-smart-header__title font-meem">
            پروفایل سفارش شرکت
            {' '}
            {order.customer}
          </h1>

          <p className="order-profile-smart-header__expert font-meem">
            <span className="order-profile-smart-header__expert-label">کارشناس مرتبط:</span>
            {' '}
            <span className="order-profile-smart-header__expert-name">{expertName}</span>
          </p>

          <p className="order-profile-smart-header__expert font-meem">
            <span className="order-profile-smart-header__expert-label">شوالیه:</span>
            {' '}
            <span className="order-profile-smart-header__expert-name">{knightName}</span>
          </p>

          <div className="order-profile-smart-header__meta">
            <span className="order-profile-smart-header__code font-yekan" title={displayCode}>
              {displayCode}
            </span>
            <span className={`order-profile-smart-badge order-profile-smart-badge--${statusKind}`}>
              {statusLabel}
            </span>
          </div>

          {registeredAt && (
            <p className="order-profile-smart-header__datetime font-meem">
              <span className="order-profile-smart-header__datetime-label">تاریخ و زمان ثبت:</span>
              {' '}
              <span className="order-profile-smart-header__datetime-value font-yekan">{registeredAt}</span>
            </p>
          )}
        </div>

        <div className="order-profile-smart-header__side">
          <nav className="order-profile-breadcrumb" aria-label="مسیر ناوبری">
            {breadcrumb.map((crumb) => (
              <Link
                key={crumb.label}
                to={crumb.to || '/nabz'}
                className={`order-profile-breadcrumb__link${crumb.isBack ? ' order-profile-breadcrumb__link--back' : ''}`}
              >
                {crumb.isBack && <BackArrowIcon />}
                {crumb.label}
              </Link>
            ))}
          </nav>

          <div className="order-profile-smart-header__actions">
            <button
              type="button"
              className="btn btn--outline order-profile-activity-btn"
              onClick={() => onOpenActivityModal?.()}
            >
              <ActivityBellIcon />
              + فعالیت جدید
            </button>
            {canEdit && (
              <button
                type="button"
                className="btn btn--outline order-profile-activity-btn"
                onClick={() => onEditOrder?.()}
              >
                <EditOrderIcon />
                ویرایش سفارش
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                className="btn btn--outline order-profile-activity-btn"
                onClick={() => setConfirmCancel(true)}
              >
                <CancelOrderIcon />
                لغو سفارش
              </button>
            )}
            {nextAction && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => onNextAction?.(nextAction.id)}
              >
                {nextAction.label}
              </button>
            )}
            {showIssueProforma && (
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => printProforma(order, getProformaTerms(order))}
              >
                صدور پیش‌فاکتور
              </button>
            )}
          </div>
        </div>
      </div>

      <OrderProfileCancelDialog
        open={confirmCancel}
        onConfirm={(reason) => {
          setConfirmCancel(false);
          onCancelOrder?.(reason);
        }}
        onCancel={() => setConfirmCancel(false)}
      />

      <div className="order-profile-chrome__tabs" role="tablist" aria-label="بخش‌های پروفایل سفارش">
        {profileTabs.map((tabId) => (
          <button
            key={tabId}
            type="button"
            role="tab"
            id={`order-profile-tab-${tabId}`}
            aria-selected={activeTab === tabId}
            aria-controls={`order-profile-panel-${tabId}`}
            className={`order-profile-chrome__tab${activeTab === tabId ? ' order-profile-chrome__tab--active' : ''}`}
            onClick={() => onTabChange(tabId)}
          >
            {ORDER_PROFILE_TAB_META[tabId].label}
          </button>
        ))}
      </div>

      {activeTab === ORDER_PROFILE_TABS.GATEWAY && (
        <div className="order-profile-stepper-band">
          <GatewayHorizontalStepper
            order={order}
            orderPhase={orderPhase}
            viewPhase={viewPhase}
            viewMode={viewMode}
            operationalPhase={operationalPhase}
            operationalViewPhase={operationalViewPhase}
            onPhaseChange={onPhaseChange}
            onOperationalPhaseChange={onOperationalPhaseChange}
          />
        </div>
      )}
    </div>
  );
}
