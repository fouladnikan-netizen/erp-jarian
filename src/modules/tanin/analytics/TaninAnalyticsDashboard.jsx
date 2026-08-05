import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Percent,
  Star,
  Users,
  BarChart3,
  MessageSquareText,
  ChevronRight,
} from 'lucide-react';
import { MOCK_SURVEY_ANALYTICS } from '../../../mockData/surveyAnalytics';
import { toPersianDigits } from '../../../utils/numberUtils';
import './tanin-analytics.css';

const ICON = { size: 16, strokeWidth: 1.75 };

function StarRating({ value, max = 5 }) {
  const score = Number(value) || 0;
  return (
    <span className="tanin-a-stars" aria-label={`${toPersianDigits(score)} از ${toPersianDigits(max)}`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < score;
        return (
          <Star
            key={i}
            size={13}
            strokeWidth={1.75}
            fill={filled ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        );
      })}
    </span>
  );
}

function KpiCard({ label, value, Icon, hint }) {
  return (
    <article className="tanin-a-kpi">
      <div className="tanin-a-kpi__top">
        <span className="tanin-a-kpi__icon" aria-hidden="true">
          <Icon {...ICON} />
        </span>
        <span className="tanin-a-kpi__label font-meem">{label}</span>
      </div>
      <div className="tanin-a-kpi__value font-yekan">{value}</div>
      {hint ? <p className="tanin-a-kpi__hint font-meem">{hint}</p> : null}
    </article>
  );
}

function RatingDistribution({ rows }) {
  const maxCount = Math.max(...rows.map((r) => r.count), 1);

  return (
    <section className="tanin-a-card" aria-label="توزیع امتیاز">
      <header className="tanin-a-card__head">
        <BarChart3 {...ICON} aria-hidden="true" />
        <h2 className="font-meem">توزیع امتیاز</h2>
      </header>
      <ul className="tanin-a-dist">
        {rows.map((row) => {
          const pct = Math.round((row.count / maxCount) * 100);
          return (
            <li key={row.stars} className="tanin-a-dist__row">
              <span className="tanin-a-dist__label font-yekan">
                {toPersianDigits(row.stars)}
                <Star size={12} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="tanin-a-dist__track" aria-hidden="true">
                <span className="tanin-a-dist__fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="tanin-a-dist__count font-yekan">
                {toPersianDigits(row.count)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RecentFeedbacks({ items }) {
  return (
    <section className="tanin-a-card" aria-label="بازخوردهای اخیر">
      <header className="tanin-a-card__head">
        <MessageSquareText {...ICON} aria-hidden="true" />
        <h2 className="font-meem">بازخوردهای اخیر</h2>
      </header>
      <ul className="tanin-a-feedbacks">
        {items.map((item) => (
          <li key={item.id} className="tanin-a-feedback">
            <div className="tanin-a-feedback__top">
              <div className="tanin-a-feedback__entities">
                <Link
                  to={`/kanoon/contact/${encodeURIComponent(item.customerId || item.customerName)}`}
                  className="tanin-a-link font-meem"
                >
                  {item.customerName}
                </Link>
                <span className="tanin-a-feedback__sep" aria-hidden="true">·</span>
                <Link
                  to={`/nabz/order/${encodeURIComponent(item.orderId)}`}
                  className="tanin-a-link tanin-a-link--mono font-yekan"
                >
                  {item.orderId}
                </Link>
              </div>
              <time className="tanin-a-feedback__date font-yekan">{item.date}</time>
            </div>
            <div className="tanin-a-feedback__rating">
              <StarRating value={item.rating} />
            </div>
            <p className="tanin-a-feedback__comment font-meem">{item.comment}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * داشبورد ادمین تحلیل نظرسنجی طنین.
 */
export default function TaninAnalyticsDashboard() {
  const navigate = useNavigate();
  const data = MOCK_SURVEY_ANALYTICS;
  const { kpis } = data;

  return (
    <div className="module-page tanin-a-page" data-module="tanin-analytics" dir="rtl">
      <div className="tanin-a-toolbar">
        <button
          type="button"
          className="tanin-a-back font-meem"
          onClick={() => navigate('/mowj')}
        >
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
          بازگشت به موج
        </button>
        <div className="tanin-a-toolbar__title">
          <h2 className="tanin-a-page-title font-meem">داشبورد تحلیل طنین</h2>
          <p className="tanin-a-page-sub font-meem">
            {data.campaignName}
            <span className="tanin-a-page-id font-yekan">{data.campaignId}</span>
          </p>
        </div>
      </div>

      <section className="section-kpis" aria-label="شاخص‌های کلیدی">
        <div className="section-label">شاخص‌های کلیدی</div>
        <div className="tanin-a-kpi-grid">
          <KpiCard
            label="امتیاز NPS"
            value={toPersianDigits(kpis.npsScore)}
            Icon={Activity}
            hint="Net Promoter Score"
          />
          <KpiCard
            label="نرخ پاسخ"
            value={toPersianDigits(kpis.responseRate)}
            Icon={Percent}
          />
          <KpiCard
            label="میانگین امتیاز"
            value={toPersianDigits(String(kpis.averageRating))}
            Icon={Star}
          />
          <KpiCard
            label="کل پاسخ‌ها"
            value={toPersianDigits(kpis.totalResponses)}
            Icon={Users}
          />
        </div>
      </section>

      <div className="tanin-a-split">
        <RatingDistribution rows={data.ratingDistribution} />
        <RecentFeedbacks items={data.recentFeedbacks} />
      </div>
    </div>
  );
}
