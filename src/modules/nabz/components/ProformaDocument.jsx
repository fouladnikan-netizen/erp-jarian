import headerBrand from '../../../assets/images/nikan-proforma-header.jpg';
import { formatAmountRial } from '../orderCode';
import {
  COMPANY_BRAND,
  PROFORMA_BANK_ACCOUNTS,
  PROFORMA_TERMS_ITEMS,
} from '../proformaConfig';

function formatInvoiceNumber(amount) {
  return formatAmountRial(amount);
}

function ProformaTermsBlock({ terms, termsCustom }) {
  if (termsCustom && terms) {
    return (
      <div className="invoice-doc__terms-custom">
        <h4 className="invoice-doc__terms-heading">شرایط و ضوابط پیش‌فاکتور</h4>
        <p className="invoice-doc__terms-custom-text">{terms}</p>
      </div>
    );
  }

  return (
    <>
      <div className="invoice-doc__accounts">
        <h4 className="invoice-doc__terms-heading">اطلاعات حساب‌های بانکی به‌نام «پترو فولاد نیکان»</h4>
        <div className="invoice-doc__accounts-list">
          {PROFORMA_BANK_ACCOUNTS.map((account) => (
            <p key={account.sheba}>
              {account.bank}: شماره حساب: {account.account} | شماره شبا: {account.sheba}
            </p>
          ))}
        </div>
      </div>
      <div className="invoice-doc__terms-list-wrap">
        <h4 className="invoice-doc__terms-heading">شرایط و ضوابط پیش‌فاکتور</h4>
        <ul className="invoice-doc__terms-list">
          {PROFORMA_TERMS_ITEMS.map((item, index) => (
            <li key={item.title}>
              <strong>{`${index + 1}. ${item.title}:`}</strong>{' '}
              {item.body}
              {item.subItems && (
                <ul className="invoice-doc__terms-sublist">
                  {item.subItems.map((sub) => (
                    <li key={sub}>{sub}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function ProductDescription({ name, note }) {
  return (
    <span className="invoice-doc__product-desc">
      <span className="invoice-doc__product-name">{name}</span>
      {note ? (
        <>
          {' '}
          <span className="invoice-doc__product-note">{note}</span>
        </>
      ) : null}
    </span>
  );
}

export default function ProformaDocument({ viewModel, terms, termsCustom = false }) {
  return (
    <article className="invoice-doc">
      <div className="invoice-doc__print-header">
        <header className="invoice-doc__header">
          <div className="invoice-doc__header-brand">
            <div className="invoice-doc__brand-mark">
              <img
                src={headerBrand}
                alt=""
                className="invoice-doc__brand-mark-img"
              />
            </div>
            <p className="invoice-doc__tagline">{COMPANY_BRAND.tagline}</p>
            <div className="invoice-doc__company-ids">
              <span>شناسه ملی: {COMPANY_BRAND.nationalId}</span>
              <span>شماره ثبت: {COMPANY_BRAND.registrationNumber}</span>
            </div>
          </div>
          <div className="invoice-doc__header-meta">
            <div className="invoice-doc__meta-grid">
              <span className="invoice-doc__meta-label">شماره:</span>
              <span className="invoice-doc__meta-value invoice-doc__meta-value--number">{viewModel.orderCode}</span>
              <span className="invoice-doc__meta-label">تاریخ صدور:</span>
              <span className="invoice-doc__meta-value">{viewModel.issueDate}</span>
            </div>
          </div>
        </header>

        <section className="invoice-doc__buyer">
          <div className="invoice-doc__buyer-row">
            <h3 className="invoice-doc__buyer-title">خریدار</h3>
            <div className="invoice-doc__buyer-inline">
              <strong className="invoice-doc__buyer-name invoice-doc__buyer-nowrap">{viewModel.customerName}</strong>
              <span className="invoice-doc__buyer-item invoice-doc__buyer-nowrap">
                <span className="invoice-doc__field-label">شناسه ملی:</span>
                <span>{viewModel.customerNationalId}</span>
              </span>
              <span className="invoice-doc__buyer-item invoice-doc__buyer-nowrap">
                <span className="invoice-doc__field-label">درخواست‌کننده:</span>
                <span>{viewModel.requesterName}</span>
              </span>
            </div>
          </div>
        </section>

        <div className="invoice-doc__table-head">
          <div className="invoice-doc__col invoice-doc__col--row">ردیف</div>
          <div className="invoice-doc__col invoice-doc__col--desc">شرح کالا</div>
          <div className="invoice-doc__col invoice-doc__col--qty">مقدار</div>
          <div className="invoice-doc__col invoice-doc__col--unit">واحد</div>
          <div className="invoice-doc__col invoice-doc__col--price">قیمت واحد</div>
          <div className="invoice-doc__col invoice-doc__col--total">قیمت کل</div>
        </div>
      </div>

      <div className="invoice-doc__print-body">
        <section className="invoice-doc__table-section">
          <div className="invoice-doc__table-body">
            {viewModel.lines.map((line, index) => (
              <div
                key={line.row}
                className={`invoice-doc__table-row${index % 2 === 1 ? ' is-alt' : ''}`}
              >
                <div className="invoice-doc__col invoice-doc__col--row">{line.row.toLocaleString('fa-IR')}</div>
                <div className="invoice-doc__col invoice-doc__col--desc">
                  <ProductDescription name={line.productName} note={line.productNote} />
                </div>
                <div className="invoice-doc__col invoice-doc__col--qty">{Number(line.qty).toLocaleString('fa-IR')}</div>
                <div className="invoice-doc__col invoice-doc__col--unit">{line.unit}</div>
                <div className="invoice-doc__col invoice-doc__col--price">{formatInvoiceNumber(line.saleUnitPrice)}</div>
                <div className="invoice-doc__col invoice-doc__col--total invoice-doc__col--bold">
                  {formatInvoiceNumber(line.lineTotal)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="invoice-doc__totals-wrap">
          <div className="invoice-doc__totals">
            <div className="invoice-doc__totals-row">
              <span>جمع پیش فاکتور:</span>
              <span>{formatInvoiceNumber(viewModel.subtotal)}</span>
            </div>
            {viewModel.isOfficial && (
              <div className="invoice-doc__totals-row">
                <span>جمع مالیات بر ارزش افزوده:</span>
                <span>{formatInvoiceNumber(viewModel.vatAmount)}</span>
              </div>
            )}
            <div className="invoice-doc__totals-row invoice-doc__totals-row--grand">
              <span>جمع کل پیش فاکتور:</span>
              <span>{formatInvoiceNumber(viewModel.grandTotal)}</span>
            </div>
            <p className="invoice-doc__totals-words">
              <span className="invoice-doc__totals-words-label">مبلغ به حروف:</span>{' '}
              {viewModel.grandTotalWords}
            </p>
          </div>
        </section>

        <div className="invoice-doc__page-bottom">
          <section className="invoice-doc__terms-section">
            <ProformaTermsBlock terms={terms} termsCustom={termsCustom} />
          </section>

          <footer className="invoice-doc__footer">
            <div className="invoice-doc__footer-inner">
              <div>
                <span className="invoice-doc__footer-label">دفتر مرکزی:</span>{' '}
                {COMPANY_BRAND.address}
              </div>
              <div className="invoice-doc__footer-contacts">
                <div>
                  <span className="invoice-doc__footer-label">تلفن:</span>{' '}
                  <span dir="ltr" className="invoice-doc__footer-phone">{COMPANY_BRAND.phone}</span>
                </div>
                <div>
                  <span className="invoice-doc__footer-label">کد پستی:</span> {COMPANY_BRAND.postalCode}
                </div>
              </div>
              <div className="invoice-doc__footer-website">{COMPANY_BRAND.website}</div>
            </div>
          </footer>
        </div>
      </div>
    </article>
  );
}
