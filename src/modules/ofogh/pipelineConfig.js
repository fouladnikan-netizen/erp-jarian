import { LIFECYCLE_STAGES } from '../../stores/useContactsStore';

/**
 * متادیتای ۷ ستون پایپ‌لاین افق — واژگان رسمی «جریان» (Jarian Lexicon).
 * کلیدهای store (LIFECYCLE_STAGES) ثابت می‌مانند؛ فقط برچسب نمایشی فارسی است.
 * رنگ «دمای رابطه» برای هاله بالای هر ستون.
 */
export const PIPELINE_STAGES = [
  {
    id: LIFECYCLE_STAGES.COLD_LEAD,
    label: 'نوپدید',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.45)',
  },
  {
    id: LIFECYCLE_STAGES.PITCHED,
    label: 'دیدار',
    color: '#818cf8',
    glow: 'rgba(129, 140, 248, 0.45)',
  },
  {
    id: LIFECYCLE_STAGES.NURTURING,
    label: 'رویش',
    color: '#fb923c',
    glow: 'rgba(251, 146, 60, 0.55)',
  },
  {
    id: LIFECYCLE_STAGES.SALES_QUALIFIED,
    label: 'آستانه',
    color: '#0d9488',
    glow: 'rgba(13, 148, 136, 0.45)',
  },
  {
    id: LIFECYCLE_STAGES.FIRST_TIME_BUYER,
    label: 'نوپیمان',
    color: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.45)',
  },
  {
    id: LIFECYCLE_STAGES.LOYAL,
    label: 'هم‌پیمان',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.55)',
  },
  {
    id: LIFECYCLE_STAGES.ARCHIVED,
    label: 'سایه',
    color: '#94a3b8',
    glow: 'rgba(148, 163, 184, 0.35)',
  },
];

/** وضعیت «نبض» پیگیری بعدی: overdue | today | future | none */
export function getPulseStatus(isoDate) {
  if (!isoDate) return 'none';
  const due = new Date(isoDate);
  if (Number.isNaN(due.getTime())) return 'none';
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dueDay = startOfDay(due);
  const today = startOfDay(new Date());
  if (dueDay < today) return 'overdue';
  if (dueDay === today) return 'today';
  return 'future';
}

export const PULSE_META = {
  overdue: { label: 'پیگیری عقب‌افتاده', className: 'ofoq-pulse--overdue' },
  today: { label: 'پیگیری امروز', className: 'ofoq-pulse--today' },
  future: { label: 'پیگیری آینده', className: 'ofoq-pulse--future' },
  none: { label: 'بدون پیگیری برنامه‌ریزی‌شده', className: 'ofoq-pulse--none' },
};

/** نام نمایشی مخاطب — شرکت حقوقی یا شخص حقیقی. */
export function getContactDisplayName(contact) {
  return contact.companyName || contact.personName || '—';
}

/** تگ کوتاه کارت — حوزه فعالیت یا نوع تأمین‌کننده. */
export function getContactTag(contact) {
  return contact.activityDomain || contact.supplierType || contact.province || '';
}
