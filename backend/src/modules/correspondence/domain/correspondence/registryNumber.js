/**
 * Official correspondence registry numbering — server-authoritative (DDL-23a).
 *
 * Format: {yy}/{IN|OUT|INT}/{seq} — Persian digits, 3-digit min sequence.
 * Kept format-compatible with the legacy FE-only
 * `src/modules/gahshomar/services/letterRegistryNumber.js` so existing
 * print/list rendering (`formatRegistryNumberFa`) needs no changes.
 *
 * Backend intentionally does NOT import frontend module code (module
 * boundaries law) — this is a small, independent re-implementation of the
 * pure digit/format helpers only.
 */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function toPersianDigits(value) {
  return String(value ?? '').replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function toAsciiDigits(value) {
  return String(value ?? '').replace(/[۰-۹]/g, (ch) => String(FA_DIGITS.indexOf(ch)));
}

export const DIRECTION_CODE = Object.freeze({
  INCOMING: 'IN',
  OUTGOING: 'OUT',
  INTERNAL: 'INT',
});

export function registryDirectionCode(direction) {
  const raw = String(direction || '').trim().toUpperCase();
  if (DIRECTION_CODE[raw]) return DIRECTION_CODE[raw];
  if (['IN', 'OUT', 'INT'].includes(raw)) return raw;
  return DIRECTION_CODE.OUTGOING;
}

/** 1405 or "1405/04/20" → "405" (ASCII short year, 3 digits). */
export function toRegistryYearShort(jalaliYearOrDate) {
  const ascii = toAsciiDigits(String(jalaliYearOrDate || '').trim());
  const year = ascii.includes('/') ? ascii.split('/')[0] : ascii;
  const digits = String(year || '').replace(/\D/g, '');
  if (!digits) return '405';
  return digits.slice(-3).padStart(3, '0');
}

export function formatOfficialNumber(yearShort, code, seq) {
  const seqStr = String(seq).padStart(3, '0');
  return `${toPersianDigits(yearShort)}/${code}/${toPersianDigits(seqStr)}`;
}
