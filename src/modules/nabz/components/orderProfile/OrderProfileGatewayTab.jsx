import { useMemo } from 'react';
import { calculateQuotingPreview } from '../../inquiryService';
import { DEFAULT_SALE_TYPE } from '../../constants';
import { GATEWAY_PHASES } from '../../gatewayConfig';
import {
  advanceGatewayPhase,
  sendProformaToCustomer,
} from '../../gatewayLifecycleService';
import {
  shouldShowGatewayFinancialSummary,
  removeGatewayOrderItem,
  removeGatewayInquiry,
  updateGatewayOrderItem,
} from '../../gatewayService';
import { saveItemMargin } from '../../quotingService';
import {
  markGatewayDecisionFailed,
  markGatewayDecisionSuccess,
} from '../../gatewayDecisionService';
import GatewayMorphTable from './gateway/GatewayMorphTable';
import GatewayFinancialSummary from './gateway/GatewayFinancialSummary';
import GatewayDecisionPanel from './gateway/GatewayDecisionPanel';
import GatewayStageActions from './gateway/GatewayStageActions';
import GatewayPishkeshPanel from './gateway/GatewayPishkeshPanel';
import OrderProfileOperationsTab from './OrderProfileOperationsTab';

export default function OrderProfileGatewayTab({
  order,
  viewPhase,
  viewMode,
  orderPhase,
  currentStage,
  operationalViewPhase,
  onAddInquiry,
  onSetTargetInquiry,
  onUpdateOrder,
  onAdvancePhase,
  onOperationalPhaseChange,
  onDecisionSuccess,
  onDecisionFailed,
  onReturnToGateway,
}) {
  const preview = useMemo(() => calculateQuotingPreview(order), [order]);
  const saleType = preview.saleType || order.saleType || DEFAULT_SALE_TYPE;

  const handleAddInquiry = (itemIndex, draft) => {
    onAddInquiry?.(order.id, itemIndex, draft);
  };

  const handleSetTarget = (itemIndex, inquiryId) => {
    onSetTargetInquiry?.(order.id, itemIndex, inquiryId);
  };

  const handleSaveMargin = (itemIndex, marginValue, marginType) => {
    onUpdateOrder?.((current) => saveItemMargin(current, itemIndex, marginValue, marginType));
  };

  const handleAdvance = (phase) => {
    const result = advanceGatewayPhase(order, phase);
    if (!result.accepted) {
      window.alert(result.error || 'امکان پیشروی به مرحله بعد وجود ندارد.');
      return;
    }
    onAdvancePhase?.(result.order);
  };

  const handleSendProforma = () => {
    onUpdateOrder?.((current) => sendProformaToCustomer(current));
    window.alert(`پیش‌فاکتور سفارش برای ${order.customer} ارسال شد.`);
  };

  const handleEditItem = (itemIndex, patch) => {
    onUpdateOrder?.((current) => updateGatewayOrderItem(current, itemIndex, patch));
  };

  const handleDeleteItem = (itemIndex) => {
    if (!window.confirm('این قلم از سفارش حذف شود؟')) return;
    onUpdateOrder?.((current) => removeGatewayOrderItem(current, itemIndex));
  };

  const handleDeleteInquiry = (itemIndex, inquiryId) => {
    if (!window.confirm('این استعلام حذف شود؟')) return;
    onUpdateOrder?.((current) => removeGatewayInquiry(current, itemIndex, inquiryId));
  };

  const handleDecisionSuccess = (payload) => {
    if (onDecisionSuccess) {
      onDecisionSuccess(payload);
      return;
    }
    onUpdateOrder?.((current) => markGatewayDecisionSuccess(current, payload));
  };

  const handleDecisionFailed = (payload) => {
    if (onDecisionFailed) {
      onDecisionFailed(payload);
      return;
    }
    onUpdateOrder?.((current) => markGatewayDecisionFailed(current, payload));
  };

  const showDecisionPanel = viewPhase === GATEWAY_PHASES.PISHKESH && viewMode === 'gateway';
  const showMozeneSummary = viewMode === 'gateway'
    && viewPhase === GATEWAY_PHASES.MOZENE
    && shouldShowGatewayFinancialSummary(viewPhase);

  if (viewMode === 'operations') {
    return (
      <div className="order-profile-gateway order-profile-gateway--operations" data-gateway-stage={currentStage}>
        <OrderProfileOperationsTab
          order={order}
          operationalViewPhase={operationalViewPhase}
          onUpdateOrder={onUpdateOrder}
          onOperationalPhaseChange={onOperationalPhaseChange}
          onReturnToGateway={() => onReturnToGateway?.(GATEWAY_PHASES.PISHKESH)}
        />
      </div>
    );
  }

  return (
    <div className="order-profile-gateway" data-gateway-stage={currentStage}>
      {showDecisionPanel && (
        <GatewayDecisionPanel
          order={order}
          viewPhase={viewPhase}
          orderPhase={orderPhase}
          onSubmitSuccess={handleDecisionSuccess}
          onSubmitFailed={handleDecisionFailed}
        />
      )}

      <GatewayMorphTable
        order={order}
        viewPhase={viewPhase}
        orderPhase={orderPhase}
        onAddInquiry={handleAddInquiry}
        onSetTargetInquiry={handleSetTarget}
        onDeleteInquiry={handleDeleteInquiry}
        onSaveMargin={handleSaveMargin}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
      />

      {showMozeneSummary && (
        <GatewayFinancialSummary preview={preview} saleType={saleType} />
      )}

      <GatewayPishkeshPanel
        order={order}
        viewPhase={viewPhase}
        orderPhase={orderPhase}
        preview={preview}
        saleType={saleType}
        onAdvance={handleAdvance}
        onSendToCustomer={handleSendProforma}
      />

      <GatewayStageActions
        order={order}
        viewPhase={viewPhase}
        orderPhase={orderPhase}
        onAdvance={handleAdvance}
      />
    </div>
  );
}
