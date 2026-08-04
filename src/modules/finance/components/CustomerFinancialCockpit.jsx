import {
  formatRial,
  getCustomerFinancialSummary,
} from '../customerFinancialProjection';
import '../../kanoon/customerProfile.css';

/**
 * Finance ownership surface for Company financial cockpit summary.
 * CustomerProfilePage must only compose this component — not own balance /
 * credit calculation rules.
 */

function icon(path, size = 14) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {path}
    </svg>
  );
}

const WalletIcon = () => icon(<><rect x="2" y="6" width="20" height="14" rx="3" /><path d="M16 13h.01M2 10h20" /></>);

/**
 * @param {{ company: object }} props
 */
export default function CustomerFinancialCockpit({ company }) {
  const summary = getCustomerFinancialSummary(company);
  const {
    balanceRial,
    creditLimitRial,
    creditStatus,
    metrics,
  } = summary;

  const isDebtor = creditStatus === 'debtor';
  const usage = metrics.creditUsageRatio;

  return (
    <section className="kprofile-glass kprofile-side-card" aria-label="وضعیت مالی">
      <h3 className="kprofile-side-card__title font-meem">
        <WalletIcon />
        {' '}
        کابین مالی
      </h3>

      {metrics.isCustomer ? (
        <>
          <div className="kprofile-fin__row">
            <span className="kprofile-fin__label font-meem">سقف اعتبار</span>
            <span className="kprofile-fin__value font-yekan">
              {creditLimitRial != null ? formatRial(creditLimitRial) : '—'}
            </span>
          </div>
          <div className="kprofile-fin__row">
            <span className="kprofile-fin__label font-meem">مانده حساب</span>
            <span className={`kprofile-fin__value font-yekan ${isDebtor ? 'kprofile-fin__value--debit' : 'kprofile-fin__value--credit'}`}>
              {formatRial(balanceRial)}
            </span>
          </div>
          <div className="kprofile-fin__row">
            <span className="kprofile-fin__label font-meem">وضعیت</span>
            <span className={`kprofile-fin__status font-meem ${isDebtor ? 'kprofile-fin__status--debit' : 'kprofile-fin__status--credit'}`}>
              {isDebtor ? 'بدهکار' : 'بستانکار / تسویه'}
            </span>
          </div>
          <div className="kprofile-fin__row">
            <span className="kprofile-fin__label font-meem">فروش کل</span>
            <span className="kprofile-fin__value font-yekan">{metrics.totalSales}</span>
          </div>
          {usage != null && (
            <>
              <div
                className="kprofile-fin__bar"
                role="img"
                aria-label={`مصرف اعتبار ${Math.round(usage * 100).toLocaleString('fa-IR')} درصد`}
              >
                <div className="kprofile-fin__bar-fill" style={{ width: `${usage * 100}%` }} />
              </div>
              <p className="kprofile-fin__bar-hint font-meem">
                <span className="font-yekan">{`${Math.round(usage * 100).toLocaleString('fa-IR')}٪`}</span>
                {' '}
                از سقف اعتبار مصرف شده
              </p>
            </>
          )}
        </>
      ) : (
        <>
          <div className="kprofile-fin__row">
            <span className="kprofile-fin__label font-meem">خرید کل</span>
            <span className="kprofile-fin__value font-yekan">{metrics.totalPurchaseAmount}</span>
          </div>
          <div className="kprofile-fin__row">
            <span className="kprofile-fin__label font-meem">تعداد خرید</span>
            <span className="kprofile-fin__value font-yekan">
              {Number(metrics.totalPurchases || 0).toLocaleString('fa-IR')}
            </span>
          </div>
          <div className="kprofile-fin__row">
            <span className="kprofile-fin__label font-meem">استعلام‌های ثبت‌شده</span>
            <span className="kprofile-fin__value font-yekan">
              {Number(metrics.totalInquiries || 0).toLocaleString('fa-IR')}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
