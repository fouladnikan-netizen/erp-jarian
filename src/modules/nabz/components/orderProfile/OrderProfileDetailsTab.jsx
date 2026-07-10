import { useMemo } from 'react';
import {
  calculateQuotingPreview,
  getOrderQuoting,
} from '../../inquiryService';
import {
  shouldShowPishkeshTabs,
  shouldShowQuotingSection,
} from '../../orderStageService';
import { canViewSupplierIdentity, DEFAULT_SALE_TYPE } from '../../constants';
import OrderInquiriesNestedTable from '../OrderInquiriesNestedTable';
import QuotingReadOnlyPanel from '../QuotingReadOnlyPanel';

export default function OrderProfileDetailsTab({ order, onAddInquiry }) {
  const showQuotingPanel = shouldShowQuotingSection(order) || shouldShowPishkeshTabs(order);
  const quoting = getOrderQuoting(order);
  const preview = useMemo(() => calculateQuotingPreview(order), [order]);
  const saleType = preview.saleType || order.saleType || DEFAULT_SALE_TYPE;
  const showSupplier = canViewSupplierIdentity();

  return (
    <div className="order-profile-card order-profile-details">
      {showQuotingPanel ? (
        <QuotingReadOnlyPanel
          order={order}
          preview={preview}
          quoting={quoting}
          lineMarginMode={quoting.marginMode}
          showSupplier={showSupplier}
          saleType={saleType}
        />
      ) : (
        <OrderInquiriesNestedTable
          order={order}
          onAddInquiry={onAddInquiry}
          editable={Boolean(onAddInquiry)}
        />
      )}
    </div>
  );
}
