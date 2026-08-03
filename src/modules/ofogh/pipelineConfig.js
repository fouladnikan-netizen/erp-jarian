import { LIFECYCLE_STAGES } from '../../stores/useContactsStore';

/**
 * متادیتای ۷ ستون پایپ‌لاین افق — واژگان رسمی «جریان» (Jarian Lexicon).
 * رنگ‌ها فقط از Theme Tokens (RFC-001) — هرگز هگز خام.
 */
export const PIPELINE_STAGES = [
  {
    id: LIFECYCLE_STAGES.COLD_LEAD,
    label: 'نوپدید',
    color: 'var(--pipeline-cold)',
    glow: 'var(--pipeline-cold-glow)',
  },
  {
    id: LIFECYCLE_STAGES.PITCHED,
    label: 'دیدار',
    color: 'var(--pipeline-pitched)',
    glow: 'var(--pipeline-pitched-glow)',
  },
  {
    id: LIFECYCLE_STAGES.NURTURING,
    label: 'رویش',
    color: 'var(--pipeline-nurturing)',
    glow: 'var(--pipeline-nurturing-glow)',
  },
  {
    id: LIFECYCLE_STAGES.SALES_QUALIFIED,
    label: 'آستانه',
    color: 'var(--pipeline-qualified)',
    glow: 'var(--pipeline-qualified-glow)',
  },
  {
    id: LIFECYCLE_STAGES.FIRST_TIME_BUYER,
    label: 'نوپیمان',
    color: 'var(--pipeline-first-buyer)',
    glow: 'var(--pipeline-first-buyer-glow)',
  },
  {
    id: LIFECYCLE_STAGES.LOYAL,
    label: 'هم‌پیمان',
    color: 'var(--pipeline-loyal)',
    glow: 'var(--pipeline-loyal-glow)',
  },
  {
    id: LIFECYCLE_STAGES.ARCHIVED,
    label: 'سایه',
    color: 'var(--pipeline-archived)',
    glow: 'var(--pipeline-archived-glow)',
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

/** بات صیاد: آستانه رکود فرصت — بیش از این تعداد روز بدون تعامل یعنی «در حال پوسیدن». */
export const ROTTING_INACTIVITY_DAYS = 14;

/** ستون‌های مستثنی از منطق پوسیدگی: هم‌پیمان (وفادار) و سایه (بایگانی). */
const ROTTING_EXEMPT_STAGES = new Set([LIFECYCLE_STAGES.LOYAL, LIFECYCLE_STAGES.ARCHIVED]);

/**
 * آیا فرصت در حال پوسیدن است؟ بیش از ۱۴ روز بدون تعامل
 * و خارج از ستون‌های هم‌پیمان/سایه.
 */
export function isCardRotting(lastInteractionDate, lifecycleStage) {
  if (ROTTING_EXEMPT_STAGES.has(lifecycleStage)) return false;
  if (!lastInteractionDate) return false;
  const last = new Date(lastInteractionDate);
  if (Number.isNaN(last.getTime())) return false;
  const inactiveDays = (Date.now() - last.getTime()) / 86_400_000;
  return inactiveDays > ROTTING_INACTIVITY_DAYS;
}

/** نام نمایشی مخاطب — شرکت حقوقی یا شخص حقیقی. */
export function getContactDisplayName(contact) {
  return contact.companyName || contact.personName || '—';
}

/** تگ کوتاه کارت — حوزه فعالیت یا نوع تأمین‌کننده. */
export function getContactTag(contact) {
  return contact.activityDomain || contact.supplierType || contact.province || '';
}
