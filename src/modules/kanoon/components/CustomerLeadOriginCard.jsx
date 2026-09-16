import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import {
  buildOfoghLeadDeepLink,
  fetchLeadsConvertedToCompany,
  pickPrimaryOriginLead,
} from '../../ofogh/public/index.js';
import { getLeadStatusLabel } from '../../ofogh/domain/lead.constants.js';
import { useCan } from '../../../stores/useSessionStore';
import { PERMISSIONS } from '../../../auth/permissions.catalog.js';

function formatFaDate(value) {
  if (!value) return '—';
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return String(value);
  return new Date(t).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Kanoon Customer 360 — displays Ofogh Lead origin (read-only relationship).
 * Lead SoR remains Ofogh; this card never writes Lead fields onto Company.
 */
export default function CustomerLeadOriginCard({ companyId }) {
  const canReadLeads = useCan(PERMISSIONS.LEADS_READ);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!companyId || !canReadLeads) {
      setLeads([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    void fetchLeadsConvertedToCompany(companyId)
      .then((items) => {
        if (!cancelled) setLeads(items || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setLeads([]);
          setError(err?.message || 'بارگذاری منشأ سرنخ ناموفق بود.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, canReadLeads]);

  if (!canReadLeads) return null;

  const origin = pickPrimaryOriginLead(leads);
  if (!loading && !error && !origin) return null;

  const assigneeName = origin?.assignee?.name
    || origin?.payload?.assignee?.name
    || null;
  const relatedCount = leads.length;

  return (
    <section
      className="kprofile-glass kprofile-origin"
      aria-label="منشأ مشتری"
      data-testid="customer-lead-origin"
    >
      <header className="kprofile-origin__head">
        <History size={14} strokeWidth={1.75} aria-hidden="true" />
        <h3 className="kprofile-origin__title font-meem">منشأ مشتری</h3>
      </header>

      {loading ? (
        <p className="kprofile-origin__muted font-meem" role="status">در حال بارگذاری…</p>
      ) : null}

      {error ? (
        <p className="kprofile-origin__muted font-meem" role="alert">{error}</p>
      ) : null}

      {origin ? (
        <dl className="kprofile-origin__list">
          <div className="kprofile-origin__row">
            <dt className="font-meem">منبع آشنایی</dt>
            <dd
              className="font-meem"
              data-testid="customer-lead-origin-source"
            >
              {origin.leadSource || '—'}
            </dd>
          </div>
          <div className="kprofile-origin__row">
            <dt className="font-meem">سرنخ اولیه</dt>
            <dd
              className="font-meem"
              data-testid="customer-lead-origin-name"
            >
              {origin.companyName || '—'}
            </dd>
          </div>
          <div className="kprofile-origin__row">
            <dt className="font-meem">تاریخ ثبت سرنخ</dt>
            <dd className="font-yekan" data-testid="customer-lead-origin-created">
              {formatFaDate(origin.createdAt)}
            </dd>
          </div>
          {assigneeName ? (
            <div className="kprofile-origin__row">
              <dt className="font-meem">مسئول سرنخ</dt>
              <dd className="font-meem">{assigneeName}</dd>
            </div>
          ) : null}
          <div className="kprofile-origin__row">
            <dt className="font-meem">تاریخ تبدیل</dt>
            <dd className="font-yekan" data-testid="customer-lead-origin-converted-at">
              {formatFaDate(origin.convertedAt)}
            </dd>
          </div>
          <div className="kprofile-origin__row">
            <dt className="font-meem">وضعیت سرنخ</dt>
            <dd className="font-meem" data-testid="customer-lead-origin-status">
              {getLeadStatusLabel(origin.status)}
            </dd>
          </div>
          <div className="kprofile-origin__row">
            <dt className="font-meem">شناسه سرنخ</dt>
            <dd
              className="font-yekan"
              dir="ltr"
              data-testid="customer-lead-origin-id"
            >
              {origin.id}
            </dd>
          </div>
        </dl>
      ) : null}

      {relatedCount > 1 ? (
        <p className="kprofile-origin__hint font-meem" data-testid="customer-lead-related-count">
          {relatedCount.toLocaleString('fa-IR')}
          {' '}
          سرنخ مرتبط با این مشتری ثبت شده است؛ منشأ نمایش‌داده‌شده قدیمی‌ترین تبدیل است.
        </p>
      ) : null}

      {origin?.id ? (
        <Link
          to={buildOfoghLeadDeepLink(origin.id)}
          className="kprofile-origin__link font-meem"
          data-testid="customer-lead-origin-open-ofogh"
        >
          مشاهده سرنخ در افق
        </Link>
      ) : null}
    </section>
  );
}
