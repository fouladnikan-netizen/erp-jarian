/**
 * Auto-generated persona codes for UI-created identities (DDL-43).
 * Format: persona_1, persona_2, …  Seed codes (SALES, …) are never rewritten.
 */

export const GENERATED_PERSONA_CODE_RE = /^persona_[0-9]+$/;

export function generatedPersonaNumber(code) {
  const normalized = String(code || '').trim().toLowerCase();
  if (!GENERATED_PERSONA_CODE_RE.test(normalized)) return null;
  const n = Number(normalized.slice('persona_'.length));
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function nextGeneratedPersonaCode(existingCodes = []) {
  let max = 0;
  for (const code of existingCodes) {
    const n = generatedPersonaNumber(code);
    if (n != null && n > max) max = n;
  }
  return `persona_${max + 1}`;
}
