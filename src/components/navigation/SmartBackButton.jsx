import { Link, useSearchParams } from 'react-router-dom';
import './smart-back.css';

function BackChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/**
 * دکمه بازگشت آگاه به زمینه — اگر returnTo/returnName در query باشند
 * به همان مسیر برمی‌گردد؛ وگرنه fallback ماژول والد.
 */
export default function SmartBackButton({
  fallbackTo = '/',
  fallbackName = 'بازگشت',
  className = '',
}) {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const returnName = searchParams.get('returnName');

  const hasReturn = Boolean(returnTo);
  const to = hasReturn ? returnTo : fallbackTo;
  const label = hasReturn
    ? `بازگشت به ${returnName || 'مبدا'}`
    : fallbackName.startsWith('بازگشت')
      ? fallbackName
      : `بازگشت به ${fallbackName}`;

  return (
    <Link
      to={to}
      className={`smart-back${hasReturn ? ' smart-back--context' : ''}${className ? ` ${className}` : ''}`}
      aria-label={label}
      title={label}
    >
      <BackChevronIcon />
      <span className="smart-back__label">{label}</span>
    </Link>
  );
}

/** ساخت query string بازگشت برای لینک‌های Deep Dive بین ماژول‌ها. */
export function buildReturnQuery(returnTo, returnName) {
  const params = new URLSearchParams();
  if (returnTo) params.set('returnTo', returnTo);
  if (returnName) params.set('returnName', returnName);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** الحاق returnTo/returnName به مسیر؛ queryهای موجود حفظ می‌شوند. */
export function withReturnParams(path, returnTo, returnName) {
  if (!returnTo) return path;
  const [base, existing = ''] = String(path).split('?');
  const params = new URLSearchParams(existing);
  params.set('returnTo', returnTo);
  if (returnName) params.set('returnName', returnName);
  return `${base}?${params.toString()}`;
}
