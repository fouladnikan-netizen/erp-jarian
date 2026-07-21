import { useMemo, useRef, useState } from 'react';
import logo from '../../../../../assets/images/nikan2.jpg';
import { COMPANY_BRAND, PROFORMA_BANK_ACCOUNTS } from '../../../proformaConfig';
import { formatAmountRial, toDisplayOrderCode } from '../../../orderCode';
import { getCustomerById } from '../../../customers';
import { getTodayJalali } from '../../../dateUtils';
import { printTaxInvoice } from './printTaxInvoice';
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
              <span className="font-yekan">{fileName}</span>
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
            <span className="font-yekan">{nationalId || '—'}</span>
          </p>
          <p className="font-meem">
            <span className="saranjam-taxdoc__k">شماره اقتصادی:</span>
            {' '}
            <span className="font-yekan">{economicId || '—'}</span>
          </p>
          <p className="font-meem">
            <span className="saranjam-taxdoc__k">کد پستی:</span>
            {' '}
            <span className="font-yekan">{postalCode || '—'}</span>
          </p>
          <p className="font-meem">
            <span className="saranjam-taxdoc__k">شماره ثبت:</span>
            {' '}
            <span className="font-yekan">{registrationNumber || '—'}</span>
          </p>
          <p className="font-meem">
            <span className="saranjam-taxdoc__k">تلفن:</span>
            {' '}
            <span className="font-yekan">{phone || '—'}</span>
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
            {isViewMode ? 'مشاهده فاکتور فروش رسمی' : 'صدور فاکتور فروش رسمی'}
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
                <span className="font-yekan">{invoiceNumber}</span>
              </p>
              <p className="font-meem">
                تاریخ:
                {' '}
                <span className="font-yekan">{issueDate}</span>
              </p>
              <p className="font-meem">
                سفارش:
                {' '}
                <span className="font-yekan">{orderCode}</span>
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
                      <td><span className="font-yekan">{(index + 1).toLocaleString('fa-IR')}</span></td>
                      <td><span className="font-yekan">{row.code || ''}</span></td>
                      <td className="saranjam-taxdoc__desc font-meem">{row.name}</td>
                      <td>
                        {canEdit ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            className="saranjam-taxdoc__input font-yekan"
                            value={row.qty}
                            onChange={(e) => onChangeDraft(row.id, 'qty', e.target.value)}
                          />
                        ) : (
                          <span className="font-yekan">{toNumber(row.qty).toLocaleString('fa-IR')}</span>
                        )}
                      </td>
                      <td className="font-meem">{row.unit}</td>
                      <td>
                        {canEdit ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            className="saranjam-taxdoc__input font-yekan"
                            value={row.unitPriceRial}
                            onChange={(e) => onChangeDraft(row.id, 'unitPriceRial', e.target.value)}
                          />
                        ) : (
                          <span className="font-yekan">{formatAmountRial(row.unitPriceRial)}</span>
                        )}
                      </td>
                      <td><span className="font-yekan">{formatAmountRial(econ.subtotal)}</span></td>
                      <td><span className="font-yekan">{formatAmountRial(econ.discount)}</span></td>
                      <td><span className="font-yekan">{formatAmountRial(econ.afterDiscount)}</span></td>
                      <td><span className="font-yekan">{formatAmountRial(econ.vat)}</span></td>
                      <td><span className="font-yekan">{formatAmountRial(econ.finalTotal)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="saranjam-taxdoc__sum-row">
                  <td colSpan={7} className="font-meem saranjam-taxdoc__sum-label">جمع کل</td>
                  <td><span className="font-yekan">{formatAmountRial(totals.discount)}</span></td>
                  <td><span className="font-yekan">{formatAmountRial(totals.afterDiscount)}</span></td>
                  <td><span className="font-yekan">{formatAmountRial(totals.vat)}</span></td>
                  <td><span className="font-yekan">{formatAmountRial(totals.finalTotal)}</span></td>
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
                <span className="font-yekan">{primaryBank.account}</span>
                {' | شبا: '}
                <span className="font-yekan">{primaryBank.sheba}</span>
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
              تأیید و صدور
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
  const [supplierPayments, setSupplierPayments] = useState(() => (
    order?.saranjam?.supplierPayments?.length
      ? order.saranjam.supplierPayments
      : MOCK_SUPPLIER_PAYMENTS.map((p) => ({ ...p }))
  ));
  const [salesInvoiceIssued, setSalesInvoiceIssued] = useState(
    Boolean(order?.saranjam?.salesInvoiceIssued),
  );
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleModalMode, setSaleModalMode] = useState('issue');
  const [draftItems, setDraftItems] = useState([]);
  const [purchaseViewItemId, setPurchaseViewItemId] = useState(null);
  const [archived, setArchived] = useState(Boolean(order?.saranjam?.archivedAt));
  const [toast, setToast] = useState('');

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
  const customerPaid = useMemo(() => sumPayments(customerPayments), [customerPayments]);
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
        customerPayments,
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
      date: '۱۴۰۴/۰۱/۱۵',
      amountRial: remaining,
      note: 'فیش واریزی مشتری',
      receiptFileName: file.name,
    };
    const next = [...customerPayments, payment];
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
    setItems(draftItems);
    setSalesInvoiceIssued(true);
    setSaleModalOpen(false);
    setSaleModalMode('view');
    persist({
      items: draftItems,
      salesInvoiceIssued: true,
      salesInvoiceNumber: invoiceNumber,
      salesInvoiceDate: issueDate,
    });
    showToast('فاکتور فروش رسمی صادر و ثبت شد.');
  };

  const handleArchive = () => {
    if (!gates.canArchive || archived) return;
    setArchived(true);
    persist({ archivedAt: new Date().toISOString() });
    showToast('سفارش ختم و بایگانی شد.');
  };

  const sortedCustomerPayments = useMemo(
    () => [...customerPayments].sort((a, b) => String(a.date).localeCompare(String(b.date), 'fa')),
    [customerPayments],
  );

  return (
    <section
      className={`saranjam-tab font-meem${compact ? ' saranjam-tab--compact' : ''}`}
      dir="rtl"
    >
      <header className="saranjam-tab__head">
        <div>
          <h2 className="saranjam-tab__title">سرانجام — تسویه و بایگانی</h2>
          <p className="saranjam-tab__subtitle">
            آپلود فاکتورها و فیش‌ها، صدور صورتحساب رسمی، و صفر کردن مانده‌ها پیش از ختم سفارش
          </p>
          <p className="saranjam-tab__order-id">
            شماره سفارش:
            {' '}
            <span className="font-yekan saranjam-tab__order-id-value">{orderCode}</span>
          </p>
        </div>

        <div className="saranjam-tab__head-aside">
          <label className="saranjam-tab__admin-toggle">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
            />
            <span>حالت مدیر (ویرایش فی/مقدار در فاکتور)</span>
          </label>
          <div className="saranjam-tab__badges">
            {!gates.allPurchaseInvoicesUploaded && (
              <span className="saranjam-badge saranjam-badge--warn">فاکتور خرید ناقص</span>
            )}
            {!gates.salesInvoiceIssued && (
              <span className="saranjam-badge saranjam-badge--warn">فاکتور فروش صادر نشده</span>
            )}
            {!gates.customerBalanceZero && (
              <span className="saranjam-badge saranjam-badge--danger">
                مانده مشتری:
                {' '}
                <span className="font-yekan">{formatAmountRial(customerBalanceRial)}</span>
              </span>
            )}
            {!gates.allSupplierBalancesZero && (
              <span className="saranjam-badge saranjam-badge--danger">مانده تأمین‌کننده باز</span>
            )}
          </div>
        </div>
      </header>

      <div className="saranjam-tab__body">
        {/* A. Purchase invoices */}
        <section className="saranjam-card" aria-labelledby="saranjam-supply-title">
          <h3 id="saranjam-supply-title" className="saranjam-card__title">پازل تأمین — فاکتورهای خرید</h3>
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
                      <p className="saranjam-supply-row__meta">
                        تأمین‌کننده: {item.supplier}
                        {' · '}
                        مقدار: <span className="font-yekan">{toNumber(item.qty).toLocaleString('fa-IR')}</span> {item.unit}
                      </p>
                      {item.invoiceFileName && (
                        <p className="saranjam-file-name font-yekan">{item.invoiceFileName}</p>
                      )}
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
                    {done ? (
                      <>
                        <span className="saranjam-status-ok">بارگذاری شده</span>
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
                          مشاهده و چاپ فاکتور
                        </button>
                        <button
                          type="button"
                          className="saranjam-btn saranjam-btn--flat"
                          onClick={() => purchaseFileRefs.current[item.id]?.click()}
                        >
                          <UploadIcon />
                          جایگزینی فایل
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="saranjam-btn saranjam-btn--flat"
                        onClick={() => purchaseFileRefs.current[item.id]?.click()}
                      >
                        <UploadIcon />
                        آپلود فاکتور خرید
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* B. Sales invoice */}
        <section className="saranjam-card" aria-labelledby="saranjam-sales-title">
          <h3 id="saranjam-sales-title" className="saranjam-card__title">خروجی رسمی — فاکتور فروش</h3>
          {salesInvoiceIssued ? (
            <div className="saranjam-sales-done">
              <div className="saranjam-sales-done__status">
                <CheckIcon />
                <div className="saranjam-sales-done__meta">
                  <span className="saranjam-badge saranjam-badge--ok">فاکتور فروش رسمی صادر و ثبت شد</span>
                  <p className="saranjam-sales-done__refs font-meem">
                    شماره:
                    {' '}
                    <span className="font-yekan">{invoiceNumber}</span>
                    {' · '}
                    تاریخ:
                    {' '}
                    <span className="font-yekan">{issueDate}</span>
                  </p>
                </div>
              </div>
              <div className="saranjam-sales-done__actions">
                <button
                  type="button"
                  className="saranjam-btn saranjam-btn--solid"
                  onClick={() => openSalesModal('view')}
                >
                  مشاهده و چاپ فاکتور
                </button>
              </div>
            </div>
          ) : (
            <div className="saranjam-sales-pending">
              <p>صورتحساب رسمی هنوز صادر نشده است.</p>
              <button type="button" className="saranjam-btn saranjam-btn--flat" onClick={() => openSalesModal('issue')}>
                صدور فاکتور فروش
              </button>
            </div>
          )}
        </section>

        {/* C. Dual ledgers — RTL: first = right = customer */}
        <section className="saranjam-ledgers" aria-label="ترازوی مالی دوگانه">
          <div className={`saranjam-card saranjam-ledger${gates.customerBalanceZero ? ' is-zero' : ''}`}>
            <div className="saranjam-ledger__head">
              <h3 className="saranjam-card__title">تسویه مشتری</h3>
              <input
                ref={customerFileRef}
                type="file"
                accept="image/*,.pdf"
                className="saranjam-file-input"
                onChange={(e) => {
                  handleCustomerReceipt(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                className="saranjam-btn saranjam-btn--flat"
                disabled={gates.customerBalanceZero}
                onClick={() => customerFileRef.current?.click()}
              >
                <UploadIcon />
                آپلود فیش واریزی
              </button>
            </div>
            <ul className="saranjam-pay-list">
              {sortedCustomerPayments.map((pay) => (
                <li key={pay.id} className="saranjam-pay-row">
                  <span className="font-yekan">{pay.date}</span>
                  <span className="font-meem">{pay.note || '—'}</span>
                  <span className="font-yekan">{formatAmountRial(pay.amountRial)}</span>
                  {pay.receiptFileName && (
                    <span className="saranjam-file-name font-yekan">{pay.receiptFileName}</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="saranjam-ledger__foot">
              <span className="font-meem">مانده مشتری</span>
              <strong className="font-yekan">{formatAmountRial(customerBalanceRial)} ریال</strong>
            </div>
          </div>

          <div className={`saranjam-card saranjam-ledger${gates.allSupplierBalancesZero ? ' is-zero' : ''}`}>
            <h3 className="saranjam-card__title">تسویه تأمین‌کنندگان</h3>
            <div className="saranjam-supplier-blocks">
              {supplierLedgers.map((ledger) => (
                <div key={ledger.supplierId} className="saranjam-supplier-block">
                  <div className="saranjam-supplier-block__head">
                    <strong className="font-meem">{ledger.supplier}</strong>
                    <span className="font-yekan">مانده: {formatAmountRial(ledger.balanceRial)}</span>
                  </div>
                  <ul className="saranjam-pay-list">
                    {ledger.payments.length === 0 ? (
                      <li className="saranjam-pay-row saranjam-pay-row--empty">پرداختی ثبت نشده</li>
                    ) : (
                      [...ledger.payments]
                        .sort((a, b) => String(a.date).localeCompare(String(b.date), 'fa'))
                        .map((pay) => (
                          <li key={pay.id} className="saranjam-pay-row">
                            <span className="font-yekan">{pay.date}</span>
                            <span className="font-yekan">{formatAmountRial(pay.amountRial)}</span>
                            {pay.receiptFileName && (
                              <span className="saranjam-file-name font-yekan">{pay.receiptFileName}</span>
                            )}
                          </li>
                        ))
                    )}
                  </ul>
                  <input
                    ref={(el) => { supplierFileRefs.current[ledger.supplierId] = el; }}
                    type="file"
                    accept="image/*,.pdf"
                    className="saranjam-file-input"
                    onChange={(e) => {
                      handleSupplierReceipt(ledger, e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    className="saranjam-btn saranjam-btn--flat"
                    disabled={ledger.balanceRial === 0}
                    onClick={() => supplierFileRefs.current[ledger.supplierId]?.click()}
                  >
                    <UploadIcon />
                    آپلود رسید پرداخت
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* D. Post-mortem */}
        <section className="saranjam-card saranjam-postmortem" aria-labelledby="saranjam-postmortem-title">
          <h3 id="saranjam-postmortem-title" className="saranjam-card__title">کارنامه سفارش</h3>
          <div className="saranjam-postmortem__grid">
            <div className="saranjam-postmortem__cell">
              <span className="font-meem">زمان بسته‌شدن سفارش</span>
              <strong className="font-yekan">
                {closeDuration.days.toLocaleString('fa-IR')} روز، {closeDuration.hours.toLocaleString('fa-IR')} ساعت
              </strong>
            </div>
            <div className="saranjam-postmortem__cell">
              <span className="font-meem">سود خالص سفارش</span>
              <strong className="font-yekan saranjam-postmortem__profit">
                {formatAmountRial(profitRial)} ﷼
              </strong>
            </div>
          </div>
        </section>
      </div>

      {/* E. Hard gate */}
      <footer className="saranjam-tab__footer">
        {!gates.canArchive && !archived && (
          <p className="saranjam-tab__gate-hint" role="status">
            ختم سفارش فقط پس از آپلود همه فاکتورهای خرید، صدور فاکتور فروش، و صفر بودن مانده مشتری و تأمین‌کنندگان فعال می‌شود.
          </p>
        )}
        {archived && (
          <p className="saranjam-tab__archived" role="status">این سفارش بایگانی شده است.</p>
        )}
        <button
          type="button"
          className={`saranjam-archive-btn${gates.canArchive && !archived ? ' is-active' : ''}`}
          disabled={!gates.canArchive || archived}
          onClick={handleArchive}
        >
          {archived ? 'سفارش بایگانی شد' : 'ختم سفارش و بایگانی'}
        </button>
      </footer>

      <TaxInvoiceModal
        open={saleModalOpen}
        mode={saleModalMode}
        onClose={() => setSaleModalOpen(false)}
        onConfirm={handleConfirmSalesInvoice}
        isAdmin={isAdmin}
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
