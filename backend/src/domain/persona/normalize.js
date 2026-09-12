/**
 * Persona domain helpers (DDL-42). Display name/domain are data, not constants.
 * Code is technical and immutable after create. Persona does not authorize.
 */

import { GENERATED_PERSONA_CODE_RE } from './generatedPersonaCode.js';

export const PERSONA_CODE_RE = /^[A-Z][A-Z0-9_]{1,47}$/;

export function normalizePersonaCode(value) {
  const raw = String(value ?? '').trim();
  const lower = raw.toLowerCase();
  if (GENERATED_PERSONA_CODE_RE.test(lower)) return lower;
  return raw.toUpperCase();
}

export function normalizePersonaLabel(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function assertPersonaCode(value) {
  const code = normalizePersonaCode(value);
  if (GENERATED_PERSONA_CODE_RE.test(code) || PERSONA_CODE_RE.test(code)) {
    return { ok: true, code };
  }
  return { ok: false, code, error: 'کد پرسونا باید شناسهٔ فنی لاتین یا persona_N باشد.' };
}
