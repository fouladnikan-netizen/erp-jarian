import {
  JarianMoney,
  JarianMoneyFooter,
  JarianProductCell,
} from '../../../../components/jarian/JarianPresentation';
import { calculateQuotingPreview } from '../../quotingService';

export default function OrderProfileItemsTab({ order }) {
  const preview = calculateQuotingPreview(order);
  const isOfficial = preview.saleType === 'رسمی';

  return (
    <div className="order-profile-card">
      <div className="order-profile-items__table-wrap">
        <table className="order-profile-items__table jarian-table">
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

              return (
                <tr key={`${item.name}-${index}`}>
                  <td>{index + 1}</td>
                  <td className="order-profile-items__desc jarian-td-product">
                    <JarianProductCell name={item.name} description={item.description} />
                  </td>
                  <td>{line.qty ?? item.qty ?? '—'}</td>
                  <td>{item.unit || '—'}</td>
                  <td className="order-profile-items__num jarian-td-money">
                    {line.hasTarget ? <JarianMoney amount={line.saleUnitPrice} /> : '—'}
                  </td>
                  <td className="order-profile-items__num jarian-td-money">
                    {line.hasTarget ? <JarianMoney amount={line.lineTotal} emphasis /> : '—'}
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
          <strong><JarianMoneyFooter amount={preview.subtotal} /></strong>
        </div>
        {isOfficial && (
          <div className="order-profile-items__summary-row">
            <span>مالیات بر ارزش افزوده (۱۰٪)</span>
            <strong><JarianMoneyFooter amount={preview.vatAmount} /></strong>
          </div>
        )}
        <div className="order-profile-items__summary-row order-profile-items__summary-row--grand">
          <span>مبلغ قابل پرداخت</span>
          <strong><JarianMoneyFooter amount={preview.orderTotal} emphasis /></strong>
        </div>
        <div className="order-profile-items__summary-row order-profile-items__summary-row--profit">
          <span>سود کل سفارش</span>
          <strong><JarianMoneyFooter amount={preview.totalProfit} emphasis /></strong>
        </div>
      </div>
    </div>
  );
}
