import { calculateQuotingPreview } from '../../quotingService';
import { formatAmountRial } from '../../orderCode';

export default function OrderProfileItemsTab({ order }) {
  const preview = calculateQuotingPreview(order);
  const isOfficial = preview.saleType === 'رسمی';

  return (
    <div className="order-profile-card">
      <div className="order-profile-items__table-wrap">
        <table className="order-profile-items__table">
          <thead>
            <tr>
              <th>ردیف</th>
              <th>شرح کالا</th>
              <th>مقدار</th>
              <th>واحد</th>
              <th>قیمت واحد</th>
              <th>مبلغ کل</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, index) => {
              const line = preview.lines[index] || {};
              const productName = item.name || '—';
              const productNote = item.description || '';
              const description = productNote ? `${productName} — ${productNote}` : productName;

              return (
                <tr key={`${item.name}-${index}`}>
                  <td>{index + 1}</td>
                  <td className="order-profile-items__desc">{description}</td>
                  <td>{line.qty ?? item.qty ?? '—'}</td>
                  <td>{item.unit || '—'}</td>
                  <td className="order-profile-items__num">
                    {line.hasTarget ? formatAmountRial(line.saleUnitPrice) : '—'}
                  </td>
                  <td className="order-profile-items__num">
                    {line.hasTarget ? formatAmountRial(line.lineTotal) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="order-profile-items__summary">
        <div className="order-profile-items__summary-row">
          <span>جمع کل</span>
          <strong>{formatAmountRial(preview.subtotal)} ریال</strong>
        </div>
        {isOfficial && (
          <div className="order-profile-items__summary-row">
            <span>مالیات بر ارزش افزوده (۱۰٪)</span>
            <strong>{formatAmountRial(preview.vatAmount)} ریال</strong>
          </div>
        )}
        <div className="order-profile-items__summary-row order-profile-items__summary-row--grand">
          <span>مبلغ قابل پرداخت</span>
          <strong>{formatAmountRial(preview.orderTotal)} ریال</strong>
        </div>
        <div className="order-profile-items__summary-row order-profile-items__summary-row--profit">
          <span>سود کل سفارش</span>
          <strong>{formatAmountRial(preview.totalProfit)} ریال</strong>
        </div>
      </div>
    </div>
  );
}
