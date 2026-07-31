import { formatPriceLine } from '../../quickInquiryParts';

export default function GatewayFinancialSummary({ preview }) {
  const showVat = Boolean(preview?.showVatBreakdown);

  return (
    <footer className="gateway-summary">
      <div className="gateway-summary__stack">
        <div className="gateway-summary__billing">
          <div className="gateway-summary__row">
            <span>جمع سفارش</span>
            <strong className="nabz-price-line">{formatPriceLine(preview.subtotal)}</strong>
          </div>
          {showVat && (
            <div className="gateway-summary__row">
              <span>مالیات ارزش افزوده</span>
              <strong className="nabz-price-line">{formatPriceLine(preview.vatAmount)}</strong>
            </div>
          )}
          <div className="gateway-summary__row gateway-summary__row--grand">
            <span>جمع کل سفارش</span>
            <strong className="nabz-price-line">{formatPriceLine(preview.orderTotal)}</strong>
          </div>
        </div>
        <div className="gateway-summary__profit">
          <span>جمع کل سود سفارش</span>
          <strong className="nabz-price-line">{formatPriceLine(preview.totalProfit)}</strong>
        </div>
      </div>
    </footer>
  );
}
