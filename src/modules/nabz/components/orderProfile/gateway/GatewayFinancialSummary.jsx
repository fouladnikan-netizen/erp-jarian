import { DEFAULT_SALE_TYPE } from '../../../constants';
import { formatPriceLine } from '../../quickInquiryParts';

export default function GatewayFinancialSummary({ preview, saleType }) {
  const isOfficial = (saleType || DEFAULT_SALE_TYPE) === 'رسمی';

  return (
    <footer className="gateway-summary">
      <div className="gateway-summary__billing">
        <div className="gateway-summary__row">
          <span>جمع سفارش</span>
          <strong className="nabz-price-line">{formatPriceLine(preview.subtotal)}</strong>
        </div>
        {isOfficial && (
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
    </footer>
  );
}
