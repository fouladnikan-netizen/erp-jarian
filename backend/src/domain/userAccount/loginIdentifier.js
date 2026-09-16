/**
 * Resolve the login identifier (DDL-41).
 * Product path is organizational mobile. Username remains an internal fallback.
 */

import { normalizeMobile } from '../identity/normalize.js';

export function resolveLoginIdentifier(body = {}) {
  const mobileRaw = String(body.mobile ?? '').trim();
  const usernameRaw = String(body.username ?? body.identifier ?? '').trim();
  const raw = mobileRaw || usernameRaw;
  if (!raw) {
    return { ok: false, kind: null, value: '', message: 'شماره موبایل و رمز عبور الزامی است.' };
  }
  const mobile = normalizeMobile(raw);
  if (mobile.ok) {
    return { ok: true, kind: 'mobile', value: mobile.normalized };
  }
  return { ok: true, kind: 'username', value: raw };
}

export function toFarazRecipient(mobile09) {
  const digits = String(mobile09 || '').replace(/\D/g, '');
  if (digits.startsWith('09') && digits.length === 11) {
    return `98${digits.slice(1)}`;
  }
  return digits;
}
