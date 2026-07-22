import { useEffect, useRef, useState } from 'react';
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

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" />
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const detailsRef = useRef(null);
  const moreRef = useRef(null);

  const breadcrumb = getOrderProfileBreadcrumb(order);
  const backCrumb = breadcrumb.find((crumb) => crumb.isBack) || breadcrumb[0];
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
  const hasOverflowItems = canEdit || canCancel;

  useEffect(() => {
    if (!detailsOpen && !moreOpen) return undefined;

    const handlePointerDown = (event) => {
      if (detailsOpen && detailsRef.current && !detailsRef.current.contains(event.target)) {
        setDetailsOpen(false);
      }
      if (moreOpen && moreRef.current && !moreRef.current.contains(event.target)) {
        setMoreOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDetailsOpen(false);
        setMoreOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [detailsOpen, moreOpen]);

  return (
    <div className="order-profile-chrome">
      <div className="order-profile-slim-header">
        <div className="order-profile-slim-header__identity">
          {backCrumb && (
            <Link
              to={backCrumb.to || '/nabz'}
              className="order-profile-slim-header__back"
              aria-label={backCrumb.label}
              title={backCrumb.label}
            >
              <BackArrowIcon />
            </Link>
          )}

          <h1 className="order-profile-slim-header__customer font-meem" title={order.customer}>
            {order.customer}
          </h1>

          <span className="order-profile-slim-header__code font-yekan" title={displayCode}>
            {displayCode}
          </span>

          <span className={`order-profile-smart-badge order-profile-smart-badge--${statusKind}`}>
            {statusLabel}
          </span>

          <div className="order-profile-slim-header__details" ref={detailsRef}>
            <button
              type="button"
              className={`order-profile-slim-header__icon-btn${detailsOpen ? ' is-active' : ''}`}
              aria-label="جزئیات سفارش"
              aria-expanded={detailsOpen}
              onClick={() => {
                setDetailsOpen((prev) => !prev);
                setMoreOpen(false);
              }}
            >
              <InfoIcon />
            </button>
            {detailsOpen && (
              <div className="order-profile-slim-details" role="dialog" aria-label="جزئیات سفارش">
                <div className="order-profile-slim-details__row font-meem">
                  <span className="order-profile-slim-details__label">کارشناس مرتبط</span>
                  <strong className="order-profile-slim-details__value">{expertName}</strong>
                </div>
                <div className="order-profile-slim-details__row font-meem">
                  <span className="order-profile-slim-details__label">شوالیه</span>
                  <strong className="order-profile-slim-details__value">{knightName}</strong>
                </div>
                {registeredAt && (
                  <div className="order-profile-slim-details__row font-meem">
                    <span className="order-profile-slim-details__label">تاریخ و زمان ثبت</span>
                    <strong className="order-profile-slim-details__value font-yekan">{registeredAt}</strong>
                  </div>
                )}
                {order.generalNotes ? (
                  <div className="order-profile-slim-details__notes font-meem">
                    <span className="order-profile-slim-details__label">توضیحات</span>
                    <p>{order.generalNotes}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="order-profile-slim-header__actions">
          <button
            type="button"
            className="btn btn--outline order-profile-activity-btn"
            onClick={() => onOpenActivityModal?.()}
          >
            <ActivityBellIcon />
            فعالیت
          </button>

          {nextAction && (
            <button
              type="button"
              className="btn btn--primary order-profile-activity-btn"
              onClick={() => onNextAction?.(nextAction.id)}
            >
              {nextAction.label}
            </button>
          )}

          {showIssueProforma && (
            <button
              type="button"
              className="btn btn--outline order-profile-activity-btn"
              onClick={() => printProforma(order, getProformaTerms(order))}
            >
              صدور پیش‌فاکتور
            </button>
          )}

          {hasOverflowItems && (
            <div className="order-profile-slim-more" ref={moreRef}>
              <button
                type="button"
                className="order-profile-slim-header__icon-btn order-profile-slim-header__more-btn"
                aria-label="اقدامات بیشتر"
                aria-expanded={moreOpen}
                onClick={() => {
                  setMoreOpen((prev) => !prev);
                  setDetailsOpen(false);
                }}
              >
                ⋯
              </button>
              {moreOpen && (
                <div className="order-profile-slim-more__menu" role="menu">
                  {canEdit && (
                    <button
                      type="button"
                      className="order-profile-slim-more__item"
                      role="menuitem"
                      onClick={() => {
                        setMoreOpen(false);
                        onEditOrder?.();
                      }}
                    >
                      ویرایش سفارش
                    </button>
                  )}
                  {canCancel && (
                    <button
                      type="button"
                      className="order-profile-slim-more__item order-profile-slim-more__item--danger"
                      role="menuitem"
                      onClick={() => {
                        setMoreOpen(false);
                        setConfirmCancel(true);
                      }}
                    >
                      لغو سفارش
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
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
