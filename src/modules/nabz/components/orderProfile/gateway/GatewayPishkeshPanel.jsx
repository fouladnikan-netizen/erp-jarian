import { DEFAULT_SALE_TYPE } from '../../../constants';
import { GATEWAY_PHASES } from '../../../gatewayConfig';
import { isGatewayActivePhase } from '../../../gatewayService';
import { formatAmountRialWords } from '../../../numberToPersianWords';
import { getProformaTerms } from '../../../proformaService';
import { openProformaPreview, printProforma } from '../../../proformaPrint';
import { formatPriceLine } from '../../quickInquiryParts';

export default function GatewayPishkeshPanel({
  order,
  viewPhase,
  orderPhase,
  preview,
  saleType,
  onSendToCustomer,
}) {
  const live = isGatewayActivePhase(orderPhase, viewPhase);
  const showPanel = viewPhase === GATEWAY_PHASES.PISHKESH;

  if (!showPanel) return null;

  const isOfficial = (saleType || DEFAULT_SALE_TYPE) === 'رسمی';

  const handlePrint = () => {
    printProforma(order, getProformaTerms(order));
  };

  const handlePreview = () => {
    openProformaPreview(order, getProformaTerms(order));
  };

  const handleSend = () => {
    onSendToCustomer?.();
  };

  return (
    <section className="gateway-pishkesh-panel">
      <div className="gateway-pishkesh-panel__totals">
        <h3 className="gateway-pishkesh-panel__title">محاسبات مالی پیش‌فاکتور</h3>
        <div className="gateway-pishkesh-panel__rows">
          <div className="gateway-pishkesh-panel__row">
            <span>جمع کل اقلام</span>
            <strong className="nabz-price-line">{formatPriceLine(preview.subtotal)}</strong>
          </div>
          {isOfficial && (
            <div className="gateway-pishkesh-panel__row">
              <span>مالیات بر ارزش افزوده (۱۰٪)</span>
              <strong className="nabz-price-line">{formatPriceLine(preview.vatAmount)}</strong>
            </div>
          )}
          <div className="gateway-pishkesh-panel__row gateway-pishkesh-panel__row--grand">
            <span>مبلغ نهایی قابل پرداخت</span>
            <strong className="nabz-price-line">{formatPriceLine(preview.orderTotal)}</strong>
          </div>
        </div>
        <p className="gateway-pishkesh-panel__words">
          <span>مبلغ به حروف:</span>
          {' '}
          {formatAmountRialWords(preview.orderTotal)}
        </p>
      </div>

      {live && (
        <div className="gateway-pishkesh-panel__actions">
          <button
            type="button"
            className="btn btn--outline"
            onClick={handlePrint}
          >
            🖨️ چاپ پیش‌فاکتور
          </button>
          <button
            type="button"
            className="btn btn--outline"
            onClick={handlePreview}
          >
            پیش‌نمایش
          </button>
          <button
            type="button"
            className="btn btn--outline"
            onClick={handleSend}
          >
            📲 ارسال برای مشتری
          </button>
        </div>
      )}
    </section>
  );
}
