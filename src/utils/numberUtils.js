/**
 * تبدیل ارقام لاتین به فارسی — ابزار مشترک، بدون وابستگی به ماژول‌ها.
 */
export function toPersianDigits(num) {
  if (num === null || num === undefined) return '';
  return String(num).replace(/\d/g, (x) => '۰۱۲۳۴۵۶۷۸۹'[x]);
}
