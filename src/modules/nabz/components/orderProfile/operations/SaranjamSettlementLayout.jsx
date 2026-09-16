import { useRef } from 'react';
import { formatJarianMoney } from '../../../../../config/JarianUI.config';
import { JarianProductCell } from '../../../../../components/jarian/JarianPresentation';

function formatWeightTons(kg) {
  const tons = (Number(kg) || 0) / 1000;
  if (!Number.isFinite(tons)) return '—';
  return `${tons.toLocaleString('fa-IR', { maximumFractionDigits: 3 })} تن`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪`;
}

/**
 * رنگ حاشیه سود خالص (استاندارد صنعت فولاد):
 *  < ۲٪  → قرمز (هشدار)
 *  ۲–۵٪ → خاکستری/زرد (عادی)
 *  > ۵٪  → سبز (عالی)
 */
function marginTier(percent) {
  if (!Number.isFinite(percent) || percent < 2) return 'warning';
  if (percent <= 5) return 'normal';
  return 'excellent';
}

function DiscrepancyBanner({ discrepancy }) {
  if (!discrepancy?.hasAny) return null;

  const critical = discrepancy.severity === 'critical';
  const messages = [];

  if (discrepancy.hasWeightDiscrepancy) {
    messages.push(
      `مغایرت وزن بین فاکتور و باسکول — حداکثر انحراف ${formatPercent(discrepancy.maxWeightVariancePercent)}`,
    );
  }
  if (discrepancy.hasNegativeCustomerBalance) {
    messages.push('تراز مشتری منفی است (اضافه‌دریافت / مغایرت مالی)');
  }
  if (discrepancy.hasNegativeSupplierBalance) {
    messages.push('تراز یک یا چند تأمین‌کننده منفی است (اضافه‌پرداخت)');
  }
  if (discrepancy.hasNegativeProfit) {
    messages.push('سود خالص این سفارش منفی است (زیان)');
  }

  return (
    <div
      className={`saranjam-alert saranjam-alert--${critical ? 'critical' : 'warning'}`}
      role="alert"
    >
      <span className="saranjam-alert__icon" aria-hidden="true">
        {critical ? '⛔' : '⚠️'}
      </span>
      <div className="saranjam-alert__body">
        <strong className="saranjam-alert__title">
          {critical ? 'مغایرت بحرانی پیش از بایگانی' : 'هشدار مغایرت وزن'}
        </strong>
        <ul className="saranjam-alert__list">
          {messages.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      </div>
      {discrepancy.hasWeightDiscrepancy ? (
        <span className="saranjam-alert__variance font-vazir" aria-label="درصد انحراف وزن">
          {formatPercent(discrepancy.maxWeightVariancePercent)}
        </span>
      ) : null}
    </div>
  );
}

function AttachmentsSection({ attachments, onUploadAttachment, locked }) {
  const fileRef = useRef(null);
  const pendingKeyRef = useRef(null);

  const triggerUpload = (key) => {
    if (locked) return;
    pendingKeyRef.current = key;
    fileRef.current?.click();
  };

  return (
    <section className="saranjam-attach" aria-label="مدارک پیوست">
      <header className="saranjam-attach__head">
        <h3 className="saranjam-attach__title">مدارک پیوست</h3>
      </header>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf"
        className="saranjam-file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const key = pendingKeyRef.current;
          if (file && key) onUploadAttachment?.(key, file);
          pendingKeyRef.current = null;
          e.target.value = '';
        }}
      />
      <div className="saranjam-attach__chips">
        {attachments.map((att) => (
          <div
            key={att.key}
            className={`saranjam-attach__chip${att.uploaded ? ' is-uploaded' : ' is-pending'}`}
          >
            <span className="saranjam-attach__chip-icon" aria-hidden="true">
              {att.uploaded ? '✅' : '⏳'}
            </span>
            <span className="saranjam-attach__chip-label">{att.label}</span>
            <span className="saranjam-attach__chip-status">
              {att.uploaded ? 'بارگذاری‌شده' : 'در انتظار'}
            </span>
            {!att.uploaded && !locked ? (
              <button
                type="button"
                className="saranjam-attach__upload"
                onClick={() => triggerUpload(att.key)}
              >
                آپلود
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SaranjamSettlementLayout({
  settlement,
  discrepancy,
  attachments = [],
  archived,
  locked,
  onArchive,
  onOpenSalesInvoice,
  onUploadCustomerReceipt,
  onUploadAttachment,
  onExportPdf,
  onExportExcel,
  customerFileRef,
  compact = false,
}) {
  const { kpis, suppliers, customerLedger } = settlement;
  const orderBalanceRial = customerLedger.orderBalanceRial;
  const balanceNegative = Number(orderBalanceRial) < 0;
  const tier = marginTier(kpis.profitPercent);

  return (
    <div className={`saranjam-settle font-meem${compact ? ' saranjam-settle--compact' : ''}${locked ? ' is-locked' : ''}`}>
      <header className="saranjam-settle__head">
        <div>
          <h2 className="saranjam-settle__title">سرانجام — تسویه مالی و بایگانی</h2>
          <p className="saranjam-settle__subtitle">
            تطبیق وزن باسکول، اسناد خرید، هزینه‌های بارگیری و مانده مشتری / تأمین‌کننده
          </p>
        </div>
        {archived ? (
          <span className="saranjam-settle__archived-pill" aria-label="بایگانی‌شده">
            🔒 بایگانی‌شده
          </span>
        ) : null}
      </header>

      {/* 1. Conditional critical alert banner */}
      <DiscrepancyBanner discrepancy={discrepancy} />

      {/* 2. KPI cards — RTL order (right→left): سود خالص، فروش، خرید، لجستیک */}
      <section className="saranjam-kpi" aria-label="شاخص‌های مالی سفارش">
        <article className={`saranjam-kpi__card saranjam-kpi__card--profit is-${tier}`}>
          <span className="saranjam-kpi__label">سود خالص سفارش</span>
          <strong className="saranjam-kpi__value font-vazir">
            {formatJarianMoney(kpis.netProfitRial, { withCurrency: true })}
          </strong>
          <span className={`saranjam-kpi__margin font-vazir is-${tier}`}>
            حاشیه:
            {' '}
            {formatPercent(kpis.profitPercent)}
          </span>
        </article>
        <article className="saranjam-kpi__card">
          <span className="saranjam-kpi__label">مبلغ فروش نهایی</span>
          <strong className="saranjam-kpi__value font-vazir">
            {formatJarianMoney(kpis.finalSalesAmountRial, { withCurrency: true })}
          </strong>
          <span className="saranjam-kpi__hint">بر اساس وزن دقیق باسکول</span>
        </article>
        <article className="saranjam-kpi__card">
          <span className="saranjam-kpi__label">جمع مبلغ خرید</span>
          <strong className="saranjam-kpi__value font-vazir">
            {formatJarianMoney(kpis.totalPurchaseAmountRial, { withCurrency: true })}
          </strong>
          <span className="saranjam-kpi__hint">مجموع فاکتورهای تأمین‌کنندگان</span>
        </article>
        <article className="saranjam-kpi__card">
          <span className="saranjam-kpi__label">هزینه لجستیک و بارگیری</span>
          <strong className="saranjam-kpi__value font-vazir">
            {formatJarianMoney(kpis.logisticsCostRial, { withCurrency: true })}
          </strong>
          <span className="saranjam-kpi__hint">باسکول + کرایه / بارگیری</span>
        </article>
      </section>

      {/* تراز این سفارش — منفی = قرمز + ⚠️ */}
      <div className={`saranjam-balance${balanceNegative ? ' is-negative' : ''}`}>
        <span className="saranjam-balance__label">
          {balanceNegative ? '⚠️ ' : ''}
          تراز این سفارش
        </span>
        <strong className="saranjam-balance__value font-vazir">
          {formatJarianMoney(orderBalanceRial, { withCurrency: true })}
        </strong>
      </div>

      {/* 3. Parallel ledgers AR (customer) & AP (suppliers) — 50/50, no horizontal scroll */}
      <section className="saranjam-dual" aria-label="دفتر دوگانه تسویه">
        <article className="saranjam-ledger-card">
          <header className="saranjam-ledger-card__head">
            <h3 className="saranjam-ledger-card__title">تأمین‌کنندگان (حساب‌های پرداختنی)</h3>
            <span className="saranjam-ledger-card__badge">AP</span>
          </header>
          <div className="saranjam-ledger-card__table-wrap">
            <table className="jarian-table saranjam-ledger-table saranjam-ledger-table--ap">
              <thead>
                <tr>
                  <th scope="col">ردیف</th>
                  <th scope="col">تأمین‌کننده</th>
                  <th scope="col">وزن فاکتور</th>
                  <th scope="col">وزن باسکول</th>
                  <th scope="col">مبلغ خرید</th>
                  <th scope="col">مانده</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="saranjam-ledger-table__empty">قلم خریدشده‌ای ثبت نشده است.</td>
                  </tr>
                ) : (
                  suppliers.map((row, index) => {
                    const rowNegative = Number(row.balanceRial) < 0;
                    return (
                      <tr key={row.supplierKey} className={rowNegative ? 'saranjam-row--anomaly' : undefined}>
                        <td className="font-vazir">{(index + 1).toLocaleString('fa-IR')}</td>
                        <td>
                          <div className="saranjam-ledger-table__supplier">
                            <strong className="font-meem">{row.supplierName}</strong>
                            {row.hasWeightVarianceWarning ? (
                              <span className="saranjam-variance-tag">مغایرت وزن &gt; ۰٫۵٪</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="font-vazir">{formatWeightTons(row.invoicedWeightKg)}</td>
                        <td className="font-vazir">{formatWeightTons(row.deliveredWeightKg)}</td>
                        <td className="font-vazir">{formatJarianMoney(row.totalCostRial)}</td>
                        <td className={`font-vazir${rowNegative ? ' saranjam-cell--negative' : ''}`}>
                          {formatJarianMoney(row.balanceRial, { withCurrency: true })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="saranjam-ledger-card">
          <header className="saranjam-ledger-card__head">
            <h3 className="saranjam-ledger-card__title">مشتری (حساب‌های دریافتنی)</h3>
            <div className="saranjam-ledger-card__head-actions">
              <button
                type="button"
                className="saranjam-settle-link"
                onClick={onOpenSalesInvoice}
                disabled={locked}
              >
                فاکتور فروش
              </button>
              <span className="saranjam-ledger-card__badge">AR</span>
            </div>
          </header>

          <div className="saranjam-ledger-card__table-wrap">
            <table className="jarian-table saranjam-ledger-table saranjam-ledger-table--ar">
              <thead>
                <tr>
                  <th scope="col">ردیف</th>
                  <th scope="col">قلم</th>
                  <th scope="col">فی توافقی</th>
                  <th scope="col">وزن باسکول</th>
                  <th scope="col">جمع ردیف</th>
                </tr>
              </thead>
              <tbody>
                {customerLedger.lines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="saranjam-ledger-table__empty">ردیف فروشی برای نمایش نیست.</td>
                  </tr>
                ) : (
                  customerLedger.lines.map((line, index) => (
                    <tr key={line.id}>
                      <td className="font-vazir">{(index + 1).toLocaleString('fa-IR')}</td>
                      <td className="jarian-td-product">
                        <JarianProductCell name={line.name} description={line.description} />
                      </td>
                      <td className="font-vazir">{formatJarianMoney(line.agreedRateRial)}</td>
                      <td className="font-vazir">
                        {line.scaleWeightKg != null
                          ? formatWeightTons(line.scaleWeightKg)
                          : '—'}
                      </td>
                      <td className="font-vazir">{formatJarianMoney(line.saleLineTotalRial)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="saranjam-ar-block">
            <div className="saranjam-ar-block__head">
              <h4 className="saranjam-ar-block__title">واریزی / پیش‌پرداخت مشتری</h4>
              <input
                ref={customerFileRef}
                type="file"
                accept="image/*,.pdf"
                className="saranjam-file-input"
                onChange={(e) => {
                  onUploadCustomerReceipt?.(e.target.files?.[0]);
                  e.target.value = '';
                }}
                disabled={locked}
              />
              <button
                type="button"
                className="saranjam-settle-link"
                disabled={locked || settlement.gates.customerBalanceZero}
                onClick={() => customerFileRef?.current?.click()}
              >
                آپلود فیش
              </button>
            </div>
            <ul className="saranjam-ar-payments">
              {customerLedger.payments.length === 0 ? (
                <li className="saranjam-ar-payments__empty">پرداختی ثبت نشده است.</li>
              ) : (
                [...customerLedger.payments]
                  .sort((a, b) => String(a.date).localeCompare(String(b.date), 'fa'))
                  .map((pay) => (
                    <li key={pay.id} className="saranjam-ar-payments__row">
                      <span className="font-vazir">{pay.date}</span>
                      <span className="font-meem">
                        {pay.note || 'واریزی'}
                        {pay.sourceActivityId ? ' · دریافت وجه' : ''}
                      </span>
                      <strong className="font-vazir">{formatJarianMoney(pay.amountRial)}</strong>
                    </li>
                  ))
              )}
            </ul>
            <div className="saranjam-ar-balances">
              <div>
                <span>تراز این سفارش</span>
                <strong className={`font-vazir${balanceNegative ? ' saranjam-cell--negative' : ''}`}>
                  {balanceNegative ? '⚠️ ' : ''}
                  {formatJarianMoney(orderBalanceRial, { withCurrency: true })}
                </strong>
              </div>
              <div>
                <span>مانده کل حساب در کانون</span>
                <strong className="font-vazir">
                  {formatJarianMoney(customerLedger.kanoonAccountBalanceRial, { withCurrency: true })}
                </strong>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* 4. Attachments */}
      <AttachmentsSection
        attachments={attachments}
        onUploadAttachment={onUploadAttachment}
        locked={locked}
      />

      {/* 5. Action footer — exports (right) + final approval & archive (left) */}
      <footer className="saranjam-actionbar">
        <div className="saranjam-actionbar__exports">
          <button
            type="button"
            className="saranjam-btn saranjam-btn--flat"
            onClick={onExportPdf}
          >
            چاپ PDF
          </button>
          <button
            type="button"
            className="saranjam-btn saranjam-btn--flat"
            onClick={onExportExcel}
          >
            خروجی Excel
          </button>
        </div>
        <button
          type="button"
          className={`saranjam-archive-engine__btn saranjam-archive-engine__btn--glossy${archived ? ' is-done' : ''}`}
          disabled={archived}
          onClick={onArchive}
        >
          {archived ? 'سفارش بایگانی شد' : 'تأیید نهایی و بایگانی'}
        </button>
      </footer>
    </div>
  );
}
