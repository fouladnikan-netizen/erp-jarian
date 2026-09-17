/**
 * Commercial Product display name / description (DDL-67).
 * FE preview mirror of backend/src/modules/catalog/domain/productMaster/normalize.js
 * `formatProductDisplayText`. Identity / SKU stay ASCII.
 */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function toPersianDigits(value) {
  return String(value ?? '').replace(/[0-9٠-٩]/g, (ch) => {
    if (ch >= '0' && ch <= '9') return FA_DIGITS[Number(ch)];
    const ar = AR_DIGITS.indexOf(ch);
    return ar >= 0 ? FA_DIGITS[ar] : ch;
  });
}

export function formatProductDisplayText(value) {
  if (value === undefined || value === null) return '';
  return toPersianDigits(value);
}

export default { toPersianDigits, formatProductDisplayText };
