import logo from '../../../../../assets/images/nikan2.jpg';
import { COMPANY_BRAND } from '../../../proformaConfig';
import { getShippingRecipient } from '../../../shippingService';
import { getTodayJalali, getNowTimeFa } from '../../../dateUtils';
import { toDisplayOrderCode } from '../../../orderCode';
import './PrintableSooratBar.css';

function formatFa(value) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isFinite(num) && String(value).trim() !== '' && !Number.isNaN(num)) {
    return num.toLocaleString('fa-IR');
  }
  return String(value);
}

function buildSerial(orderCode, tripIndex = 1) {
  const tail = String(orderCode || 'JR').replace(/-/g, '').slice(-6);
  const trip = String(tripIndex).padStart(2, '0');
  return `SB-${tail}-${trip}`;
}

/**
 * Print-only Dispatch Note (صورت‌بار خروج).
 * Hidden on screen; visible only under @media print when body has .rahsepar-printing.
 */
export default function PrintableSooratBar({
  order,
  lines = [],
  logistics = {},
  meta = {},
}) {
  const recipient = getShippingRecipient(order || {});
  const buyerName = order?.customer || '—';
  const consigneeName = recipient?.name || '—';
  const orderCode = order?.code ? toDisplayOrderCode(order.code) : (order?.code || '—');
  const serial = meta.serial || buildSerial(order?.code, meta.tripIndex || 1);
  const date = meta.date || getTodayJalali();
  const time = meta.time || getNowTimeFa();

  const {
    driverName = '—',
    licensePlate = '—',
    phone = '—',
    carrierName = '—',
  } = logistics;

  return (
    <article
      className="printable-sooratbar font-meem"
      aria-hidden="true"
      data-print-document="sooratbar"
    >
      {/* 1. Header Zone */}
      <header className="printable-sooratbar__header">
        <div className="printable-sooratbar__brand">
          <img
            src={logo}
            alt={COMPANY_BRAND.name}
            className="printable-sooratbar__logo"
          />
          <div className="printable-sooratbar__brand-text">
            <p className="printable-sooratbar__company font-meem">{COMPANY_BRAND.name}</p>
            <p className="printable-sooratbar__tagline font-meem">{COMPANY_BRAND.tagline}</p>
          </div>
        </div>

        <div className="printable-sooratbar__title-wrap">
          <h1 className="printable-sooratbar__title font-meem">صورت‌بار خروج کالا</h1>
        </div>

        <div className="printable-sooratbar__meta">
          <p>
            <span className="font-meem">شناسه مانیفست:</span>
            {' '}
            <span className="font-yekan">{meta.manifestId || serial}</span>
          </p>
          <p>
            <span className="font-meem">شماره سریال:</span>
            {' '}
            <span className="font-yekan">{serial}</span>
          </p>
          <p>
            <span className="font-meem">تاریخ:</span>
            {' '}
            <span className="font-yekan">{date}</span>
          </p>
          <p>
            <span className="font-meem">ساعت:</span>
            {' '}
            <span className="font-yekan">{time}</span>
          </p>
          <p>
            <span className="font-meem">شماره سفارش:</span>
            {' '}
            <span className="font-yekan">{orderCode}</span>
          </p>
        </div>
      </header>

      {/* 2. Entities & Logistics Zone */}
      <section className="printable-sooratbar__entities" aria-label="اطلاعات طرفین و ناوگان">
        <div className="printable-sooratbar__entity">
          <span className="printable-sooratbar__entity-label font-meem">فرستنده</span>
          <span className="printable-sooratbar__entity-value font-meem">
            شرکت
            {' '}
            {COMPANY_BRAND.name}
          </span>
        </div>
        <div className="printable-sooratbar__entity">
          <span className="printable-sooratbar__entity-label font-meem">خریدار</span>
          <span className="printable-sooratbar__entity-value font-meem">{buyerName}</span>
        </div>
        <div className="printable-sooratbar__entity">
          <span className="printable-sooratbar__entity-label font-meem">تحویل‌گیرنده</span>
          <span className="printable-sooratbar__entity-value font-meem">{consigneeName}</span>
        </div>
        <div className="printable-sooratbar__fleet">
          <p>
            <span className="font-meem">نام راننده:</span>
            {' '}
            <span className="font-meem">{driverName || '—'}</span>
          </p>
          <p>
            <span className="font-meem">شماره پلاک:</span>
            {' '}
            <span className="font-yekan">{licensePlate || '—'}</span>
          </p>
          <p>
            <span className="font-meem">تلفن:</span>
            {' '}
            <span className="font-yekan">{phone || '—'}</span>
          </p>
          <p>
            <span className="font-meem">شرکت حمل:</span>
            {' '}
            <span className="font-meem">{carrierName || '—'}</span>
          </p>
        </div>
      </section>

      {/* 3. Cargo Table — actual scale weight only */}
      <section className="printable-sooratbar__cargo" aria-label="اقلام محموله">
        <table className="printable-sooratbar__table">
          <thead>
            <tr>
              <th className="font-meem" scope="col">ردیف</th>
              <th className="font-meem" scope="col">شرح کالا</th>
              <th className="font-meem" scope="col">توضیحات</th>
              <th className="font-meem" scope="col">واحد</th>
              <th className="font-meem" scope="col">وزن قطعی باسکول</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="font-meem printable-sooratbar__empty">
                  قلمی برای این نوبت انتخاب نشده است.
                </td>
              </tr>
            ) : (
              lines.map((line, index) => (
                <tr key={line.id || index}>
                  <td>
                    <span className="font-yekan">{(index + 1).toLocaleString('fa-IR')}</span>
                  </td>
                  <td className="font-meem">{line.name || '—'}</td>
                  <td className="printable-sooratbar__notes">
                    <span className="printable-sooratbar__notes-text">
                      {line.notes?.trim() ? line.notes : '—'}
                    </span>
                  </td>
                  <td className="font-meem">{line.unit || 'کیلوگرم'}</td>
                  <td>
                    <span className="font-yekan">{formatFa(line.scaleWeight)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* 4. Legal Footer — signature boxes */}
      <footer className="printable-sooratbar__signatures">
        <div className="printable-sooratbar__sign-box">
          <h2 className="printable-sooratbar__sign-title font-meem">تحویل راننده</h2>
          <p className="printable-sooratbar__sign-text font-meem">
            اینجانب محموله فوق را با اوزان و تعداد مندرج، صحیح و سالم جهت حمل به مقصد تحویل گرفتم.
          </p>
          <div className="printable-sooratbar__sign-space">
            <span className="font-meem">امضا و اثرانگشت راننده</span>
          </div>
        </div>
        <div className="printable-sooratbar__sign-box">
          <h2 className="printable-sooratbar__sign-title font-meem">تحویل گیرنده / مشتری</h2>
          <p className="printable-sooratbar__sign-text font-meem">
            کلیه اقلام مندرج در این صورت‌بار، مطابق با درخواست و بدون نقص فیزیکی در مقصد تحویل گرفته شد.
          </p>
          <div className="printable-sooratbar__sign-space">
            <span className="font-meem">امضا و مهر مشتری</span>
          </div>
        </div>
      </footer>
    </article>
  );
}

export { buildSerial };
