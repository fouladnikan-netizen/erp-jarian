import { useMemo } from 'react';
import { calculateQuotingPreview, updateInquiryOnOrder } from '../../inquiryService';
import { DEFAULT_SALE_TYPE } from '../../constants';
import { GATEWAY_PHASES } from '../../gatewayConfig';
import {
  shouldShowGatewayFinancialSummary,
  removeGatewayOrderItem,
  removeGatewayInquiry,
  updateGatewayOrderItemWithSensitivity,
} from '../../gatewayService';
import { saveItemMargin, updateOrderQuoting } from '../../quotingService';
import GatewayMorphTable from './gateway/GatewayMorphTable';
import GatewayFinancialSummary from './gateway/GatewayFinancialSummary';
import GatewayPishkeshPanel from './gateway/GatewayPishkeshPanel';
import OrderProfileOperationsTab from './OrderProfileOperationsTab';
import { useJarianNotice } from '../../../../context/JarianNoticeContext';

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
  onOperationalPhaseChange,
  onReturnToGateway,
}) {
  const { confirm } = useJarianNotice();
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

  const handleEditItem = (itemIndex, patch, { wipeConfirmed = false } = {}) => {
    onUpdateOrder?.((current) => updateGatewayOrderItemWithSensitivity(
      current,
      itemIndex,
      patch,
      { wipeConfirmed },
    ));
  };

  const handleDeleteItem = async (itemIndex) => {
    const ok = await confirm({
      title: 'حذف',
      message: 'این قلم از سفارش حذف شود؟',
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!ok) return;
    onUpdateOrder?.((current) => removeGatewayOrderItem(current, itemIndex));
  };

  const handleDeleteInquiry = async (itemIndex, inquiryId) => {
    const ok = await confirm({
      title: 'حذف',
      message: 'این استعلام حذف شود؟',
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!ok) return;
    onUpdateOrder?.((current) => removeGatewayInquiry(current, itemIndex, inquiryId));
  };

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
        viewPhase={viewPhase}
        preview={preview}
        saleType={saleType}
      />
    </div>
  );
}
