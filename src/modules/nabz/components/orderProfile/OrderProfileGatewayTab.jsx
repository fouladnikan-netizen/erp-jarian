import { useMemo, useState } from 'react';
import { calculateQuotingPreview } from '../../inquiryService';
import { DEFAULT_SALE_TYPE } from '../../constants';
import { GATEWAY_PHASES } from '../../gatewayConfig';
import { sendProformaToCustomer } from '../../gatewayLifecycleService';
import {
  shouldShowGatewayFinancialSummary,
  removeGatewayOrderItem,
  removeGatewayInquiry,
  updateGatewayOrderItemWithSensitivity,
} from '../../gatewayService';
import { saveItemMargin, updateOrderQuoting } from '../../quotingService';
import { updateInquiryOnOrder } from '../../inquiryService';
import {
  hasGatewayDecision,
  markGatewayDecisionFailed,
  markGatewayDecisionSuccess,
} from '../../gatewayDecisionService';
import GatewayMorphTable from './gateway/GatewayMorphTable';
import GatewayFinancialSummary from './gateway/GatewayFinancialSummary';
import GatewayPishkeshPanel from './gateway/GatewayPishkeshPanel';
import OrderActionDrawer from './OrderActionDrawer';
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
  onUpdateInquiry,
  onUpdateOrder,
  onAdvancePhase,
  onOperationalPhaseChange,
  onDecisionSuccess,
  onDecisionFailed,
  onReturnToGateway,
}) {
  const [actionDrawerOpen, setActionDrawerOpen] = useState(false);
  const preview = useMemo(() => calculateQuotingPreview(order), [order]);
  const saleType = preview.saleType || order.saleType || DEFAULT_SALE_TYPE;

  const handleAddInquiry = (itemIndex, draft) => {
    onAddInquiry?.(order.id, itemIndex, draft);
  };

  const handleUpdateInquiry = (itemIndex, inquiryId, draft) => {
    if (onUpdateInquiry) {
      onUpdateInquiry(order.id, itemIndex, inquiryId, draft);
      return;
    }
    onUpdateOrder?.((current) => updateInquiryOnOrder(current, itemIndex, inquiryId, draft));
  };

  const handleSetTarget = (itemIndex, inquiryId) => {
    onSetTargetInquiry?.(order.id, itemIndex, inquiryId);
  };

  const handleSaveMargin = (itemIndex, marginValue, marginType) => {
    onUpdateOrder?.((current) => saveItemMargin(current, itemIndex, marginValue, marginType));
  };

  const handleUpdateQuoting = (patch) => {
    onUpdateOrder?.((current) => updateOrderQuoting(current, patch));
  };

  const handleSendProforma = () => {
    onUpdateOrder?.((current) => sendProformaToCustomer(current));
    window.alert(`پیش‌فاکتور سفارش برای ${order.customer} ارسال شد.`);
  };

  const handleEditItem = (itemIndex, patch, { wipeConfirmed = false } = {}) => {
    onUpdateOrder?.((current) => updateGatewayOrderItemWithSensitivity(
      current,
      itemIndex,
      patch,
      { wipeConfirmed },
    ));
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

  const showActionStrip = viewPhase === GATEWAY_PHASES.PISHKESH && viewMode === 'gateway';
  const decided = hasGatewayDecision(order);
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
    <div
      className={`order-profile-gateway${showActionStrip ? ' order-profile-gateway--with-action-strip' : ''}`}
      data-gateway-stage={currentStage}
    >
      <GatewayMorphTable
        order={order}
        viewPhase={viewPhase}
        orderPhase={orderPhase}
        onAddInquiry={handleAddInquiry}
        onSetTargetInquiry={handleSetTarget}
        onUpdateInquiry={handleUpdateInquiry}
        onDeleteInquiry={handleDeleteInquiry}
        onSaveMargin={handleSaveMargin}
        onUpdateQuoting={handleUpdateQuoting}
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
        onSendToCustomer={handleSendProforma}
      />

      {showActionStrip && (
        <div className="order-profile-action-strip">
          <button
            type="button"
            className="order-profile-action-strip__btn font-meem"
            onClick={() => setActionDrawerOpen(true)}
          >
            {decided ? 'مشاهده نتیجه تعیین تکلیف' : 'تعیین تکلیف'}
          </button>
        </div>
      )}

      <OrderActionDrawer
        open={actionDrawerOpen}
        order={order}
        viewPhase={viewPhase}
        orderPhase={orderPhase}
        onClose={() => setActionDrawerOpen(false)}
        onSubmitSuccess={handleDecisionSuccess}
        onSubmitFailed={handleDecisionFailed}
      />
    </div>
  );
}
