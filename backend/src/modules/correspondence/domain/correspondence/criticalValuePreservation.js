/**
 * Critical-value-preservation validator (DDL-23c, P0).
 *
 * Deterministic, dependency-free, provider-agnostic. Independent of whether
 * any AI call actually happened — this function only ever compares two
 * plain-text strings ("original"/"before" vs "rewritten"/"after") and
 * reports whether protected business facts survived the rewrite.
 *
 * Protected categories: amounts, percentages, dates (Jalali + Gregorian),
 * order/invoice/contract/account-style codes, quantities-with-units,
 * and company/person names introduced by an honorific/legal-entity keyword.
 *
 * Rule: values may be ADDED (boilerplate, formatting, extra courtesy text)
 * without failing the check. Values may NOT be LOST or CHANGED — every
 * occurrence of a protected value in the original text must still appear
 * (same or greater multiplicity) in the rewritten text.
 */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function toAsciiDigits(value) {
  return String(value ?? '').replace(/[۰-۹٠-٩]/g, (ch) => {
    const faIdx = FA_DIGITS.indexOf(ch);
    if (faIdx >= 0) return String(faIdx);
    const arIdx = AR_DIGITS.indexOf(ch);
    return arIdx >= 0 ? String(arIdx) : ch;
  });
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const CRITICAL_KINDS = Object.freeze({
  DATE: 'date',
  PERCENTAGE: 'percentage',
  CODE: 'code',
  QUANTITY: 'quantity',
  AMOUNT: 'amount',
  NAME: 'name',
});

const NAME_KEYWORDS = [
  'شرکت', 'آقای', 'خانم', 'جناب آقای', 'جناب', 'سرکار خانم', 'مؤسسه', 'موسسه',
];

const QUANTITY_UNITS = [
  'تن', 'کیلوگرم', 'کیلو', 'عدد', 'متر مربع', 'مترمربع', 'متر', 'لیتر', 'دستگاه', 'بسته',
];

const CODE_KEYWORDS = [
  'شماره سفارش', 'شماره فاکتور', 'شماره قرارداد', 'شماره حساب', 'شماره پیگیری', 'کد سفارش',
];

/**
 * Mask out already-consumed character ranges so a later, looser pattern
 * cannot re-match digits already attributed to a more specific category.
 */
function applyMask(text, mask, start, end) {
  for (let i = start; i < end; i += 1) mask[i] = true;
}

function extractByRegex(text, mask, regex, mapFn) {
  const out = [];
  let match = regex.exec(text);
  while (match) {
    const start = match.index;
    const end = start + match[0].length;
    const alreadyConsumed = mask.slice(start, end).some(Boolean);
    if (!alreadyConsumed) {
      const canonical = mapFn(match);
      if (canonical) out.push(canonical);
      applyMask(text, mask, start, end);
    }
    match = regex.exec(text);
  }
  return out;
}

/**
 * @param {string} rawText
 * @returns {Record<string, string[]>} category -> canonical value occurrences (with repeats)
 */
export function extractCriticalValues(rawText) {
  const plain = stripHtml(rawText);
  const text = toAsciiDigits(plain);
  const mask = new Array(text.length).fill(false);

  const result = {
    [CRITICAL_KINDS.DATE]: [],
    [CRITICAL_KINDS.PERCENTAGE]: [],
    [CRITICAL_KINDS.CODE]: [],
    [CRITICAL_KINDS.QUANTITY]: [],
    [CRITICAL_KINDS.AMOUNT]: [],
    [CRITICAL_KINDS.NAME]: [],
  };

  // 1) Dates — Jalali (13xx/14xx) or Gregorian (19xx/20xx), '/' or '-' separated.
  result[CRITICAL_KINDS.DATE].push(...extractByRegex(
    text, mask, /\b((?:13|14|19|20)\d{2})[/-](\d{1,2})[/-](\d{1,2})\b/g,
    (m) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`,
  ));

  // 2) Percentages.
  result[CRITICAL_KINDS.PERCENTAGE].push(...extractByRegex(
    text, mask, /(\d+(?:\.\d+)?)\s*(?:%|درصد)/g,
    (m) => `${Number(m[1])}%`,
  ));

  // 3) Keyword-anchored codes (order/invoice/contract/account numbers).
  const codeKeywordPattern = new RegExp(
    `(?:${CODE_KEYWORDS.join('|')})\\s*[:：]?\\s*([A-Za-z0-9-]{2,})`,
    'g',
  );
  result[CRITICAL_KINDS.CODE].push(...extractByRegex(
    text, mask, codeKeywordPattern,
    (m) => m[1].toUpperCase(),
  ));

  // 3b) Free-standing structured codes (JR-000123, INV-4521, 09-12-4521, ...).
  result[CRITICAL_KINDS.CODE].push(...extractByRegex(
    text, mask, /\b[A-Za-z]{1,6}-\d{2,}\b/g,
    (m) => m[0].toUpperCase(),
  ));
  result[CRITICAL_KINDS.CODE].push(...extractByRegex(
    text, mask, /\b\d{2,}-\d{2,}-\d{2,}\b/g,
    (m) => m[0],
  ));

  // 4) Quantities with units.
  // Note: trailing `\b` does not work reliably after Persian letters (they are
  // non-word chars in ASCII-only regex semantics, so a Persian-letter →
  // whitespace transition never registers as a boundary). Use an explicit
  // "not immediately followed by another Persian letter" lookahead instead.
  const unitPattern = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*(${QUANTITY_UNITS.join('|')})(?![\\u0600-\\u06FF])`,
    'g',
  );
  result[CRITICAL_KINDS.QUANTITY].push(...extractByRegex(
    text, mask, unitPattern,
    (m) => `${Number(m[1])}:${m[2].replace(/\s+/g, '')}`,
  ));

  // 5) Amounts — thousand-separated numbers, or numbers followed by ریال/تومان,
  //    or bare 4+ digit numbers (not already consumed as date/code/quantity).
  result[CRITICAL_KINDS.AMOUNT].push(...extractByRegex(
    text, mask, /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\s*(?:ریال|تومان)?\b/g,
    (m) => m[0].replace(/[^\d.]/g, ''),
  ));
  result[CRITICAL_KINDS.AMOUNT].push(...extractByRegex(
    text, mask, /\b\d+(?:\.\d+)?\s*(?:ریال|تومان)\b/g,
    (m) => m[0].replace(/[^\d.]/g, ''),
  ));
  result[CRITICAL_KINDS.AMOUNT].push(...extractByRegex(
    text, mask, /\b\d{4,}\b/g,
    (m) => String(Number(m[0])),
  ));

  // 6) Names — honorific / legal-entity keyword + following word(s).
  // Capped at 2 words (proper-noun heuristic): Persian has no capitalization
  // signal, so a wide word count would greedily swallow trailing sentence
  // verbs (e.g. "... ارسال می‌شود") whenever surrounding phrasing changes,
  // producing false positives on pure rewording. Real company/person names
  // in this domain are almost always 1-2 words.
  const namePattern = new RegExp(
    `(?:${NAME_KEYWORDS.join('|')})\\s+([\\u0600-\\u06FF]+(?:\\s+[\\u0600-\\u06FF]+){0,1})`,
    'g',
  );
  result[CRITICAL_KINDS.NAME].push(...extractByRegex(
    plain, new Array(plain.length).fill(false), namePattern,
    (m) => m[1].trim(),
  ));

  return result;
}

function toMultiset(values) {
  const map = new Map();
  for (const v of values) {
    map.set(v, (map.get(v) || 0) + 1);
  }
  return map;
}

/**
 * @param {string} original raw/before text
 * @param {string} rewritten AI-rewritten or edited/final text
 * @returns {{ ok: boolean, violations: Array<{ kind: string, missing: string[] }> }}
 */
export function checkCriticalValuePreservation(original, rewritten) {
  const before = extractCriticalValues(original);
  const after = extractCriticalValues(rewritten);

  const violations = [];

  for (const kind of Object.keys(before)) {
    const beforeCounts = toMultiset(before[kind]);
    const afterCounts = toMultiset(after[kind]);
    const missing = [];

    for (const [value, count] of beforeCounts.entries()) {
      const remaining = afterCounts.get(value) || 0;
      if (remaining < count) {
        const deficit = count - remaining;
        for (let i = 0; i < deficit; i += 1) missing.push(value);
      }
    }

    if (missing.length) {
      violations.push({ kind, missing });
    }
  }

  return { ok: violations.length === 0, violations };
}

export default { extractCriticalValues, checkCriticalValuePreservation, CRITICAL_KINDS };
