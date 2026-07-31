import {
  formatPriceLine,
  QuotingMatrix,
} from './quickInquiryParts';
import QuotingOrderTable from './QuotingOrderTable';

export default function QuotingReadOnlyPanel({
  order,
  preview,
  quoting,
  lineMarginMode,
  showSupplier,
  saleType,
}) {
  return (
    <div className="nabz-quoting-readonly">
      <QuotingMatrix quoting={quoting} readOnly />

      <QuotingOrderTable
        order={order}
        preview={preview}
        lineMarginMode={lineMarginMode}
        showSupplier={showSupplier}
        saleType={saleType}
        storageKey="nabz-quick-inquiry-readonly"
      />

      <footer className="nabz-quick-inquiry-modal__footer nabz-quoting-footer">
        <section className="nabz-quoting-footer__summary">
          <div className="nabz-quoting-footer__billing">
            <div className="nabz-quoting-footer__rows">
              <div className="nabz-quoting-footer__row">
                <span>جمع سفارش</span>
                <strong className="nabz-price-line">{formatPriceLine(preview.subtotal)}</strong>
              </div>
              {preview.showVatBreakdown && (
                <div className="nabz-quoting-footer__row">
                  <span>مالیات ارزش افزوده</span>
                  <strong className="nabz-price-line">{formatPriceLine(preview.vatAmount)}</strong>
                </div>
              )}
              <div className="nabz-quoting-footer__row nabz-quoting-footer__row--grand">
                <span>جمع کل سفارش</span>
                <strong className="nabz-price-line">{formatPriceLine(preview.orderTotal)}</strong>
              </div>
            </div>
          </div>
          <div className="nabz-quoting-footer__profit">
            <span className="nabz-quoting-footer__profit-label">جمع کل سود سفارش</span>
            <strong className="nabz-price-line nabz-quoting-footer__profit-value">
              {formatPriceLine(preview.totalProfit)}
            </strong>
          </div>
        </section>
      </footer>
    </div>
  );
}
