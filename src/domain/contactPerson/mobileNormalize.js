/**
 * Centralized Iranian mobile normalization for ContactPerson duplicate policy.
 * Canonical form: `989xxxxxxxxx` (12 digits, no +).
 *
 * Accepts common input shapes:
 * - 09121234567
 * - 9121234567
 * - 989121234567
 * - +989121234567
 *
 * Forward-compatible: callers compare canonical strings only — storage format
 * of ContactPerson.mobile may change without breaking lookup contracts.
 */

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function toAsciiDigits(value) {
  return String(value || '')
    .replace(/[۰-۹]/g, (ch) => String(PERSIAN_DIGITS.indexOf(ch)))
    .replace(/[٠-٩]/g, (ch) => String(ARABIC_DIGITS.indexOf(ch)));
}

/**
 * @param {unknown} mobile
 * @returns {string} Canonical `989…` or `''` when not a valid IR mobile
 */
export function normalizeMobile(mobile) {
  let raw = toAsciiDigits(mobile).trim();
  if (!raw) return '';

  raw = raw.replace(/[\s\-()]/g, '');
  if (raw.startsWith('+')) raw = raw.slice(1);
  if (raw.startsWith('00')) raw = raw.slice(2);

  // Keep digits only after prefix cleanup
  raw = raw.replace(/\D/g, '');

  if (raw.startsWith('98') && raw.length === 12) {
    // 989xxxxxxxxx
  } else if (raw.startsWith('0') && raw.length === 11) {
    // 09xxxxxxxxx → 989xxxxxxxxx
    raw = `98${raw.slice(1)}`;
  } else if (raw.length === 10 && raw.startsWith('9')) {
    // 9xxxxxxxxx → 989xxxxxxxxx
    raw = `98${raw}`;
  } else {
    return '';
  }

  // Iran mobile: 98 + 9 + 9 digits
  if (!/^989\d{9}$/.test(raw)) return '';
  return raw;
}

/**
 * True when normalizeMobile produces a canonical IR mobile.
 * @param {unknown} mobile
 */
export function isValidMobile(mobile) {
  return Boolean(normalizeMobile(mobile));
}
