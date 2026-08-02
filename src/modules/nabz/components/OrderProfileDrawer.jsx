import { useMemo } from 'react';
import { ORDER_TABS } from '../config';
import { useNabzOrders } from '../NabzOrdersContext';
import { getGatewayCurrentStage, gatewayStageToPhase } from '../gatewayLifecycleService';
import {
  markGatewayDecisionFailed,
  markGatewayDecisionSuccess,
} from '../gatewayDecisionService';
import { useOrderPipelineView } from '../hooks/useOrderPipelineView';
import GatewayHorizontalStepper from './orderProfile/gateway/GatewayHorizontalStepper';
import OrderProfileGatewayTab from './orderProfile/OrderProfileGatewayTab';
import OrderDetailContent from './OrderDetailContent';

export default function OrderProfileDrawer({
  order,
  onClose,
  onCustomerClick,
  onAddInquiry,
  onSetTargetInquiry,
  onStageChange,
  onUpdateOrder,
}) {
  const { orders } = useNabzOrders();
  const liveOrder = useMemo(
    () => orders.find((o) => o.id === order.id) || order,
    [orders, order],
  );

  const pipeline = useOrderPipelineView(liveOrder);
  const currentStage = getGatewayCurrentStage(liveOrder);

  const updateOrder = (orderUpdater) => {
    onUpdateOrder?.((prev) => prev.map((item) => {
      if (item.id !== liveOrder.id) return item;
      const next = orderUpdater(item);
      pipeline.syncAfterOrderUpdate(next);
      return next;
    }));
  };

  const handleAdvancePhase = (nextOrder) => {
    updateOrder(() => nextOrder);
    pipeline.setViewPhase(gatewayStageToPhase(nextOrder.stageId));
    if (nextOrder.status === ORDER_TABS.SUCCESS) {
      pipeline.setViewMode('operations');
    }
  };

  const handleDecisionSuccess = (payload) => {
    updateOrder((current) => markGatewayDecisionSuccess(current, payload));
  };

  const handleDecisionFailed = (payload) => {
    updateOrder((current) => markGatewayDecisionFailed(current, payload));
  };

  return (
    <div className="nabz-drawer-overlay" onClick={onClose} role="presentation">
      <aside
        className="nabz-drawer nabz-drawer--order nabz-drawer--pipeline"
        role="dialog"
        aria-modal="true"
        aria-label={`پروفایل سفارش ${liveOrder.code}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="nabz-drawer__header">
          <div>
            <p className="nabz-drawer__eyebrow">نمای سریع سفارش</p>
            <h2 className="nabz-drawer__title">{liveOrder.code}</h2>
            {liveOrder.customerId ? (
              <button
                type="button"
                className="nabz-drawer__customer-btn"
                onClick={() => onCustomerClick?.(liveOrder.customerId)}
              >
                {liveOrder.customer}
              </button>
            ) : (
              <p className="nabz-drawer__subtitle">{liveOrder.customer}</p>
            )}
          </div>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="nabz-drawer__stepper-band">
          <GatewayHorizontalStepper
            order={liveOrder}
            orderPhase={pipeline.orderPhase}
            viewPhase={pipeline.viewPhase}
            viewMode={pipeline.viewMode}
            operationalPhase={pipeline.operationalPhase}
            operationalViewPhase={pipeline.operationalViewPhase}
            onPhaseChange={pipeline.handlePhaseChange}
            onOperationalPhaseChange={pipeline.handleOperationalPhaseChange}
          />
        </div>

        <div className="nabz-drawer__body nabz-drawer__body--pipeline">
          <OrderProfileGatewayTab
            order={liveOrder}
            viewPhase={pipeline.viewPhase}
            viewMode={pipeline.viewMode}
            orderPhase={pipeline.orderPhase}
            currentStage={currentStage}
            operationalViewPhase={pipeline.operationalViewPhase}
            onAddInquiry={onAddInquiry}
            onSetTargetInquiry={onSetTargetInquiry}
            onUpdateOrder={updateOrder}
            onAdvancePhase={handleAdvancePhase}
            onOperationalPhaseChange={pipeline.handleOperationalPhaseChange}
            onDecisionSuccess={handleDecisionSuccess}
            onDecisionFailed={handleDecisionFailed}
            onReturnToGateway={pipeline.handlePhaseChange}
          />

          <details className="nabz-drawer__details">
            <summary>جزئیات و سوابق</summary>
            <OrderDetailContent
              order={liveOrder}
              onCustomerClick={onCustomerClick}
              onAddInquiry={onAddInquiry}
              onStageChange={onStageChange}
              allowInquiryEdit={Boolean(onAddInquiry)}
            />
          </details>
        </div>
      </aside>
    </div>
  );
}
