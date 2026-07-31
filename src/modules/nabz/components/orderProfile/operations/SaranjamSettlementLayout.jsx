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

export default function SaranjamSettlementLayout({
  settlement,
  archived,
  locked,
  onArchive,
  onOpenSalesInvoice,
  onUploadCustomerReceipt,
  customerFileRef,
  compact = false,
}) {
  const { kpis, suppliers, customerLedger, gates } = settlement;
  const profitPositive = kpis.netProfitRial >= 0;

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

      {/* 1. KPI cards */}
      <section className="saranjam-kpi" aria-label="شاخص‌های مالی سفارش">
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
        <article className={`saranjam-kpi__card saranjam-kpi__card--profit${profitPositive ? ' is-positive' : ' is-negative'}`}>
          <span className="saranjam-kpi__label">سود خالص سفارش</span>
          <strong className="saranjam-kpi__value font-vazir">
            {formatJarianMoney(kpis.netProfitRial, { withCurrency: true })}
          </strong>
          <span className={`saranjam-kpi__margin font-vazir${profitPositive ? ' is-positive' : ' is-negative'}`}>
            حاشیه:
            {' '}
            {formatPercent(kpis.profitPercent)}
          </span>
        </article>
      </section>

      {/* 2. Dual ledger */}
      <section className="saranjam-dual" aria-label="دفتر دوگانه تسویه">
        {/* Right in RTL = first in DOM for suppliers/AP when using direction rtl with grid */}
        <article className="saranjam-ledger-card">
          <header className="saranjam-ledger-card__head">
            <h3 className="saranjam-ledger-card__title">تأمین‌کنندگان (حساب‌های پرداختنی)</h3>
            <span className="saranjam-ledger-card__badge">AP</span>
          </header>
          <div className="saranjam-ledger-card__table-wrap">
            <table className="jarian-table saranjam-ledger-table">
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
                  suppliers.map((row, index) => (
                    <tr key={row.supplierKey}>
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
                      <td className="font-vazir">{formatJarianMoney(row.balanceRial, { withCurrency: true })}</td>
                    </tr>
                  ))
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
            <table className="jarian-table saranjam-ledger-table">
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
                disabled={locked || gates.customerBalanceZero}
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
                <span>مانده این سفارش</span>
                <strong className="font-vazir">
                  {formatJarianMoney(customerLedger.orderBalanceRial, { withCurrency: true })}
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

      {/* 3. Archive engine */}
      <footer className="saranjam-archive-engine">
        {!archived ? (
          <p className="saranjam-archive-engine__hint" role="status">
            با تأیید مالی، سفارش قفل و بایگانی می‌شود؛ تمام فیلدهای پیش‌فاکتور، تدارک و رهسپار فقط‌خواندنی خواهند شد.
          </p>
        ) : (
          <p className="saranjam-archive-engine__hint is-done" role="status">
            این سفارش بایگانی و قفل شده است.
          </p>
        )}
        <button
          type="button"
          className={`saranjam-archive-engine__btn${archived ? ' is-done' : ''}`}
          disabled={archived}
          onClick={onArchive}
        >
          {archived ? 'سفارش بایگانی شد' : 'تأیید مالی و بایگانی سفارش'}
        </button>
      </footer>
    </div>
  );
}
