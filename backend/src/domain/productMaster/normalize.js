/**
 * Product Master normalization helpers (DDL-24c — duplicate detection / identity).
 * Pure, dependency-free. Used by both Product identity/duplicate checks and
 * Brand duplicate checks.
 */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Persian/Arabic digits -> ASCII digits. Does not touch non-digit characters. */
export function toAsciiDigits(value) {
  return String(value ?? '').replace(/[۰-۹٠-٩]/g, (ch) => {
    const fa = FA_DIGITS.indexOf(ch);
    if (fa >= 0) return String(fa);
    const ar = AR_DIGITS.indexOf(ch);
    return ar >= 0 ? String(ar) : ch;
  });
}

/**
 * Normalize a numeric attribute value so 2, 2.0, 2.00, ۲, ۲.۰ all compare
 * equal. Returns a canonical decimal string (no trailing zeros / dot), or
 * null if the value is not numeric.
 */
export function normalizeNumericValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const ascii = toAsciiDigits(String(value)).trim().replace(/,/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(ascii)) return null;
  const num = Number(ascii);
  if (!Number.isFinite(num)) return null;
  // Fixed precision avoids float artifacts (e.g. 0.1 + 0.2), then strip
  // trailing zeros/dot for a stable canonical string.
  let str = num.toFixed(6);
  str = str.replace(/0+$/, '').replace(/\.$/, '');
  if (str === '' || str === '-') str = '0';
  return str;
}

/** Normalize free text for comparison: trim, collapse whitespace, casefold, ascii-digits. */
export function normalizeTextValue(value) {
  if (value === null || value === undefined) return '';
  return toAsciiDigits(String(value))
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeBooleanValue(value) {
  if (typeof value === 'boolean') return value ? '1' : '0';
  const text = normalizeTextValue(value);
  if (['true', '1', 'yes', 'بله', 'دارد'].includes(text)) return '1';
  if (['false', '0', 'no', 'خیر', 'ندارد'].includes(text)) return '0';
  return null;
}

/**
 * Normalize a value according to its Attribute Definition dataType. Returns
 * `{ normalized, storage: { valueText, valueNumber, valueBoolean } }`.
 */
export function normalizeAttributeValue(dataType, rawValue) {
  switch (dataType) {
    case 'DECIMAL':
    case 'INTEGER': {
      const normalized = normalizeNumericValue(rawValue);
      return {
        normalized,
        storage: { valueText: null, valueNumber: normalized === null ? null : Number(normalized), valueBoolean: null },
      };
    }
    case 'BOOLEAN': {
      const normalized = normalizeBooleanValue(rawValue);
      return {
        normalized,
        storage: { valueText: null, valueNumber: null, valueBoolean: normalized === null ? null : normalized === '1' },
      };
    }
    case 'ENUM':
    case 'STRING':
    case 'DATE':
    case 'REFERENCE':
    default: {
      const normalized = normalizeTextValue(rawValue);
      return {
        normalized: normalized || null,
        storage: { valueText: rawValue === undefined || rawValue === null ? null : String(rawValue), valueNumber: null, valueBoolean: null },
      };
    }
  }
}

/**
 * Build the canonical identity key for a Product: Product Type + normalized
 * values of identity-relevant Master Attributes, sorted by attribute code so
 * order of entry never changes the key.
 */
export function buildCanonicalIdentityKey(productTypeId, identityAttributeEntries) {
  const parts = [...identityAttributeEntries]
    .filter((e) => e.normalized !== null && e.normalized !== '')
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((e) => `${e.code}=${e.normalized}`);
  return `${productTypeId}::${parts.join('|')}`;
}

/** Brand normalized-name key (DDL-24 Brand duplicate detection). */
export function normalizeBrandName(value) {
  return normalizeTextValue(value).replace(/[^\p{L}\p{N} ]+/gu, '');
}

/**
 * Simple, dependency-free similarity score (0..1) for probable-duplicate
 * warnings (Brand + Product display-name-adjacent checks). Token-overlap
 * (Jaccard) — good enough to flag "فولاد مبارکه" vs "فولاد مبارکه اصفهان"
 * without pulling in a fuzzy-matching library.
 */
export function tokenOverlapSimilarity(a, b) {
  const ta = new Set(normalizeTextValue(a).split(' ').filter(Boolean));
  const tb = new Set(normalizeTextValue(b).split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection += 1;
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
