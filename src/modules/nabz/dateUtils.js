const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function toPersianDigits(value) {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function toAsciiDigits(value) {
  return String(value).replace(/[۰-۹]/g, (d) => PERSIAN_DIGITS.indexOf(d));
}

/**
 * متن نمایشی پیش‌فاکتور: فقط ارقام به فارسی (حروف انگلیسی دست‌نخورده می‌مانند).
 */
export function toPersianInvoiceText(value) {
  if (value == null || value === '') return value == null ? '' : value;
  return toPersianDigits(String(value));
}

export function getTodayJalali() {
  try {
    const parts = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      calendar: 'persian',
    }).formatToParts(new Date());

    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (year && month && day) return `${year}/${month}/${day}`;
  } catch {
    /* fallback below */
  }
  return toPersianDigits('1404/01/12');
}

export function getNowTimeFa() {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  } catch {
    return toPersianDigits('09:00');
  }
}

export function parseJalaliParts(dateStr) {
  const ascii = toAsciiDigits(dateStr || '');
  const [year, month, day] = ascii.split('/').map((n) => Number(n) || 0);
  return {
    yy: year % 100,
    mm: month,
    dd: day,
  };
}

export function isValidJalaliDate(dateStr) {
  const ascii = toAsciiDigits((dateStr || '').trim());
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(ascii)) return false;
  const [year, month, day] = ascii.split('/').map((n) => Number(n));
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= getJalaliMonthLength(year, month);
}

export function formatJalaliDate(year, month, day) {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return toPersianDigits(`${y}/${m}/${d}`);
}

export function parseJalaliDate(dateStr) {
  const ascii = toAsciiDigits((dateStr || '').trim());
  const [year, month, day] = ascii.split('/').map((n) => Number(n) || 0);
  return { year, month, day };
}

/** منفی: a قبل از b — صفر: برابر — مثبت: a بعد از b */
export function compareJalaliDates(a, b) {
  const left = parseJalaliDate(a);
  const right = parseJalaliDate(b);
  if (left.year !== right.year) return left.year - right.year;
  if (left.month !== right.month) return left.month - right.month;
  return left.day - right.day;
}

/** آیا تاریخ جلالی فرا رسیده یا گذشته است؟ */
export function isJalaliDateReached(dateStr, today = getTodayJalali()) {
  if (!isValidJalaliDate(dateStr) || !isValidJalaliDate(today)) return false;
  return compareJalaliDates(today, dateStr) >= 0;
}

export function getJalaliMonthLength(year, month) {
  if (month >= 1 && month <= 6) return 31;
  if (month >= 7 && month <= 11) return 30;
  return isValidJalaliYmd(year, 12, 30) ? 30 : 29;
}

function isValidJalaliYmd(year, month, day) {
  const g = jalaliToGregorian(year, month, day);
  const j = gregorianToJalali(g.year, g.month, g.day);
  return j.year === year && j.month === month && j.day === day;
}

export function isJalaliLeapYear(year) {
  return getJalaliMonthLength(year, 12) === 30;
}

export function gregorianToJalali(gy, gm, gd) {
  const gDaysInMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  let gy2 = gy - (gy <= 1600 ? 621 : 1600);
  const leap = gm > 2 ? gy2 + 1 : gy2;
  let days = (365 * gy2)
    + Math.floor(leap / 4)
    - Math.floor(leap / 100)
    + Math.floor(leap / 400)
    - 80
    + gd
    + gDaysInMonth[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { year: jy, month: jm, day: jd };
}

export function jalaliToGregorian(jy, jm, jd) {
  let gy = jy <= 979 ? 621 : 1600;
  let days = (365 * (jy - (jy <= 979 ? 0 : 979)))
    + Math.floor((jy - (jy <= 979 ? 0 : 979)) / 33) * 8
    + Math.floor((((jy - (jy <= 979 ? 0 : 979)) % 33) + 3) / 4)
    + 78
    + jd
    + (jm < 7 ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days += 1;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const salA = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 1; gm <= 12 && gd > salA[gm]; gm += 1) gd -= salA[gm];
  return { year: gy, month: gm, day: gd };
}

export function getJalaliWeekday(year, month, day) {
  const { year: gy, month: gm, day: gd } = jalaliToGregorian(year, month, day);
  return new Date(gy, gm - 1, gd).getDay();
}

export function getTodayJalaliParts() {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
