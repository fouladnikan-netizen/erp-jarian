/**
 * Internal login username allocator (DDL-39).
 * Format: user_1, user_2, …  Existing usernames (admin, sales_b, …) are never rewritten.
 */

export const GENERATED_USERNAME_RE = /^user_[0-9]+$/;

export function generatedUsernameNumber(username) {
  const normalized = String(username || '').trim().toLowerCase();
  if (!GENERATED_USERNAME_RE.test(normalized)) return null;
  const n = Number(normalized.slice('user_'.length));
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function nextGeneratedUsername(existingUsernames = []) {
  let max = 0;
  for (const username of existingUsernames) {
    const n = generatedUsernameNumber(username);
    if (n != null && n > max) max = n;
  }
  return `user_${max + 1}`;
}
