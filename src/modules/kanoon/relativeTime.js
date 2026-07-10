/**
 * Formats elapsed time as Persian relative labels (e.g. ۳ روز پیش).
 */
export function formatRelativeTime(isoDate) {
  if (!isoDate) return '—';

  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return '—';

  const diffMs = Date.now() - then;
  if (diffMs < 0) return 'امروز';

  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return 'امروز';
  if (days === 1) return 'دیروز';
  if (days < 30) return `${days.toLocaleString('fa-IR')} روز پیش`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months.toLocaleString('fa-IR')} ماه پیش`;

  const years = Math.floor(months / 12);
  return `${years.toLocaleString('fa-IR')} سال پیش`;
}
