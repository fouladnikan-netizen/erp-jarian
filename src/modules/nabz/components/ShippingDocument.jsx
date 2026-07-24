import { toPersianDigits, toPersianInvoiceText } from '../dateUtils';
import { InvoiceDocBrandHeader, InvoiceDocFooter } from './InvoiceDocChrome';

function InfoField({ label, children }) {
  return (
    <p>
      <span>{label}</span>
      {' '}
      {children}
    </p>
  );
}

export default function ShippingDocument({ viewModel }) {
  if (!viewModel) return null;

  const {
    issueDate,
    documentNumberLabel,
    documentNumber,
    sender,
    recipient,
    items,
  } = viewModel;

  return (
    <article className="invoice-doc invoice-doc--page shipping-doc is-last">
      <div className="invoice-doc__page-body">
        <div className="invoice-doc__print-header">
          <InvoiceDocBrandHeader
            viewModel={{
              issueDate,
              documentNumberLabel: documentNumberLabel || 'شماره فرم:',
              documentNumber: documentNumber || 'PFN-O-F01',
            }}
          />
        </div>

        <h2 className="shipping-doc__doc-title">حواله باربری و دستور بارگیری</h2>

        <div className="shipping-doc__parties">
          <section className="shipping-doc__section shipping-doc__party">
            <h3 className="shipping-doc__section-title">اطلاعات تحویل‌گیرنده</h3>
            <div className="shipping-doc__info-grid">
              <InfoField label="نام شرکت:">
                {recipient.companyName || '—'}
              </InfoField>
              <InfoField label="شناسه/کد ملی:">
                {toPersianInvoiceText(recipient.nationalId)}
              </InfoField>
              <InfoField label="نام تحویل‌گیرنده:">
                {recipient.name}
              </InfoField>
              <InfoField label="شماره تماس:">
                {toPersianDigits(recipient.phone)}
              </InfoField>
              <InfoField label="کد پستی:">
                {toPersianInvoiceText(recipient.postalCode)}
              </InfoField>
              <p className="shipping-doc__info-grid__full">
                <span>آدرس تحویل‌گیرنده:</span>
                {' '}
                {recipient.address}
              </p>
            </div>
          </section>

          <section className="shipping-doc__section shipping-doc__party">
            <h3 className="shipping-doc__section-title">اطلاعات ارسال‌کننده</h3>
            <div className="shipping-doc__info-grid">
              <InfoField label="کارشناس فروش:">
                {sender?.salesExpertName || '—'}
              </InfoField>
              <InfoField label="شماره موبایل:">
                {toPersianDigits(sender?.salesExpertMobile || '—')}
              </InfoField>
              <InfoField label="شماره سفارش فروش:">
                {toPersianDigits(sender?.salesOrderCode || '—')}
              </InfoField>
              <InfoField label="نام باربری:">
                {sender?.carrierName || '—'}
              </InfoField>
            </div>
          </section>
        </div>

        <section className="shipping-doc__section shipping-doc__section--table">
          <h3 className="shipping-doc__section-title">جدول محصولات جهت بارگیری</h3>
          <table className="shipping-doc__table">
            <colgroup>
              <col className="shipping-doc__col--row" />
              <col className="shipping-doc__col--product" />
              <col className="shipping-doc__col--qty" />
              <col className="shipping-doc__col--unit" />
              <col className="shipping-doc__col--warehouse" />
              <col className="shipping-doc__col--address" />
              <col className="shipping-doc__col--voucher" />
            </colgroup>
            <thead>
              <tr>
                <th>ردیف</th>
                <th>شرح کالا</th>
                <th>مقدار</th>
                <th>واحد</th>
                <th>نام انبار</th>
                <th>آدرس انبار</th>
                <th>حواله انبار</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.shippingRowKey || row.rowNumber}>
                  <td>{row.rowNumber.toLocaleString('fa-IR')}</td>
                  <td className="shipping-doc__product-cell">
                    <span className="shipping-doc__product-inline">
                      <span className="shipping-doc__product-name">{row.name}</span>
                      {row.description && row.description !== '—' ? (
                        <span className="shipping-doc__product-note">{row.description}</span>
                      ) : null}
                    </span>
                  </td>
                  <td>{row.qty.toLocaleString('fa-IR')}</td>
                  <td>{toPersianInvoiceText(row.unit)}</td>
                  <td>{row.warehouseName}</td>
                  <td>{row.warehouseAddress}</td>
                  <td>{toPersianDigits(row.warehouseVoucherCode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <InvoiceDocFooter />
    </article>
  );
}
