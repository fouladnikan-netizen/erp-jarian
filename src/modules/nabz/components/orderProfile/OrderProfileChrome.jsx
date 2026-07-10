import { Link } from 'react-router-dom';
import { toDisplayOrderCode } from '../../orderCode';
import { getOrderDisplayStatus, getOrderDisplayStatusKind } from '../../orderStageService';
import {
  getOrderProfileBreadcrumb,
  getOrderProfileNextAction,
  shouldShowPrintProforma,
} from '../../orderProfileService';
import { getProformaTerms } from '../../proformaService';
import { printProforma } from '../../proformaPrint';
import {
  ORDER_PROFILE_TAB_META,
  getOrderProfileTabOrder,
  ORDER_PROFILE_TABS,
} from '../../orderProfileConfig';
import GatewayHorizontalStepper from './gateway/GatewayHorizontalStepper';
import OrderProfileMoreMenu from './OrderProfileMoreMenu';

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
  const breadcrumb = getOrderProfileBreadcrumb(order);
  const statusKind = getOrderDisplayStatusKind(order);
  const statusLabel = getOrderDisplayStatus(order);
  const nextAction = getOrderProfileNextAction(order);
  const showPrint = shouldShowPrintProforma(order);
  const profileTabs = getOrderProfileTabOrder();

  return (
    <div className="order-profile-chrome">
      <nav className="order-profile-breadcrumb" aria-label="مسیر ناوبری">
        {breadcrumb.map((crumb, index) => {
          const isLast = index === breadcrumb.length - 1;
          if (isLast) {
            return (
              <span key={crumb.label} className="order-profile-breadcrumb__current" aria-current="page">
                {crumb.label}
              </span>
            );
          }
          return (
            <span key={crumb.label} className="order-profile-breadcrumb__segment">
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className={`order-profile-breadcrumb__link${crumb.isBack ? ' order-profile-breadcrumb__link--back' : ''}`}
                >
                  {crumb.isBack && <BackArrowIcon />}
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
              <span className="order-profile-breadcrumb__sep" aria-hidden="true">/</span>
            </span>
          );
        })}
      </nav>

      <div className="order-profile-smart-header">
        <div className="order-profile-smart-header__main">
          <h1 className="order-profile-smart-header__title">
            پروفایل سفارش شرکت
            {' '}
            {order.customer}
          </h1>
          <div className="order-profile-smart-header__meta">
            <span className="order-profile-smart-header__code">
              شماره سفارش:
              {' '}
              {toDisplayOrderCode(order.code)}
            </span>
            <span className={`order-profile-smart-badge order-profile-smart-badge--${statusKind}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="order-profile-smart-header__actions">
          <button
            type="button"
            className="btn btn--outline order-profile-activity-btn"
            onClick={() => onOpenActivityModal?.()}
          >
            <ActivityBellIcon />
            + فعالیت جدید
          </button>
          {nextAction && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => onNextAction?.(nextAction.id)}
            >
              {nextAction.label}
            </button>
          )}
          {showPrint && (
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => printProforma(order, getProformaTerms(order))}
            >
              چاپ پیش‌فاکتور
            </button>
          )}
          <OrderProfileMoreMenu onEdit={onEditOrder} onCancel={onCancelOrder} />
        </div>
      </div>

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
