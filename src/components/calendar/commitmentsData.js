import {
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliWeekday,
  toPersianDigits,
} from '../../modules/nabz/dateUtils';
import { PIPELINE_STAGES, getContactDisplayName } from '../../modules/ofogh/pipelineConfig';

/**
 * موتور تعهدات (گاه‌شمار) — نمای تجمیعیِ فقط-خواندنی از تعهدات زمان‌دار سایر ماژول‌ها.
 * اینجا هیچ رویدادی «ساخته» نمی‌شود؛ داده از نبض، افق/کانون و مالی تجمیع می‌شود.
 */
export const COMMITMENT_TYPES = {
  followup: { id: 'followup', label: 'پیگیری‌ها', source: 'افق' },
  finance: { id: 'finance', label: 'تسویه‌ها', source: 'مالی' },
  logistics: { id: 'logistics', label: 'بارگیری', source: 'رهسپار' },
  contract: { id: 'contract', label: 'قراردادها', source: 'میثاق' },
};

export const TYPE_ORDER = ['followup', 'finance', 'logistics', 'contract'];

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

/* ——— ابزارهای تاریخ جلالی ——— */

export function dateToJalaliParts(date) {
  return gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function jalaliPartsToDate({ year, month, day }) {
  const g = jalaliToGregorian(year, month, day);
  return new Date(g.year, g.month - 1, g.day, 12, 0, 0);
}

export function shiftJalali(parts, days) {
  const date = jalaliPartsToDate(parts);
  date.setDate(date.getDate() + days);
  return dateToJalaliParts(date);
}

export function dayKey({ year, month, day }) {
  return `${year}-${month}-${day}`;
}

export function compareParts(a, b) {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/** «شنبه ۱۰ مرداد» */
export function formatDayLabel(parts) {
  const weekday = WEEKDAY_LABELS[(getJalaliWeekday(parts.year, parts.month, parts.day) + 1) % 7];
  return `${weekday} ${toPersianDigits(parts.day)} ${JALALI_MONTHS[parts.month - 1]}`;
}

export function formatPartsLong({ year, month, day }) {
  return `${toPersianDigits(day)} ${JALALI_MONTHS[month - 1]} ${toPersianDigits(year)}`;
}

function isoToJalaliParts(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return dateToJalaliParts(date);
}

/**
 * تعهدات شبیه‌سازی‌شده — تا اتصال سرویس تسویه نبض، برنامه بارگیری رهسپار و
 * میثاق، دموی موتور تعهدات را زنده نگه می‌دارند. آفست‌ها نسبت به امروزند و
 * همه به پرونده‌های واقعی seed لینک می‌شوند.
 */
const MOCK_COMMITMENTS = [
  /* — معوق — */
  {
    id: 'fin-overdue-1', type: 'finance', offset: -3, time: '۱۰:۰۰', priority: 'high',
    title: 'تسویه فاکتور PF-2581', target: 'صنایع فلزی کرمان',
    owner: { name: 'نرگس عالی', role: 'صراف' },
    link: '/nabz/order/JR050111002',
    details: [
      { label: 'مبلغ', value: '۲٬۱۲۰٬۰۰۰٬۰۰۰ ریال' },
      { label: 'روش پرداخت', value: 'چک ۳۰ روزه' },
      { label: 'کد سند', value: 'PF-2581' },
    ],
    note: 'سه روز از سررسید گذشته — پیگیری تلفنی با واحد مالی مشتری انجام شود.',
  },
  {
    id: 'log-overdue-1', type: 'logistics', offset: -1, time: '۰۸:۳۰', priority: 'high',
    title: 'ارسال صورت‌بار معوق', target: 'بازرگانی آذر',
    owner: { name: 'رضا نوری', role: 'سفیر' },
    link: '/nabz/order/JR050105008',
    details: [
      { label: 'انبار', value: 'انبار تهران' },
      { label: 'اقلام', value: 'پروفیل Z — ۱ تن' },
    ],
    note: 'راننده اعلام آمادگی کرده؛ منتظر تأیید نهایی بازرس.',
  },

  /* — امروز — */
  {
    id: 'meet-1', type: 'followup', subtype: 'meeting', offset: 0, time: '۱۱:۰۰', priority: 'high',
    title: 'جلسه حضوری بررسی قرارداد تأمین', target: 'فولاد پارس',
    owner: { name: 'علی رضایی', role: 'شوالیه' },
    link: '/kanoon/contact/1',
    details: [
      { label: 'محل', value: 'دفتر مرکزی مشتری' },
      { label: 'موضوع', value: 'شرایط تأمین سه‌ماهه پاییز' },
    ],
  },
  {
    id: 'meet-2', type: 'followup', subtype: 'meeting', offset: 0, time: '۱۴:۳۰', priority: 'normal',
    title: 'دمو کاتالوگ محصولات جدید', target: 'صنایع فلزی کرمان',
    owner: { name: 'حسین کریمی', role: 'شوالیه' },
    link: '/kanoon/contact/2',
    details: [
      { label: 'محل', value: 'جلسه آنلاین' },
      { label: 'موضوع', value: 'مقاطع جدید ویترین' },
    ],
  },
  {
    id: 'meet-3', type: 'followup', subtype: 'meeting', offset: 0, time: '۱۶:۰۰', priority: 'normal',
    title: 'هماهنگی برنامه حمل هفته آینده', target: 'ذوب آهن اصفهان',
    owner: { name: 'فاطمه رحیمی', role: 'کاشف' },
    link: '/kanoon/contact/5',
    details: [
      { label: 'محل', value: 'تماس تصویری' },
      { label: 'موضوع', value: 'زمان‌بندی بارگیری ورق گالوانیزه' },
    ],
  },
  {
    id: 'fin-today-1', type: 'finance', offset: 0, time: '۱۲:۰۰', priority: 'high',
    title: 'وصول مطالبات پیش‌فاکتور', target: 'صنایع فلزی کرمان',
    owner: { name: 'نرگس عالی', role: 'صراف' },
    link: '/nabz/order/JR050111002',
    details: [
      { label: 'مبلغ', value: '۲٬۱۲۰٬۰۰۰٬۰۰۰ ریال' },
      { label: 'وضعیت', value: 'در انتظار واریز' },
    ],
  },
  {
    id: 'fin-today-2', type: 'finance', offset: 0, time: '۱۵:۰۰', priority: 'medium',
    title: 'واریز پیش‌پرداخت به تأمین‌کننده', target: 'تأمین‌کننده: فولاد خوزستان',
    owner: { name: 'حسین کریمی', role: 'کاشف' },
    link: '/nabz/order/JR050106007',
    details: [
      { label: 'مبلغ', value: '۷۵۰٬۰۰۰٬۰۰۰ ریال' },
      { label: 'روش پرداخت', value: 'حواله بانکی' },
    ],
  },

  /* — آینده نزدیک — */
  {
    id: 'log-1', type: 'logistics', offset: 1, time: '۰۷:۳۰', priority: 'high',
    title: 'بارگیری میلگرد ۱۸ — انبار تهران', target: 'فولاد پارس',
    owner: { name: 'رضا نوری', role: 'سفیر' },
    link: '/nabz/order/JR050106007',
    details: [
      { label: 'ناوگان', value: 'تریلی کفی — ۳ دستگاه' },
      { label: 'تناژ', value: '۳ تن' },
    ],
  },
  {
    id: 'fin-2', type: 'finance', offset: 2, time: '۱۰:۳۰', priority: 'medium',
    title: 'تسویه خرید میلگرد ۱۸', target: 'تأمین‌کننده: فولاد خوزستان',
    owner: { name: 'حسین کریمی', role: 'کاشف' },
    link: '/nabz/order/JR050106007',
    details: [
      { label: 'مبلغ', value: '۱۵۱٬۸۰۰٬۰۰۰ ریال' },
      { label: 'روش پرداخت', value: 'چک صیادی' },
    ],
  },
  {
    id: 'con-1', type: 'contract', offset: 2, time: '۰۹:۰۰', priority: 'medium',
    title: 'تمدید قرارداد سالانه تأمین', target: 'فولاد پارس',
    owner: { name: 'علی رضایی', role: 'شوالیه' },
    link: '/kanoon/contact/1',
    details: [
      { label: 'شماره قرارداد', value: 'CT-1404-018' },
      { label: 'اعتبار فعلی', value: 'تا پایان مرداد' },
    ],
    note: 'پیش‌نویس تمدید آماده است؛ نیازمند امضای مدیرعامل.',
  },
  {
    id: 'log-2', type: 'logistics', offset: 3, time: '۱۱:۳۰', priority: 'medium',
    title: 'بازرسی QC ورق گالوانیزه', target: 'ذوب آهن اصفهان',
    owner: { name: 'فاطمه رحیمی', role: 'بازرس' },
    link: '/nabz/order/JR050107006',
    details: [
      { label: 'محل بازرسی', value: 'انبار اصفهان' },
      { label: 'استاندارد', value: 'A653 — ضخامت ۲mm' },
    ],
  },
  {
    id: 'con-2', type: 'contract', offset: 5, time: '۰۹:۳۰', priority: 'high',
    title: 'انقضای ضمانت‌نامه بانکی', target: 'ذوب آهن اصفهان',
    owner: { name: 'نرگس عالی', role: 'صراف' },
    link: '/kanoon/contact/5',
    details: [
      { label: 'شماره ضمانت‌نامه', value: 'BG-8842-1404' },
      { label: 'بانک', value: 'پاسارگاد — شعبه مرکزی' },
    ],
    note: 'در صورت عدم تمدید، وثیقه نقدی جایگزین لازم است.',
  },
  {
    id: 'fin-3', type: 'finance', offset: 6, time: '۱۳:۰۰', priority: 'normal',
    title: 'سررسید چک بانک پاسارگاد', target: 'ذوب آهن اصفهان',
    owner: { name: 'نرگس عالی', role: 'صراف' },
    link: '/nabz/order/JR050107006',
    details: [
      { label: 'مبلغ', value: '۵٬۱۰۰٬۰۰۰٬۰۰۰ ریال' },
      { label: 'سری چک', value: '۴۴۲۱۸۷' },
    ],
  },
  {
    id: 'log-3', type: 'logistics', offset: 9, time: '۰۸:۰۰', priority: 'normal',
    title: 'برنامه‌ریزی حمل لوله ۸ اینچ', target: 'فولاد مبارکه',
    owner: { name: 'رضا نوری', role: 'سفیر' },
    link: '/nabz/order/JR050108005',
    details: [
      { label: 'مبدأ', value: 'کارخانه مبارکه' },
      { label: 'تناژ', value: '۴ تن' },
    ],
  },
  {
    id: 'fin-4', type: 'finance', offset: 13, time: '۱۰:۰۰', priority: 'normal',
    title: 'پیش‌پرداخت سفارش تأمین ورق', target: 'تأمین‌کننده: فولاد مبارکه',
    owner: { name: 'امیر صادقی', role: 'کاشف' },
    link: '/nabz/order/JR050108005',
    details: [
      { label: 'مبلغ', value: '۱٬۰۸۰٬۰۰۰٬۰۰۰ ریال' },
      { label: 'روش پرداخت', value: 'حواله بانکی' },
    ],
  },
];

/**
 * تجمیع تعهدات: پیگیری‌های زنده از useContactsStore + موک‌های مالی/لجستیک/قرارداد.
 */
export function buildCommitments(contacts, todayParts) {
  const items = [];

  (contacts || []).forEach((contact) => {
    if (!contact.next_follow_up_date) return;
    const parts = isoToJalaliParts(contact.next_follow_up_date);
    if (!parts) return;
    const overdue = compareParts(parts, todayParts) < 0;
    items.push({
      id: `fu-${contact.id}`,
      type: 'followup',
      parts,
      time: null,
      title: `پیگیری ${getContactDisplayName(contact)}`,
      target: getContactDisplayName(contact),
      owner: contact.assignee || { name: 'شوالیه فروش', role: 'شوالیه' },
      priority: overdue ? 'high' : 'normal',
      link: `/kanoon/contact/${contact.id}`,
      details: [
        { label: 'منبع', value: 'بورد افق — چرخه فرصت' },
        {
          label: 'مرحله',
          value: PIPELINE_STAGES.find((s) => s.id === contact.lifecycle_stage)?.label || '—',
        },
      ],
      note: contact.interactions?.length
        ? `آخرین تعامل ثبت‌شده: ${contact.interactions[0]?.summary || contact.interactions[0]?.note || '—'}`
        : null,
    });
  });

  MOCK_COMMITMENTS.forEach((spec) => {
    const { offset, ...rest } = spec;
    items.push({ ...rest, parts: shiftJalali(todayParts, offset) });
  });

  return items;
}

/**
 * گروه‌بندی: معوق‌ها جدا (قدیمی‌ترین اول)، بقیه به‌تفکیک روز و مرتب بر اساس ساعت.
 */
export function groupCommitments(items, todayParts) {
  const overdue = [];
  const dayMap = new Map();

  items.forEach((item) => {
    if (compareParts(item.parts, todayParts) < 0) {
      overdue.push(item);
      return;
    }
    const key = dayKey(item.parts);
    if (!dayMap.has(key)) dayMap.set(key, { parts: item.parts, items: [] });
    dayMap.get(key).items.push(item);
  });

  overdue.sort((a, b) => compareParts(a.parts, b.parts));

  const days = [...dayMap.values()].sort((a, b) => compareParts(a.parts, b.parts));
  days.forEach((day) => {
    day.items.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const diff = compareParts(day.parts, todayParts);
    if (diff === 0) day.relative = 'امروز';
    else if (dayKey(day.parts) === dayKey(shiftJalali(todayParts, 1))) day.relative = 'فردا';
    day.label = formatDayLabel(day.parts);
  });

  return { overdue, days };
}

/** متریک‌های نوار «امروز» */
export function buildTodayMetrics(items, todayParts) {
  const todayKey = dayKey(todayParts);
  let meetings = 0;
  let followups = 0;
  let settlements = 0;
  let overdue = 0;

  items.forEach((item) => {
    if (compareParts(item.parts, todayParts) < 0) {
      overdue += 1;
      return;
    }
    if (dayKey(item.parts) !== todayKey) return;
    if (item.subtype === 'meeting') meetings += 1;
    else if (item.type === 'followup') followups += 1;
    else if (item.type === 'finance') settlements += 1;
  });

  return { meetings, followups, settlements, overdue };
}
