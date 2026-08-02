import {
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliWeekday,
  toPersianDigits,
} from '../../modules/nabz/dateUtils';
import { getContactDisplayName } from '../../modules/ofogh/pipelineConfig';

/**
 * تقویم یکپارچه جریان — لایه‌های رویداد و نگاشت نقش‌ها.
 * followup  → پویش‌ها و پیگیری‌ها (شوالیه — افق/کانون)
 * financial → تعهدات مالی (کاشف/صراف — نبض)
 * logistics → لجستیک و بارگیری (سفیر/بازرس — رهسپار)
 */
export const CALENDAR_LAYERS = [
  { id: 'financial', label: 'تعهدات مالی', icon: 'CreditCard' },
  { id: 'followup', label: 'پویش‌ها و پیگیری‌ها', icon: 'Phone' },
  { id: 'logistics', label: 'لجستیک و بارگیری', icon: 'Truck' },
];

export const CALENDAR_ROLES = [
  { id: 'rahbar', label: 'راهبر (کل سیستم)' },
  { id: 'shovalie', label: 'شوالیه' },
  { id: 'kashef', label: 'کاشف' },
  { id: 'saraf', label: 'صراف (مالی)' },
  { id: 'safir', label: 'سفیر / بازرس' },
];

export const PRIORITY_META = {
  high: { label: 'فوری', className: 'is-high' },
  medium: { label: 'مهم', className: 'is-medium' },
  normal: { label: 'عادی', className: 'is-normal' },
};

export const WEEKDAY_LABELS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

/** کلید یکتای روز برای گروه‌بندی رویدادها */
export function dayKey(jy, jm, jd) {
  return `${jy}-${jm}-${jd}`;
}

/** تاریخ میلادی → اجزای جلالی */
export function dateToJalaliParts(date) {
  return gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** اجزای جلالی → Date میلادی (ظهر، برای جلوگیری از خطای منطقه زمانی) */
export function jalaliPartsToDate({ year, month, day }) {
  const g = jalaliToGregorian(year, month, day);
  return new Date(g.year, g.month - 1, g.day, 12, 0, 0);
}

/** جابه‌جایی n روزه روی تاریخ جلالی */
export function shiftJalali(parts, days) {
  const date = jalaliPartsToDate(parts);
  date.setDate(date.getDate() + days);
  return dateToJalaliParts(date);
}

/** ایندکس ستون هفته شمسی: شنبه=۰ … جمعه=۶ */
export function jalaliWeekIndex({ year, month, day }) {
  return (getJalaliWeekday(year, month, day) + 1) % 7;
}

/** برچسب نمایشی بلند تاریخ (ارقام فارسی + نام ماه) */
export function formatPartsLong({ year, month, day }) {
  return `${toPersianDigits(day)} ${JALALI_MONTHS[month - 1]} ${toPersianDigits(year)}`;
}

function isoToJalaliParts(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return dateToJalaliParts(date);
}

function compareParts(a, b) {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/**
 * رویدادهای شبیه‌سازی‌شده مالی/لجستیک نسبت به امروز — تا زمان اتصال
 * سرویس تسویه نبض و برنامه بارگیری رهسپار، دموی تقویم را زنده نگه می‌دارد.
 * آفست‌ها ثابت‌اند تا هر سه لایه در نمای ماه دیده شوند.
 */
const MOCK_EVENT_SPECS = [
  {
    id: 'fin-1', layer: 'financial', roles: ['saraf'], offset: 0, priority: 'high',
    title: 'وصول مطالبات پیش‌فاکتور', party: 'صنایع فلزی کرمان', owner: 'صراف — نرگس عالی',
    link: '/nabz/order/JR050111002', tone: 'gold',
  },
  {
    id: 'fin-2', layer: 'financial', roles: ['kashef', 'saraf'], offset: 2, priority: 'medium',
    title: 'تسویه خرید میلگرد ۱۸', party: 'تأمین‌کننده: فولاد خوزستان', owner: 'کاشف — حسین کریمی',
    link: '/nabz/order/JR050106007',
  },
  {
    id: 'fin-3', layer: 'financial', roles: ['saraf'], offset: 6, priority: 'normal',
    title: 'سررسید چک بانک پاسارگاد', party: 'ذوب آهن اصفهان', owner: 'صراف — نرگس عالی',
    link: '/nabz/order/JR050107006', tone: 'gold',
  },
  {
    id: 'fin-4', layer: 'financial', roles: ['kashef', 'saraf'], offset: 13, priority: 'normal',
    title: 'پیش‌پرداخت سفارش تأمین ورق', party: 'تأمین‌کننده: فولاد مبارکه', owner: 'کاشف — امیر صادقی',
    link: '/nabz/order/JR050108005',
  },
  {
    id: 'log-1', layer: 'logistics', roles: ['safir'], offset: 1, priority: 'high',
    title: 'بارگیری میلگرد ۱۸ — انبار تهران', party: 'فولاد پارس', owner: 'سفیر — رضا نوری',
    link: '/nabz/order/JR050106007',
  },
  {
    id: 'log-2', layer: 'logistics', roles: ['safir'], offset: 3, priority: 'medium',
    title: 'بازرسی QC ورق گالوانیزه', party: 'ذوب آهن اصفهان', owner: 'بازرس — فاطمه رحیمی',
    link: '/nabz/order/JR050107006',
  },
  {
    id: 'log-3', layer: 'logistics', roles: ['safir'], offset: -1, priority: 'high',
    title: 'ارسال صورت‌بار معوق', party: 'بازرگانی آذر', owner: 'سفیر — رضا نوری',
    link: '/nabz/order/JR050105008',
  },
  {
    id: 'log-4', layer: 'logistics', roles: ['safir'], offset: 9, priority: 'normal',
    title: 'برنامه‌ریزی حمل لوله ۸ اینچ', party: 'فولاد مبارکه', owner: 'سفیر — رضا نوری',
    link: '/nabz/order/JR050108005',
  },
];

/**
 * ساخت فهرست یکپارچه رویدادهای تقویم.
 * پیگیری‌ها زنده از useContactsStore می‌آیند؛ مالی/لجستیک فعلاً شبیه‌سازی نسبت به امروز.
 */
export function buildCalendarEvents(contacts, todayParts) {
  const events = [];

  (contacts || []).forEach((contact) => {
    if (!contact.next_follow_up_date) return;
    const parts = isoToJalaliParts(contact.next_follow_up_date);
    if (!parts) return;
    const overdue = compareParts(parts, todayParts) < 0;
    events.push({
      id: `fu-${contact.id}`,
      layer: 'followup',
      roles: ['shovalie'],
      parts,
      title: `پیگیری ${getContactDisplayName(contact)}`,
      party: getContactDisplayName(contact),
      owner: contact.assignee?.name
        ? `شوالیه — ${contact.assignee.name}`
        : 'شوالیه فروش',
      priority: overdue ? 'high' : 'normal',
      overdue,
      link: `/kanoon/contact/${contact.id}`,
    });
  });

  MOCK_EVENT_SPECS.forEach((spec) => {
    const parts = shiftJalali(todayParts, spec.offset);
    events.push({
      ...spec,
      parts,
      overdue: spec.offset < 0,
    });
  });

  return events.sort((a, b) => compareParts(a.parts, b.parts));
}

/** فیلتر نقش: راهبر همه را می‌بیند؛ بقیه فقط دامنه خودشان. */
export function filterEventsByRole(events, roleId) {
  if (!roleId || roleId === 'rahbar') return events;
  return events.filter((event) => event.roles.includes(roleId));
}
