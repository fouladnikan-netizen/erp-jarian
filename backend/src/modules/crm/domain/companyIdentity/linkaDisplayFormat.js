/**
 * Linka display formatting — Gregorian provider dates → Jalali YYYY/MM/DD,
 * capital amounts with thousand separators (ASCII; FE may Persian-digit them).
 */

/**
 * @param {number} gy
 * @param {number} gm
 * @param {number} gd
 */
export function gregorianToJalali(gy, gm, gd) {
  const gDaysInMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  let gy2 = gy - (gy <= 1600 ? 621 : 1600);
  const leap = gm > 2 ? gy2 + 1 : gy2;
  let days = (365 * gy2)
    + Math.floor((leap + 3) / 4)
    - Math.floor((leap + 99) / 100)
    + Math.floor((leap + 399) / 400)
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

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Parse Linka / mixed date strings.
 * Supports:
 * - Jalali already: 1403/09/09 or ۱۴۰۳/۰۹/۰۹
 * - US Gregorian: MM/DD/YYYY[ HH:mm:ss] (Linka default)
 * - ISO / EU: YYYY-MM-DD, YYYY/MM/DD
 * @param {unknown} value
 * @returns {{ kind: 'jalali'|'gregorian', year: number, month: number, day: number } | null}
 */
export function parseProviderDate(value) {
  if (value == null || value === '') return null;
  let raw = String(value).trim();
  raw = raw.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  // strip time
  const datePart = raw.split(/[T\s]/)[0] || raw;

  // YYYY-MM-DD or YYYY/MM/DD
  let m = datePart.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (year >= 1200 && year <= 1499) {
      return { kind: 'jalali', year, month, day };
    }
    if (year >= 1700 && year <= 2100) {
      return { kind: 'gregorian', year, month, day };
    }
  }

  // MM/DD/YYYY (Linka)
  m = datePart.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    if (year >= 1700 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { kind: 'gregorian', year, month, day };
    }
  }

  return null;
}

/**
 * Normalize any provider date to Jalali YYYY/MM/DD (ASCII digits).
 * @param {unknown} value
 * @returns {string}
 */
export function toJalaliDateString(value) {
  const parsed = parseProviderDate(value);
  if (!parsed) return value == null ? '' : String(value).trim();
  if (parsed.kind === 'jalali') {
    return `${parsed.year}/${pad2(parsed.month)}/${pad2(parsed.day)}`;
  }
  const j = gregorianToJalali(parsed.year, parsed.month, parsed.day);
  return `${j.year}/${pad2(j.month)}/${pad2(j.day)}`;
}

/**
 * Sort key YYYYMMDD in Jalali space (after conversion).
 * @param {unknown} value
 * @returns {number}
 */
export function toJalaliSortKey(value) {
  const jalali = toJalaliDateString(value);
  const m = String(jalali).match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!m) return 0;
  return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
}

/**
 * Thousand-separated capital (ASCII). Empty string if missing.
 * @param {unknown} value
 * @returns {string}
 */
export function formatCapitalAmount(value) {
  if (value == null || value === '') return '';
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return String(value);
  return Math.round(num).toLocaleString('en-US');
}

export default {
  gregorianToJalali,
  parseProviderDate,
  toJalaliDateString,
  toJalaliSortKey,
  formatCapitalAmount,
};
