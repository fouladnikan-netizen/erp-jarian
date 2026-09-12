/**
 * String mechanics for mnemonic sku_code / Product SKU segments (DDL-24m).
 *
 * Policy (which attributes are identity, formula, immutability) lives in
 * `productIdentityPolicy.js` — do not add a second generator here.
 *
 * Node sku_code: 2–16 `[A-Za-z][A-Za-z0-9]*`. Default from Latin name
 * (initials / short token). Collision → longer prefix. Operator override
 * always allowed. Brand sku_code is stored but is not part of Product SKU.
 *
 * `buildProductSku` only joins already-chosen parts. Callers that decide
 * identity must go through `allocateProductSku`.
 */
import { appError } from '../../lib/errors.js';
import { toAsciiDigits, isNumericAttributeType } from './normalize.js';

export const SKU_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9]{1,15}$/;
export const PRODUCT_SKU_PATTERN = /^[A-Za-z][A-Za-z0-9]*(-[A-Za-z0-9]+)+$/;

const STOPWORDS = new Set([
  'products', 'product', 'and', 'of', 'the', 'a', 'an',
  'sheets', 'sheet', 'for', 'with',
]);

export function normalizeSkuCode(raw) {
  const s = String(raw || '').trim();
  if (!SKU_CODE_PATTERN.test(s)) return null;
  return s;
}

export function skuCodeKey(code) {
  return String(code || '').toLowerCase();
}

function tokenizeLatin(latinName) {
  return String(latinName || '')
    .replace(/[()[\]{}/\\,._&+-]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t && /[A-Za-z]/.test(t));
}

function significantTokens(tokens) {
  const filtered = tokens.filter((t) => !STOPWORDS.has(t.toLowerCase()));
  return filtered.length ? filtered : tokens;
}

function lettersOf(token) {
  return String(token || '').replace(/[^A-Za-z0-9]/g, '');
}

function compactLetters(latinName) {
  return tokenizeLatin(latinName).map(lettersOf).join('');
}

/**
 * Single-token default: industry tokens (IPE, Black) stay intact when short;
 * longer words collapse to a 2-letter Title-case stub (Profiles → Pr).
 */
function fromSingleToken(token) {
  const t = lettersOf(token);
  if (t.length < 2) return '';
  if (t === t.toUpperCase() && t.length <= 8) return t;
  if (t.length <= 5) return t[0].toUpperCase() + t.slice(1);
  return t[0].toUpperCase() + t.slice(1, 2).toLowerCase();
}

export function suggestTwoLetterSkuCode(latinName) {
  const tokens = significantTokens(tokenizeLatin(latinName));
  if (tokens.length >= 2) {
    const a = lettersOf(tokens[0])[0];
    const b = lettersOf(tokens[1])[0];
    if (a && b) return (a + b).toUpperCase();
  }
  if (tokens.length === 1) return fromSingleToken(tokens[0]);
  return '';
}

export function suggestSkuCodeCandidates(latinName) {
  const tokens = tokenizeLatin(latinName);
  const compact = compactLetters(latinName);
  const out = [];
  const seen = new Set();
  const push = (value) => {
    const n = normalizeSkuCode(value);
    if (!n) return;
    const key = skuCodeKey(n);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(n);
  };

  push(suggestTwoLetterSkuCode(latinName));
  if (compact.length >= 3) {
    push(compact[0].toUpperCase() + compact.slice(1, 3));
  }
  for (let len = 4; len <= Math.min(12, compact.length); len += 1) {
    push(compact[0].toUpperCase() + compact.slice(1, len));
  }
  // Keep a reference so tokens is used (single-token latin with 2 chars).
  if (tokens.length === 1 && compact.length === 2) push(compact);
  return out;
}

export function pickSkuCode({ latinName, explicit, takenKeys } = {}) {
  const taken = takenKeys instanceof Set
    ? takenKeys
    : new Set([...(takenKeys || [])].map((k) => skuCodeKey(k)));

  const explicitRaw = explicit === undefined || explicit === null ? '' : String(explicit).trim();
  if (explicitRaw) {
    const n = normalizeSkuCode(explicitRaw);
    if (!n) {
      throw appError(
        'SKU_CODE_INVALID',
        'کد SKU باید ۲ تا ۱۶ نویسهٔ لاتین/عدد باشد و با حرف شروع شود.',
        400,
        { skuCode: explicitRaw },
      );
    }
    if (taken.has(skuCodeKey(n))) {
      throw appError(
        'SKU_CODE_DUPLICATE',
        `کد SKU «${n}» در این سطح قبلاً استفاده شده است.`,
        409,
        { skuCode: n },
      );
    }
    return n;
  }

  const latin = String(latinName || '').trim();
  if (!latin) {
    throw appError(
      'SKU_CODE_SOURCE_MISSING',
      'برای صدور کد SKU، نام لاتین یا کد SKU دستی لازم است.',
      400,
    );
  }

  const candidates = suggestSkuCodeCandidates(latin);
  if (!candidates.length) {
    throw appError(
      'SKU_CODE_SOURCE_MISSING',
      'نام لاتین باید شامل حروف انگلیسی باشد، یا کد SKU را دستی وارد کنید.',
      400,
      { latinName: latin },
    );
  }

  for (const candidate of candidates) {
    if (!taken.has(skuCodeKey(candidate))) return candidate;
  }

  throw appError(
    'SKU_CODE_COLLISION',
    'از نام لاتین کد یکتایی ساخته نشد — لطفاً کد SKU را دستی وارد کنید.',
    409,
    { latinName: latin },
  );
}

/** Format one identity-relevant attribute value as a SKU segment (ASCII, no unit). */
export function formatIdentitySkuSegment(dataType, normalized) {
  if (normalized === null || normalized === undefined || normalized === '') return null;
  if (isNumericAttributeType(dataType)) return String(normalized);
  if (dataType === 'BOOLEAN') return String(normalized) === '1' ? '1' : '0';
  const ascii = toAsciiDigits(String(normalized)).trim();
  const compact = ascii.replace(/[^A-Za-z0-9]+/g, '');
  if (compact) return compact;
  const fallback = ascii.replace(/\s+/g, '');
  return fallback || null;
}

export function buildProductSku({ groupSku, categorySku, typeSku, identitySegments } = {}) {
  const head = [groupSku, categorySku, typeSku].map((part, i) => {
    const n = normalizeSkuCode(part);
    if (!n) {
      const labels = ['گروه', 'دسته', 'نوع'];
      throw appError(
        'SKU_TAXONOMY_CODE_MISSING',
        `کد SKU ${labels[i]} کالا برای صدور شناسه محصول موجود نیست.`,
        409,
      );
    }
    return n;
  });
  const values = (identitySegments || []).filter((s) => s !== null && s !== undefined && String(s) !== '');
  return [...head, ...values].join('-');
}
