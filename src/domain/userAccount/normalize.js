/**
 * User account identity helpers (DDL-39).
 * Organizational mobile is stored as canonical Iranian domestic 09xxxxxxxxx.
 */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const MOBILE_RE = /^09\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function toAsciiDigits(value) {
  return String(value ?? '').replace(/[۰-۹٠-٩]/g, (ch) => {
    const fa = FA_DIGITS.indexOf(ch);
    if (fa >= 0) return String(fa);
    const ar = AR_DIGITS.indexOf(ch);
    return ar >= 0 ? String(ar) : ch;
  });
}

export function normalizeUserMobile(value) {
  const digits = toAsciiDigits(String(value ?? '')).replace(/[\s-]/g, '').replace(/\D/g, '');
  if (!digits) return { ok: false, mobile: '', normalized: '' };
  let normalized = digits;
  if (normalized.startsWith('0098')) normalized = normalized.slice(2);
  if (normalized.startsWith('98') && normalized.length === 12) {
    normalized = `0${normalized.slice(2)}`;
  }
  if (normalized.startsWith('9') && normalized.length === 10) {
    normalized = `0${normalized}`;
  }
  if (!MOBILE_RE.test(normalized)) {
    return { ok: false, mobile: normalized, normalized };
  }
  return { ok: true, mobile: normalized, normalized };
}

export function normalizeUserEmail(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return { ok: true, email: null, normalized: null };
  if (!EMAIL_RE.test(raw) || raw.includes(' ')) {
    return { ok: false, email: raw, normalized: raw };
  }
  return { ok: true, email: raw, normalized: raw };
}
