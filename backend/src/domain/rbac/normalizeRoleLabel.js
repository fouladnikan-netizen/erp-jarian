/**
 * Canonical comparison key for Role display names (DDL-38).
 * Display text is stored as entered (trimmed); uniqueness uses this form.
 */
export function normalizeRoleLabelFa(value) {
  return String(value ?? '')
    .replaceAll('ي', 'ی')
    .replaceAll('ك', 'ک')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
