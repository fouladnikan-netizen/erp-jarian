/**
 * Identity normalization helpers (DDL-25).
 * Pure, dependency-free. Shared primitives for Company/Contact/Lead duplicate detection.
 * Do not import Product Master — identity domain owns its own copy of text/digit helpers.
 */

import { normalizeNationalId as normalizeNationalIdCore } from '../companyIdentity/normalizeNationalId.js';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Persian/Arabic digits → ASCII digits. */
export function toAsciiDigits(value) {
  return String(value ?? '').replace(/[۰-۹٠-٩]/g, (ch) => {
    const fa = FA_DIGITS.indexOf(ch);
    if (fa >= 0) return String(fa);
    const ar = AR_DIGITS.indexOf(ch);
    return ar >= 0 ? String(ar) : ch;
  });
}

/** Trim, collapse whitespace, casefold, ascii-digits. */
export function normalizeTextValue(value) {
  if (value === null || value === undefined) return '';
  return toAsciiDigits(String(value))
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** Strip punctuation for name comparison. */
export function normalizeNameKey(value) {
  return normalizeTextValue(value).replace(/[^\p{L}\p{N} ]+/gu, '').trim();
}

/** Iranian mobile: 09XXXXXXXXX (11 digits), +98 / 0098, or 9XXXXXXXXX. */
export function normalizeMobile(value) {
  const digits = toAsciiDigits(String(value ?? '')).replace(/[\s-]/g, '').replace(/\D/g, '');
  if (!digits) return { ok: false, mobile: '', normalized: '' };
  let normalized = digits;
  if (normalized.startsWith('0098')) {
    normalized = normalized.slice(2);
  }
  if (normalized.startsWith('98') && normalized.length === 12) {
    normalized = `0${normalized.slice(2)}`;
  }
  if (normalized.startsWith('9') && normalized.length === 10) {
    normalized = `0${normalized}`;
  }
  if (normalized.length !== 11 || !/^09\d{9}$/.test(normalized)) {
    return { ok: false, mobile: normalized, normalized: normalized, error: 'شماره موبایل نامعتبر است.' };
  }
  return { ok: true, mobile: normalized, normalized };
}

/** Landline / generic phone — digits only, min 8. */
export function normalizePhone(value) {
  const digits = toAsciiDigits(String(value ?? '')).replace(/\D/g, '');
  if (!digits || digits.length < 8) {
    return { ok: false, phone: digits, normalized: digits };
  }
  return { ok: true, phone: digits, normalized: digits };
}

/** Lowercase email, trim. */
export function normalizeEmail(value) {
  const raw = normalizeTextValue(value);
  if (!raw || !raw.includes('@')) {
    return { ok: false, email: raw, normalized: raw };
  }
  return { ok: true, email: raw, normalized: raw };
}

/** Domain from email or URL — lowercase host without www. */
export function normalizeDomain(value) {
  let host = normalizeTextValue(value);
  if (!host) return { ok: false, domain: '', normalized: '' };
  if (host.includes('@')) host = host.split('@').pop() || '';
  host = host.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || '';
  if (!host || !host.includes('.')) {
    return { ok: false, domain: host, normalized: host };
  }
  return { ok: true, domain: host, normalized: host };
}

/** Re-export canonical nationalId normalization (11-digit legal entity). */
export function normalizeNationalId(value) {
  return normalizeNationalIdCore(value);
}

export function normalizeCompanyName(value) {
  return normalizeNameKey(value);
}

export function normalizePersonName(value) {
  return normalizeNameKey(value);
}

/** Token-overlap similarity (0..1) for probable duplicate warnings. */
export function tokenOverlapSimilarity(a, b) {
  const ta = new Set(normalizeTextValue(a).split(' ').filter(Boolean));
  const tb = new Set(normalizeTextValue(b).split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection += 1;
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export default {
  toAsciiDigits,
  normalizeTextValue,
  normalizeNameKey,
  normalizeMobile,
  normalizePhone,
  normalizeEmail,
  normalizeDomain,
  normalizeNationalId,
  normalizeCompanyName,
  normalizePersonName,
  tokenOverlapSimilarity,
};
