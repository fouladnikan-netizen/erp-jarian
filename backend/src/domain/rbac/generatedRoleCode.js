/**
 * Auto-generated role codes for UI-created roles.
 * Format: role_1, role_2, …  Existing seed codes (admin, sales, …) are never rewritten.
 */
export const GENERATED_ROLE_CODE_RE = /^role_[0-9]+$/;

export function generatedRoleNumber(code) {
  const normalized = String(code || '').trim().toLowerCase();
  if (!GENERATED_ROLE_CODE_RE.test(normalized)) return null;
  const n = Number(normalized.slice('role_'.length));
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function nextGeneratedRoleCode(existingCodes = []) {
  let max = 0;
  for (const code of existingCodes) {
    const n = generatedRoleNumber(code);
    if (n != null && n > max) max = n;
  }
  return `role_${max + 1}`;
}
