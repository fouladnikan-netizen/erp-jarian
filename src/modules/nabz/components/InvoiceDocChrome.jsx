import headerBrand from '../../../assets/images/nikan-proforma-header.jpg';
import { toPersianDigits, toPersianInvoiceText } from '../dateUtils';
import { COMPANY_BRAND } from '../proformaConfig';

/**
 * سربرگ برند پیش‌فاکتور — مشترک بین پیش‌فاکتور و حواله باربری
 * @param {object} viewModel
 * @param {boolean} [viewModel.isOfficial=true] — غیررسمی: باکس می‌ماند، به‌جای لوگو «فولاد نیکان» و بدون شناسه‌ها
 * @param {string} [viewModel.documentNumberLabel] — پیش‌فرض: «شماره:»
 * @param {string} [viewModel.documentNumber] — پیش‌فرض: orderCode
 */
export function InvoiceDocBrandHeader({ viewModel }) {
  const numberLabel = viewModel.documentNumberLabel || 'شماره:';
  const numberValue = viewModel.documentNumber ?? viewModel.orderCode;
  const isOfficial = viewModel.isOfficial !== false;

  return (
    <header className={`invoice-doc__header${isOfficial ? '' : ' invoice-doc__header--unofficial'}`}>
      {isOfficial ? (
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
            <span>شناسه ملی: {toPersianInvoiceText(COMPANY_BRAND.nationalId)}</span>
            <span>شماره ثبت: {toPersianInvoiceText(COMPANY_BRAND.registrationNumber)}</span>
          </div>
        </div>
      ) : (
        <div className="invoice-doc__header-brand invoice-doc__header-brand--unofficial">
          <div className="invoice-doc__brand-mark">
            <span className="invoice-doc__brand-name">فولاد نیکان</span>
          </div>
        </div>
      )}
      <div className="invoice-doc__header-meta">
        <div className="invoice-doc__meta-grid">
          <span className="invoice-doc__meta-label">{numberLabel}</span>
          <span className="invoice-doc__meta-value invoice-doc__meta-value--number">
            {/[A-Za-z]/.test(String(numberValue ?? ''))
              ? String(numberValue)
              : toPersianDigits(numberValue)}
          </span>
          <span className="invoice-doc__meta-label">تاریخ صدور:</span>
          <span className="invoice-doc__meta-value">{toPersianInvoiceText(viewModel.issueDate)}</span>
        </div>
      </div>
    </header>
  );
}

/**
 * فوتر شرکت پیش‌فاکتور — مشترک بین پیش‌فاکتور و حواله باربری
 * غیررسمی: باکس فوتر می‌ماند اما آدرس/تلفن/کدپستی شرکت نمایش داده نمی‌شود.
 */
export function InvoiceDocFooter({ measure = false, isOfficial = true }) {
  if (!isOfficial) {
    return (
      <footer
        className="invoice-doc__footer invoice-doc__footer--unofficial"
        data-measure={measure ? 'footer' : undefined}
      >
        <div className="invoice-doc__footer-inner invoice-doc__footer-inner--empty" aria-hidden="true" />
      </footer>
    );
  }

  return (
    <footer className="invoice-doc__footer" data-measure={measure ? 'footer' : undefined}>
      <div className="invoice-doc__footer-inner">
        <div>
          <span className="invoice-doc__footer-label">دفتر مرکزی:</span>{' '}
          {COMPANY_BRAND.address}
        </div>
        <div className="invoice-doc__footer-contacts">
          <div>
            <span className="invoice-doc__footer-label">تلفن:</span>{' '}
            <span className="invoice-doc__footer-phone">{toPersianDigits(COMPANY_BRAND.phone)}</span>
          </div>
          <div>
            <span className="invoice-doc__footer-label">کد پستی:</span>{' '}
            {toPersianInvoiceText(COMPANY_BRAND.postalCode)}
          </div>
        </div>
        <div className="invoice-doc__footer-website">{COMPANY_BRAND.website}</div>
      </div>
    </footer>
  );
}
