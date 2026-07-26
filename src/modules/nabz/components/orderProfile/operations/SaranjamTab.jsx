import { useEffect, useMemo, useRef, useState } from 'react';
import logo from '../../../../../assets/images/nikan2.jpg';
import { COMPANY_BRAND, PROFORMA_BANK_ACCOUNTS } from '../../../proformaConfig';
import { formatAmountRial, toDisplayOrderCode } from '../../../orderCode';
import { formatJarianMoney } from '../../../../../config/JarianUI.config';
import { getCustomerById } from '../../../customers';
import { getTodayJalali } from '../../../dateUtils';
import { listCrmPaymentsAsCustomerPayments } from '../../../orderCrmService';
import { buildSaranjamSettlementModel } from '../../../saranjamSettlementService';
import { printTaxInvoice } from './printTaxInvoice';
import SaranjamSettlementLayout from './SaranjamSettlementLayout';
import './SaranjamTab.css';

const VAT_RATE = 0.09;

const MOCK_ITEMS = [
  {
    id: 'item-1',
    code: 'PRD-018',
    name: 'تیرآهن ۱۸ ذوب آهن',
    supplierId: 'sup-1',
    supplier: 'ذوب‌آهن اصفهان',
    qty: 22,
    unit: 'تن',
    unitPriceRial: 2_200_000_000,
    discountRial: 0,
    invoiceUploaded: false,
    invoiceFileName: '',
  },
  {
    id: 'item-2',
    code: 'PRD-002',
    name: 'ورق سیاه ۲ میل',
    supplierId: 'sup-2',
    supplier: 'فولاد مبارکه',
    qty: 8.5,
    unit: 'تن',
    unitPriceRial: 1_900_000_000,
    discountRial: 50_000_000,
    invoiceUploaded: false,
    invoiceFileName: '',
  },
  {
    id: 'item-3',
    code: 'PRD-005',
    name: 'نبشی ۵ استاندارد',
    supplierId: 'sup-1',
    supplier: 'ذوب‌آهن اصفهان',
    qty: 3.2,
    unit: 'تن',
    unitPriceRial: 1_800_000_000,
    discountRial: 0,
    invoiceUploaded: true,
    invoiceFileName: 'invoice-zobahan-018.pdf',
  },
];

const MOCK_CUSTOMER_PAYMENTS = [
  {
    id: 'cp-1',
    date: '۱۴۰۴/۰۱/۱۰',
    amountRial: 30_000_000_000,
    note: 'پیش‌پرداخت',
    receiptFileName: 'fish-pish.pdf',
  },
];

const MOCK_SUPPLIER_PAYMENTS = [
  {
    id: 'sp-1',
    supplierId: 'sup-1',
    supplier: 'ذوب‌آهن اصفهان',
    date: '۱۴۰۴/۰۱/۱۱',
    amountRial: 40_000_000_000,
    receiptFileName: 'pay-zobahan.pdf',
  },
];

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#16A34A" />
      <path d="M7.5 12.5l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function buildSalesInvoiceFingerprint(items) {
  return (items || []).map((item) => ({
    id: item.id,
    code: item.code || '',
    name: item.name || '',
    qty: Number(item.qty) || 0,
    unitPriceRial: Number(item.unitPriceRial) || 0,
    discountRial: Number(item.discountRial) || 0,
  }));
}

function hasSalesInvoiceContentChanged(currentItems, snapshotItems) {
  if (!snapshotItems?.length) return false;
  return JSON.stringify(buildSalesInvoiceFingerprint(currentItems))
    !== JSON.stringify(buildSalesInvoiceFingerprint(snapshotItems));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

function isPdfDataUrl(dataUrl, fileName = '') {
  const name = String(fileName).toLowerCase();
  return String(dataUrl || '').startsWith('data:application/pdf') || name.endsWith('.pdf');
}

function PurchaseInvoiceModal({ open, onClose, item }) {
  const frameRef = useRef(null);

  if (!open || !item) return null;

  const dataUrl = item.invoiceFileDataUrl;
  const fileName = item.invoiceFileName || 'فاکتور خرید';
  const isPdf = isPdfDataUrl(dataUrl, fileName);

  const handlePrint = () => {
    if (!dataUrl) return;

    if (isPdf) {
      const win = window.open(dataUrl, '_blank');
      if (win) {
        win.addEventListener('load', () => {
          try {
            win.focus();
            win.print();
          } catch {
            /* ignore */
          }
        });
      }
      return;
    }

    const frame = frameRef.current;
    if (frame?.contentWindow) {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      return;
    }

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>${fileName}</title>
      <style>html,body{margin:0;background:#fff}img{max-width:100%;display:block;margin:0 auto}</style>
      </head><body><img src="${dataUrl}" alt="" /></body></html>`);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
    };
  };

  return (
    <div className="saranjam-modal" role="presentation">
      <button
        type="button"
        className="saranjam-modal__backdrop"
        aria-label="بستن"
        onClick={onClose}
      />
      <div
        className="saranjam-modal__panel saranjam-modal__panel--purchase font-meem"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saranjam-purchase-title"
        dir="rtl"
      >
        <header className="saranjam-modal__toolbar">
          <div>
            <h2 id="saranjam-purchase-title" className="saranjam-modal__toolbar-title">
              مشاهده فاکتور خرید تأمین‌کننده
            </h2>
            <p className="saranjam-purchase-modal__meta">
              {item.supplier}
              {' · '}
              {item.name}
              {' · '}
              <span className="font-vazir">{fileName}</span>
            </p>
          </div>
          <button type="button" className="saranjam-modal__close" onClick={onClose} aria-label="بستن">×</button>
        </header>

        <div className="saranjam-purchase-preview">
          {!dataUrl ? (
            <p className="saranjam-purchase-preview__empty" role="status">
              فایل فاکتور در این نشست موجود نیست. لطفاً دوباره آپلود کنید تا بتوانید مشاهده و چاپ کنید.
            </p>
          ) : isPdf ? (
            <iframe
              ref={frameRef}
              title={fileName}
              src={dataUrl}
              className="saranjam-purchase-preview__frame"
            />
          ) : (
            <div className="saranjam-purchase-preview__image-wrap">
              <img src={dataUrl} alt={fileName} className="saranjam-purchase-preview__image" />
            </div>
          )}
        </div>

        <footer className="saranjam-modal__footer">
          <button type="button" className="saranjam-btn saranjam-btn--flat" onClick={onClose}>
            بستن
          </button>
          <button
            type="button"
            className="saranjam-btn saranjam-btn--solid"
            onClick={handlePrint}
            disabled={!dataUrl}
          >
            چاپ فاکتور
          </button>
        </footer>
      </div>
    </div>
  );
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function lineEconomics(row) {
  const qty = toNumber(row.qty);
  const unitPrice = toNumber(row.unitPriceRial);
  const discount = toNumber(row.discountRial);
  const subtotal = qty * unitPrice;
  const afterDiscount = Math.max(0, subtotal - discount);
  const vat = Math.round(afterDiscount * VAT_RATE);
  const finalTotal = afterDiscount + vat;
  return { qty, unitPrice, discount, subtotal, afterDiscount, vat, finalTotal };
}

function sumPayments(rows) {
  return (rows || []).reduce((acc, row) => acc + toNumber(row.amountRial), 0);
}

function buildSupplierLedgers(items, supplierPayments) {
  const map = new Map();
  (items || []).forEach((item) => {
    const key = item.supplierId || item.supplier;
    if (!map.has(key)) {
      map.set(key, {
        supplierId: key,
        supplier: item.supplier,
        owedRial: 0,
        payments: [],
      });
    }
    const econ = lineEconomics(item);
    map.get(key).owedRial += econ.afterDiscount;
  });

  (supplierPayments || []).forEach((pay) => {
    const key = pay.supplierId || pay.supplier;
    if (!map.has(key)) {
      map.set(key, {
        supplierId: key,
        supplier: pay.supplier,
        owedRial: 0,
        payments: [],
      });
    }
    map.get(key).payments.push(pay);
  });

  return Array.from(map.values()).map((entry) => {
    const paidRial = sumPayments(entry.payments);
    return {
      ...entry,
      paidRial,
      balanceRial: entry.owedRial - paidRial,
    };
  });
}

export function evaluateSaranjamGates({
  items,
  salesInvoiceIssued,
  customerBalanceRial,
  supplierLedgers,
}) {
  const allPurchaseInvoicesUploaded = (items || []).length > 0
    && (items || []).every((item) => item.invoiceUploaded);
  const customerBalanceZero = Number(customerBalanceRial) === 0;
  const allSupplierBalancesZero = (supplierLedgers || []).length > 0
    && (supplierLedgers || []).every((s) => Number(s.balanceRial) === 0);

  return {
    allPurchaseInvoicesUploaded,
    salesInvoiceIssued: Boolean(salesInvoiceIssued),
    customerBalanceZero,
    allSupplierBalancesZero,
    canArchive:
      allPurchaseInvoicesUploaded
      && Boolean(salesInvoiceIssued)
      && customerBalanceZero
      && allSupplierBalancesZero,
  };
}

function PartyInfoBox({ sideLabel, name, address, city, province, nationalId, economicId, postalCode, registrationNumber, phone }) {
  return (
    <section className="saranjam-taxdoc__party-box">
      <div className="saranjam-taxdoc__party-side font-meem">{sideLabel}</div>
      <div className="saranjam-taxdoc__party-body">
        <div className="saranjam-taxdoc__party-col">
          <p className="font-meem">
            <span className="saranjam-taxdoc__k">نام شخص حقیقی / حقوقی:</span>
            {' '}
            {name}
          </p>
          <p className="font-meem">
            <span className="saranjam-taxdoc__k">نشانی کامل:</span>
            {' '}
            {address || '—'}
          </p>
          <p className="font-meem">
            <span className="saranjam-taxdoc__k">شهر / استان:</span>
            {' '}
            <span className="font-meem">{city || '—'}</span>
            {' / '}
            <span className="font-meem">{province || '—'}</span>
          </p>
        </div>
        <div className="saranjam-taxdoc__party-col">
          <p className="font-meem">
            <span className="saranjam-taxdoc__k">شناسه ملی:</span>
            {' '}
            <span className="font-vazir">{nationalId || '—'}</span>
          </p>
          <p className="font-meem">
            <span className="saranjam-taxdoc__k">شماره اقتصادی:</span>
            {' '}
            <span className="font-vazir">{economicId || '—'}</span>
          </p>
          <p className="font-meem">
            <span className="saranjam-taxdoc__k">کد پستی:</span>
            {' '}
            <span className="font-vazir">{postalCode || '—'}</span>
          </p>
          <p className="font-meem">
            <span className="saranjam-taxdoc__k">شماره ثبت:</span>
            {' '}
            <span className="font-vazir">{registrationNumber || '—'}</span>
          </p>
          <p className="font-meem">
            <span className="saranjam-taxdoc__k">تلفن:</span>
            {' '}
            <span className="font-vazir">{phone || '—'}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function TaxInvoiceModal({
  open,
  onClose,
  onConfirm,
  isAdmin,
  draftItems,
  onChangeDraft,
  orderCode,
  buyer,
  invoiceNumber,
  issueDate,
  mode = 'issue',
}) {
  const isViewMode = mode === 'view';
  const canEdit = Boolean(isAdmin) && !isViewMode;

  const totals = useMemo(() => {
    return draftItems.reduce(
      (acc, row) => {
        const econ = lineEconomics(row);
        acc.subtotal += econ.subtotal;
        acc.discount += econ.discount;
        acc.afterDiscount += econ.afterDiscount;
        acc.vat += econ.vat;
        acc.finalTotal += econ.finalTotal;
        return acc;
      },
      { subtotal: 0, discount: 0, afterDiscount: 0, vat: 0, finalTotal: 0 },
    );
  }, [draftItems]);

  const primaryBank = PROFORMA_BANK_ACCOUNTS[0];

  const taxdocRef = useRef(null);

  const handlePrintInvoice = () => {
    if (printTaxInvoice(taxdocRef.current)) return;

    // Extremely rare: iframe unavailable
    window.print();
  };

  if (!open) return null;

  return (
    <div className="saranjam-modal" role="presentation">
      <button
        type="button"
        className="saranjam-modal__backdrop saranjam-modal__no-print"
        aria-label="بستن"
        onClick={onClose}
      />
      <div
        className="saranjam-modal__panel font-meem"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saranjam-tax-title"
        dir="rtl"
      >
        <header className="saranjam-modal__toolbar saranjam-modal__no-print">
          <h2 id="saranjam-tax-title" className="saranjam-modal__toolbar-title">
            {isViewMode
              ? 'مشاهده فاکتور فروش'
              : (mode === 'reissue' ? 'صدور مجدد فاکتور فروش' : 'صدور فاکتور فروش')}
          </h2>
          <button type="button" className="saranjam-modal__close" onClick={onClose} aria-label="بستن">×</button>
        </header>

        {isViewMode ? (
          <p className="saranjam-modal__lock-msg saranjam-modal__lock-msg--info saranjam-modal__no-print" role="status">
            این فاکتور قبلاً صادر شده است — می‌توانید مشاهده و چاپ کنید
          </p>
        ) : !isAdmin ? (
          <p className="saranjam-modal__lock-msg saranjam-modal__no-print" role="status">
            تغییر دستی مقادیر نیازمند تایید مدیریت است
          </p>
        ) : null}

        {/* Official tax invoice — Assets/Invoice/14050233.pdf (NOT proforma) */}
        <article
          ref={taxdocRef}
          className="saranjam-taxdoc"
          data-print-document="sales-invoice"
        >
          <header className="saranjam-taxdoc__top">
            <div className="saranjam-taxdoc__top-brand">
              <img src={logo} alt="" className="saranjam-taxdoc__logo" />
              <span className="font-meem saranjam-taxdoc__top-company">{COMPANY_BRAND.name}</span>
            </div>
            <h1 className="saranjam-taxdoc__title font-meem">صورتحساب فروش کالا و خدمات</h1>
            <div className="saranjam-taxdoc__top-meta">
              <p className="font-meem">
                شماره:
                {' '}
                <span className="font-vazir">{invoiceNumber}</span>
              </p>
              <p className="font-meem">
                تاریخ:
                {' '}
                <span className="font-vazir">{issueDate}</span>
              </p>
              <p className="font-meem">
                سفارش:
                {' '}
                <span className="font-vazir">{orderCode}</span>
              </p>
            </div>
          </header>

          <PartyInfoBox
            sideLabel="فروشنده"
            name={COMPANY_BRAND.name}
            address={COMPANY_BRAND.address}
            city="تهران"
            province="تهران"
            nationalId={COMPANY_BRAND.nationalId}
            economicId={COMPANY_BRAND.nationalId}
            postalCode={COMPANY_BRAND.postalCode}
            registrationNumber={COMPANY_BRAND.registrationNumber}
            phone={COMPANY_BRAND.phone}
          />

          <PartyInfoBox
            sideLabel="خریدار"
            name={buyer.name}
            address={buyer.address}
            city={buyer.city}
            province={buyer.province}
            nationalId={buyer.nationalId}
            economicId={buyer.economicId}
            postalCode={buyer.postalCode}
            registrationNumber={buyer.registrationNumber}
            phone={buyer.phone}
          />

          <div className="saranjam-taxdoc__table-wrap">
            <table className="saranjam-taxdoc__table">
              <thead>
                <tr>
                  <th className="font-meem">ردیف</th>
                  <th className="font-meem">کد کالا</th>
                  <th className="font-meem">شرح کالا یا خدمات</th>
                  <th className="font-meem">مقدار</th>
                  <th className="font-meem">واحد اندازه‌گیری</th>
                  <th className="font-meem">مبلغ واحد</th>
                  <th className="font-meem">مبلغ کل</th>
                  <th className="font-meem">مبلغ تخفیف</th>
                  <th className="font-meem">مبلغ کل پس از تخفیف</th>
                  <th className="font-meem">مالیات بر ارزش افزوده</th>
                  <th className="font-meem">مبلغ کل به‌علاوه ارزش افزوده</th>
                </tr>
              </thead>
              <tbody>
                {draftItems.map((row, index) => {
                  const econ = lineEconomics(row);
                  return (
                    <tr key={row.id}>
                      <td><span className="font-vazir">{(index + 1).toLocaleString('fa-IR')}</span></td>
                      <td><span className="font-vazir">{row.code || ''}</span></td>
                      <td className="saranjam-taxdoc__desc font-meem">{row.name}</td>
                      <td>
                        {canEdit ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            className="saranjam-taxdoc__input font-vazir"
                            value={row.qty}
                            onChange={(e) => onChangeDraft(row.id, 'qty', e.target.value)}
                          />
                        ) : (
                          <span className="font-vazir">{toNumber(row.qty).toLocaleString('fa-IR')}</span>
                        )}
                      </td>
                      <td className="font-meem">{row.unit}</td>
                      <td>
                        {canEdit ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            className="saranjam-taxdoc__input font-vazir"
                            value={row.unitPriceRial}
                            onChange={(e) => onChangeDraft(row.id, 'unitPriceRial', e.target.value)}
                          />
                        ) : (
                          <span className="jarian-money font-vazir">{formatJarianMoney(row.unitPriceRial)}</span>
                        )}
                      </td>
                      <td><span className="jarian-money font-vazir">{formatJarianMoney(econ.subtotal)}</span></td>
                      <td><span className="jarian-money font-vazir">{formatJarianMoney(econ.discount)}</span></td>
                      <td><span className="jarian-money font-vazir">{formatJarianMoney(econ.afterDiscount)}</span></td>
                      <td><span className="jarian-money font-vazir">{formatJarianMoney(econ.vat)}</span></td>
                      <td><span className="jarian-money font-vazir">{formatJarianMoney(econ.finalTotal)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="saranjam-taxdoc__sum-row">
                  <td colSpan={7} className="font-meem saranjam-taxdoc__sum-label">جمع کل</td>
                  <td><span className="jarian-money font-vazir">{formatJarianMoney(totals.discount, { withCurrency: true })}</span></td>
                  <td><span className="jarian-money font-vazir">{formatJarianMoney(totals.afterDiscount, { withCurrency: true })}</span></td>
                  <td><span className="jarian-money font-vazir">{formatJarianMoney(totals.vat, { withCurrency: true })}</span></td>
                  <td><span className="jarian-money font-vazir">{formatJarianMoney(totals.finalTotal, { withCurrency: true })}</span></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <footer className="saranjam-taxdoc__bottom">
            <div className="saranjam-taxdoc__notes">
              <p className="font-meem">
                <span className="saranjam-taxdoc__k">شرایط و نحوه فروش:</span>
                {' '}
                نقدی / غیرنقدی طبق توافق سفارش
              </p>
              <p className="font-meem">
                <span className="saranjam-taxdoc__k">توضیحات:</span>
                {' '}
                {primaryBank.bank}
                {' — '}
                حساب:
                {' '}
                <span className="font-vazir">{primaryBank.account}</span>
                {' | شبا: '}
                <span className="font-vazir">{primaryBank.sheba}</span>
              </p>
            </div>
            <div className="saranjam-taxdoc__sign">
              <p className="font-meem">مهر و امضا فروشنده</p>
              <img src={logo} alt="" className="saranjam-taxdoc__sign-logo" />
            </div>
            <div className="saranjam-taxdoc__sign">
              <p className="font-meem">مهر و امضا خریدار</p>
            </div>
          </footer>
        </article>

        <footer className="saranjam-modal__footer saranjam-modal__no-print">
          <button type="button" className="saranjam-btn saranjam-btn--flat" onClick={onClose}>
            {isViewMode ? 'بستن' : 'انصراف'}
          </button>
          <button type="button" className="saranjam-btn saranjam-btn--flat" onClick={handlePrintInvoice}>
            چاپ فاکتور
          </button>
          {!isViewMode && (
            <button type="button" className="saranjam-btn saranjam-btn--solid" onClick={onConfirm}>
              {mode === 'reissue' ? 'تأیید و صدور مجدد' : 'تأیید و صدور'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

/**
 * SaranjamTab — Settlement & Archive (final operations tab)
 */
export default function SaranjamTab({
  order,
  onUpdateOrder,
  compact = false,
}) {
  const purchaseFileRefs = useRef({});
  const customerFileRef = useRef(null);
  const supplierFileRefs = useRef({});

  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState(() => (
    order?.saranjam?.items?.length
      ? order.saranjam.items
      : MOCK_ITEMS.map((item) => ({ ...item }))
  ));
  const [customerPayments, setCustomerPayments] = useState(() => (
    order?.saranjam?.customerPayments?.length
      ? order.saranjam.customerPayments
      : MOCK_CUSTOMER_PAYMENTS.map((p) => ({ ...p }))
  ));

  // واریزی‌های ثبت‌شده از فعالیت «دریافت وجه» + پرداخت‌های سرانجام
  const mergedCustomerPayments = useMemo(() => {
    const byId = new Map();
    customerPayments.forEach((pay) => byId.set(pay.id, pay));
    (order?.saranjam?.customerPayments || []).forEach((pay) => {
      if (pay?.sourceActivityId) byId.set(pay.id, pay);
    });
    listCrmPaymentsAsCustomerPayments(order).forEach((pay) => {
      byId.set(pay.id, pay);
    });
    return Array.from(byId.values());
  }, [customerPayments, order]);

  useEffect(() => {
    const fromOrder = order?.saranjam?.customerPayments;
    if (!Array.isArray(fromOrder) || !fromOrder.length) return;
    setCustomerPayments((prev) => {
      const manual = prev.filter((pay) => !pay.sourceActivityId);
      const byId = new Map();
      manual.forEach((pay) => byId.set(pay.id, pay));
      fromOrder.forEach((pay) => byId.set(pay.id, pay));
      return Array.from(byId.values());
    });
  }, [order?.saranjam?.customerPayments]);
  const [supplierPayments, setSupplierPayments] = useState(() => (
    order?.saranjam?.supplierPayments?.length
      ? order.saranjam.supplierPayments
      : MOCK_SUPPLIER_PAYMENTS.map((p) => ({ ...p }))
  ));
  const [salesInvoiceIssued, setSalesInvoiceIssued] = useState(
    Boolean(order?.saranjam?.salesInvoiceIssued),
  );
  const [salesInvoiceSnapshot, setSalesInvoiceSnapshot] = useState(
    () => order?.saranjam?.salesInvoiceSnapshot || null,
  );
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleModalMode, setSaleModalMode] = useState('issue');
  const [draftItems, setDraftItems] = useState([]);
  const [purchaseViewItemId, setPurchaseViewItemId] = useState(null);
  const [archived, setArchived] = useState(
    Boolean(order?.saranjam?.archivedAt || order?.saranjam?.locked),
  );
  const [toast, setToast] = useState('');

  useEffect(() => {
    setArchived(Boolean(order?.saranjam?.archivedAt || order?.saranjam?.locked));
  }, [order?.saranjam?.archivedAt, order?.saranjam?.locked]);

  const orderCode = order?.code ? toDisplayOrderCode(order.code) : 'JR-05-01-09-004';

  const buyer = useMemo(() => {
    const customer = getCustomerById(order?.customerId);
    const primaryPerson = customer?.relatedPersons?.[0];
    return {
      name: order?.customer || customer?.companyName || customer?.personName || 'خریدار نمونه',
      nationalId: customer?.nationalId || '—',
      economicId: customer?.economicId || customer?.nationalId || '—',
      phone: customer?.mobile || customer?.officialSpecs?.phone || '—',
      address: customer?.fullAddress || customer?.officialSpecs?.address || '—',
      postalCode: customer?.officialSpecs?.postalCode || '—',
      registrationNumber: customer?.registrationNumber || '—',
      city: customer?.city || customer?.province || '—',
      province: customer?.province || '—',
      requester: primaryPerson?.name || '—',
    };
  }, [order]);

  const [issuedInvoiceNumber] = useState(
    () => order?.saranjam?.salesInvoiceNumber
      || `SF-${String(order?.code || '14050233').replace(/-/g, '').slice(-8)}`,
  );
  const [issuedInvoiceDate] = useState(
    () => order?.saranjam?.salesInvoiceDate || getTodayJalali(),
  );
  const invoiceNumber = order?.saranjam?.salesInvoiceNumber || issuedInvoiceNumber;
  const issueDate = order?.saranjam?.salesInvoiceDate || issuedInvoiceDate;

  const saleTotalRial = useMemo(
    () => items.reduce((acc, item) => acc + lineEconomics(item).finalTotal, 0),
    [items],
  );
  const issuedInvoiceTotalRial = order?.saranjam?.salesInvoiceTotalRial ?? (
    salesInvoiceSnapshot
      ? salesInvoiceSnapshot.reduce((acc, item) => acc + lineEconomics(item).finalTotal, 0)
      : saleTotalRial
  );
  // صدور مجدد: با تغییر محتوا نسبت به نسخهٔ صادرشده، یا در حالت مدیر برای ویرایش فی/مقدار
  const canReissueSalesInvoice = salesInvoiceIssued && (
    isAdmin || hasSalesInvoiceContentChanged(items, salesInvoiceSnapshot)
  );

  const customerPaid = useMemo(() => sumPayments(mergedCustomerPayments), [mergedCustomerPayments]);
  const customerBalanceRial = saleTotalRial - customerPaid;

  const supplierLedgers = useMemo(
    () => buildSupplierLedgers(items, supplierPayments),
    [items, supplierPayments],
  );

  const purchaseCost = useMemo(
    () => items.reduce((acc, item) => acc + lineEconomics(item).afterDiscount, 0),
    [items],
  );
  const profitRial = Math.max(0, saleTotalRial - purchaseCost);
  const closeDuration = order?.saranjam?.closeDuration || { days: 3, hours: 4 };

  const gates = useMemo(
    () => evaluateSaranjamGates({
      items,
      salesInvoiceIssued,
      customerBalanceRial,
      supplierLedgers,
    }),
    [items, salesInvoiceIssued, customerBalanceRial, supplierLedgers],
  );

  const persist = (patch) => {
    onUpdateOrder?.((current) => ({
      ...current,
      saranjam: {
        ...(current.saranjam || {}),
        items,
        customerPayments: mergedCustomerPayments,
        supplierPayments,
        salesInvoiceIssued,
        ...patch,
      },
    }));
  };

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const handlePurchaseFile = async (itemId, file) => {
    if (!file) return;
    let dataUrl = '';
    try {
      dataUrl = await readFileAsDataUrl(file);
    } catch {
      showToast('خواندن فایل فاکتور خرید ناموفق بود.');
      return;
    }

    setItems((prev) => {
      const next = prev.map((item) => (
        item.id === itemId
          ? {
            ...item,
            invoiceUploaded: true,
            invoiceFileName: file.name,
            invoiceFileDataUrl: dataUrl,
            invoiceMimeType: file.type || '',
          }
          : item
      ));
      persist({ items: next });
      return next;
    });
    showToast(`فاکتور خرید «${file.name}» ثبت شد.`);
  };

  const purchaseViewItem = useMemo(
    () => items.find((item) => item.id === purchaseViewItemId) || null,
    [items, purchaseViewItemId],
  );

  const handleCustomerReceipt = (file) => {
    if (!file) return;
    const remaining = customerBalanceRial;
    if (remaining <= 0) {
      showToast('مانده مشتری از قبل صفر است.');
      return;
    }
    const payment = {
      id: `cp-${Date.now()}`,
      date: getTodayJalali(),
      amountRial: remaining,
      note: 'فیش واریزی مشتری',
      receiptFileName: file.name,
    };
    const next = [...mergedCustomerPayments, payment];
    setCustomerPayments(next);
    persist({ customerPayments: next });
    showToast(`فیش «${file.name}» ثبت و مانده مشتری صفر شد.`);
  };

  const handleSupplierReceipt = (ledger, file) => {
    if (!file || !ledger || ledger.balanceRial === 0) return;
    const payment = {
      id: `sp-${Date.now()}`,
      supplierId: ledger.supplierId,
      supplier: ledger.supplier,
      date: '۱۴۰۴/۰۱/۱۵',
      amountRial: ledger.balanceRial,
      receiptFileName: file.name,
    };
    const next = [...supplierPayments, payment];
    setSupplierPayments(next);
    persist({ supplierPayments: next });
    showToast(`رسید «${file.name}» برای ${ledger.supplier} ثبت شد.`);
  };

  const openSalesModal = (mode = 'issue') => {
    setDraftItems(items.map((item) => ({ ...item })));
    setSaleModalMode(mode);
    setSaleModalOpen(true);
  };

  const handleDraftChange = (id, key, value) => {
    const numeric = String(value).replace(/[^\d.]/g, '');
    setDraftItems((prev) => prev.map((row) => (
      row.id === id
        ? { ...row, [key]: numeric === '' ? '' : Number(numeric) }
        : row
    )));
  };

  const handleConfirmSalesInvoice = () => {
    const snapshot = draftItems.map((item) => ({ ...item }));
    const total = snapshot.reduce((acc, item) => acc + lineEconomics(item).finalTotal, 0);
    setItems(snapshot);
    setSalesInvoiceSnapshot(snapshot);
    setSalesInvoiceIssued(true);
    setSaleModalOpen(false);
    setSaleModalMode('view');
    persist({
      items: snapshot,
      salesInvoiceIssued: true,
      salesInvoiceNumber: invoiceNumber,
      salesInvoiceDate: issueDate,
      salesInvoiceSnapshot: snapshot,
      salesInvoiceTotalRial: total,
    });
    showToast(
      saleModalMode === 'reissue'
        ? 'فاکتور فروش مجدداً صادر شد.'
        : 'فاکتور فروش صادر و ثبت شد.',
    );
  };

  const handleArchive = () => {
    if (archived) return;
    const confirmed = window.confirm(
      'با تأیید مالی، سفارش بایگانی و تمام بخش‌های عملیاتی قفل می‌شوند. ادامه می‌دهید؟',
    );
    if (!confirmed) return;
    const archivedAt = new Date().toISOString();
    setArchived(true);
    onUpdateOrder?.((current) => ({
      ...current,
      archivedAt,
      saranjam: {
        ...(current.saranjam || {}),
        items,
        customerPayments: mergedCustomerPayments,
        supplierPayments,
        salesInvoiceIssued,
        salesInvoiceSnapshot,
        archivedAt,
        locked: true,
        statusLabel: 'بایگانی‌شده',
      },
    }));
    showToast('تأیید مالی انجام و سفارش بایگانی شد.');
  };

  const settlement = useMemo(() => buildSaranjamSettlementModel({
    ...order,
    saranjam: {
      ...(order?.saranjam || {}),
      items,
      customerPayments: mergedCustomerPayments,
      supplierPayments,
      salesInvoiceIssued,
      salesInvoiceSnapshot,
      archivedAt: archived ? (order?.saranjam?.archivedAt || new Date().toISOString()) : null,
      locked: archived,
    },
  }), [
    order,
    items,
    mergedCustomerPayments,
    supplierPayments,
    salesInvoiceIssued,
    salesInvoiceSnapshot,
    archived,
  ]);

  return (
    <section
      className={`saranjam-tab font-meem${compact ? ' saranjam-tab--compact' : ''}${archived ? ' is-archived' : ''}`}
      dir="rtl"
    >
      <SaranjamSettlementLayout
        settlement={settlement}
        archived={archived}
        locked={archived}
        compact={compact}
        customerFileRef={customerFileRef}
        onArchive={handleArchive}
        onOpenSalesInvoice={() => openSalesModal(
          salesInvoiceIssued || archived ? 'view' : 'issue',
        )}
        onUploadCustomerReceipt={handleCustomerReceipt}
      />

      {!archived && (
        <details className="saranjam-legacy-tools">
          <summary>ابزارهای تکمیلی فاکتور خرید / فروش</summary>
          <div className="saranjam-legacy-tools__body">
            <ul className="saranjam-supply-list">
              {items.map((item) => {
                const done = Boolean(item.invoiceUploaded);
                const canView = Boolean(item.invoiceFileDataUrl);
                return (
                  <li key={item.id} className={`saranjam-supply-row${done ? ' is-done' : ' is-missing'}`}>
                    <div className="saranjam-supply-row__main">
                      {done ? <CheckIcon /> : <span className="saranjam-dot" />}
                      <div>
                        <p className="saranjam-supply-row__name">{item.name}</p>
                        <p className="saranjam-supply-row__meta">تأمین‌کننده: {item.supplier}</p>
                      </div>
                    </div>
                    <div className="saranjam-supply-row__actions">
                      <input
                        ref={(el) => { purchaseFileRefs.current[item.id] = el; }}
                        type="file"
                        accept="image/*,.pdf"
                        className="saranjam-file-input"
                        onChange={(e) => {
                          handlePurchaseFile(item.id, e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        className="saranjam-btn saranjam-btn--flat"
                        onClick={() => purchaseFileRefs.current[item.id]?.click()}
                      >
                        <UploadIcon />
                        {done ? 'جایگزینی فاکتور خرید' : 'آپلود فاکتور خرید'}
                      </button>
                      {done && (
                        <button
                          type="button"
                          className="saranjam-btn saranjam-btn--solid"
                          onClick={() => {
                            if (!canView) {
                              showToast('برای مشاهده، یک‌بار دیگر فاکتور را آپلود کنید.');
                              purchaseFileRefs.current[item.id]?.click();
                              return;
                            }
                            setPurchaseViewItemId(item.id);
                          }}
                        >
                          مشاهده
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <label className="saranjam-tab__admin-toggle" style={{ marginTop: '0.75rem' }}>
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
              />
              <span>حالت مدیر (ویرایش فی/مقدار در فاکتور فروش)</span>
            </label>
          </div>
        </details>
      )}

      <TaxInvoiceModal
        open={saleModalOpen}
        mode={saleModalMode}
        onClose={() => setSaleModalOpen(false)}
        onConfirm={handleConfirmSalesInvoice}
        isAdmin={isAdmin && !archived}
        draftItems={draftItems}
        onChangeDraft={handleDraftChange}
        orderCode={orderCode}
        buyer={buyer}
        invoiceNumber={invoiceNumber}
        issueDate={issueDate}
      />

      <PurchaseInvoiceModal
        open={Boolean(purchaseViewItem)}
        item={purchaseViewItem}
        onClose={() => setPurchaseViewItemId(null)}
      />

      {toast && <div className="saranjam-toast" role="status">{toast}</div>}
    </section>
  );
}
