import logo from '../../../assets/images/nikan2.jpg';
import { COMPANY_BRAND } from '../proformaConfig';

export default function ShippingDocument({ viewModel }) {
  if (!viewModel) return null;

  const { orderCode, issueDate, voucherNumber, carrier, recipient, items } = viewModel;

  return (
    <article className="shipping-doc">
      <header className="shipping-doc__header">
        <div className="shipping-doc__brand">
          <img src={logo} alt={COMPANY_BRAND.name} className="shipping-doc__logo" />
          <div>
            <h1 className="shipping-doc__company">{COMPANY_BRAND.name}</h1>
            <p className="shipping-doc__tagline">{COMPANY_BRAND.tagline}</p>
          </div>
        </div>
        <div className="shipping-doc__meta">
          <h2 className="shipping-doc__title">حواله باربری و دستور بارگیری</h2>
          <p>
            <span>تاریخ:</span>
            {' '}
            {issueDate}
          </p>
          <p>
            <span>شماره سفارش:</span>
            {' '}
            {orderCode}
          </p>
          <p>
            <span>شماره حواله:</span>
            {' '}
            {voucherNumber}
          </p>
          <p>
            <span>باربری:</span>
            {' '}
            {carrier.name}
          </p>
        </div>
      </header>

      <section className="shipping-doc__section">
        <h3 className="shipping-doc__section-title">اطلاعات تحویل‌گیرنده</h3>
        <div className="shipping-doc__recipient-grid">
          <p><span>نام تحویل‌گیرنده:</span> {recipient.name}</p>
          <p><span>شناسه/کد ملی:</span> {recipient.nationalId}</p>
          <p><span>شماره تماس:</span> {recipient.phone}</p>
          <p><span>کد پستی:</span> {recipient.postalCode}</p>
          <p className="shipping-doc__recipient-address"><span>آدرس تحویل‌گیرنده:</span> {recipient.address}</p>
        </div>
      </section>

      <section className="shipping-doc__section">
        <h3 className="shipping-doc__section-title">جدول محصولات جهت بارگیری</h3>
        <table className="shipping-doc__table">
          <thead>
            <tr>
              <th>ردیف</th>
              <th>نام محصول</th>
              <th>توضیحات</th>
              <th>مقدار</th>
              <th>واحد</th>
              <th>نام انبار</th>
              <th>آدرس انبار</th>
              <th>حواله انبار</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.rowNumber}>
                <td>{row.rowNumber.toLocaleString('fa-IR')}</td>
                <td>{row.name}</td>
                <td>{row.description}</td>
                <td>{row.qty.toLocaleString('fa-IR')}</td>
                <td>{row.unit}</td>
                <td>{row.warehouseName}</td>
                <td>{row.warehouseAddress}</td>
                <td>{row.warehouseVoucherCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="shipping-doc__signatures">
        <div className="shipping-doc__signature">
          <span>باربری</span>
          <div className="shipping-doc__signature-line" />
        </div>
        <div className="shipping-doc__signature">
          <span>انباردار</span>
          <div className="shipping-doc__signature-line" />
        </div>
        <div className="shipping-doc__signature">
          <span>راننده</span>
          <div className="shipping-doc__signature-line" />
        </div>
      </footer>
    </article>
  );
}
