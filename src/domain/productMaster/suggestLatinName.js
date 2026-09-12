/**
 * Suggest Latin labels / codes from a Persian Product Structure name.
 * Dictionary longest-match only — unknown Persian words are skipped, never
 * romanized letter-by-letter. Pass API catalogs (DDL-48); bundled lexicon is
 * the offline / mock fallback.
 */
import {
  BUNDLED_LATIN_CATALOGS,
  LATIN_STOPWORDS,
  normalizeFaKey,
} from './latinLexicon.js';

function catalogsOf(catalogs) {
  return catalogs?.phrases ? catalogs : BUNDLED_LATIN_CATALOGS;
}

const LATIN_TOKEN = /^[A-Za-z][A-Za-z0-9.-]*/;
const DIGIT_TOKEN = /^[0-9۰-۹]+/;
const PERSIAN_WORD = /^[\u0600-\u06FF]+/;

function toAsciiDigits(value) {
  const map = '۰۱۲۳۴۵۶۷۸۹';
  return String(value || '').replace(/[۰-۹]/g, (ch) => String(map.indexOf(ch)));
}

function isBoundary(text, index) {
  if (index >= text.length) return true;
  return /[\s]/.test(text[index]) || LATIN_TOKEN.test(text.slice(index)) || DIGIT_TOKEN.test(text.slice(index));
}

function nextPersianWord(text, index) {
  const match = text.slice(index).match(PERSIAN_WORD);
  return match ? match[0] : text[index];
}

export function suggestLatinName(raw, catalogs) {
  const { phrases } = catalogsOf(catalogs);
  const text = normalizeFaKey(raw);
  if (!text) return '';

  const exact = phrases.find((row) => row.fa === text);
  if (exact) return exact.latin;

  const parts = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === ' ') {
      i += 1;
      continue;
    }

    let matched = null;
    for (const row of phrases) {
      if (text.startsWith(row.fa, i) && isBoundary(text, i + row.fa.length)) {
        matched = row;
        break;
      }
    }
    if (matched) {
      parts.push(matched.latin);
      i += matched.fa.length;
      continue;
    }

    const latin = text.slice(i).match(LATIN_TOKEN);
    if (latin) {
      parts.push(latin[0]);
      i += latin[0].length;
      continue;
    }

    const digits = text.slice(i).match(DIGIT_TOKEN);
    if (digits) {
      parts.push(toAsciiDigits(digits[0]));
      i += digits[0].length;
      continue;
    }

    const word = nextPersianWord(text, i);
    if (LATIN_STOPWORDS.has(normalizeFaKey(word))) {
      i += word.length;
      continue;
    }
    i += word.length;
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function lettersOf(token) {
  return String(token || '').replace(/[^A-Za-z0-9]/g, '');
}

export function suggestSkuFromLatin(latinName) {
  const tokens = String(latinName || '')
    .replace(/[()[\]{}/\\,._&+-]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t && /[A-Za-z]/.test(t));
  if (tokens.length >= 1) {
    const first = lettersOf(tokens[0]);
    if (first.length >= 2 && first.length <= 8 && first === first.toUpperCase()) return first;
  }
  if (tokens.length >= 2) {
    const a = lettersOf(tokens[0])[0];
    const b = lettersOf(tokens[1])[0];
    if (a && b) return (a + b).toUpperCase();
  }
  if (tokens.length === 1) {
    const t = lettersOf(tokens[0]);
    if (t.length < 2) return '';
    if (t.length <= 5) return t[0].toUpperCase() + t.slice(1);
    return t[0].toUpperCase() + t.slice(1, 2).toLowerCase();
  }
  return '';
}

export function suggestSkuFromFa(raw, catalogs) {
  return suggestSkuFromLatin(suggestLatinName(raw, catalogs));
}

export function suggestAttributeCode(raw, catalogs) {
  const { attributeCodes } = catalogsOf(catalogs);
  const key = normalizeFaKey(raw);
  if (attributeCodes[key]) return attributeCodes[key];
  const latin = suggestLatinName(raw, catalogs);
  const code = String(latin || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  if (/^[a-z][a-z0-9_]*$/.test(code)) return code;
  return '';
}

export function suggestUomCode(raw, catalogs) {
  const { uomCodes } = catalogsOf(catalogs);
  return uomCodes[normalizeFaKey(raw)] || '';
}
