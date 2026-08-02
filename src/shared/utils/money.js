/**
 * ابزارهای عمومی پول — فقط قالب‌بندی و گرد کردن.
 * منطق کسب‌وکار (مالیات، تخفیف، جمع) در quotingService است.
 */

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/**
 * گرد کردن مبلغ به ریال (بدون اعشار) با جلوگیری از خطای شناور JS.
 * @param {number} value
 * @returns {number}
 */
export function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n + Number.EPSILON);
}

/**
 * ضرب امن مقدار × قیمت واحد و گرد کردن به ریال.
 */
export function multiplyMoney(quantity, unitPrice) {
  return roundMoney(Number(quantity) * Number(unitPrice));
}

/**
 * قالب نمایشی مبلغ با جداکننده هزارگان (لاتین یا فارسی).
 */
export function formatMoney(value, { locale = 'fa-IR', currencySuffix = false } = {}) {
  const n = roundMoney(value);
  const formatted = n.toLocaleString(locale);
  return currencySuffix ? `${formatted} ریال` : formatted;
}

export function toPersianDigits(num) {
  if (num === null || num === undefined) return '';
  return String(num).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}
