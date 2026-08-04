/**
 * Official letter registry numbering.
 *
 * Format: {yy}/{IN|OUT|INT}/{seq}
 * Example: ۴۰۵/OUT/۱۲۵
 *
 * Fixed direction codes (Latin):
 * - IN  = Incoming Correspondence  (وارده)
 * - OUT = Outgoing Correspondence  (صادره)
 * - INT = Internal Memo            (داخلی)
 *
 * All numeric segments are stored/displayed with Persian digits.
 * Sequence is always 3 digits (e.g. ۱۲۵).
 */

import { toAsciiDigits, toPersianDigits } from '../../nabz/dateUtils';
import { RECORD_DIRECTION } from '../models/officialRecord';

export const REGISTRY_DIRECTION_CODE = Object.freeze({
  INCOMING: 'IN',
  OUTGOING: 'OUT',
  INTERNAL: 'INT',
});

const CODE_BY_DIRECTION = Object.freeze({
  [RECORD_DIRECTION.INCOMING]: REGISTRY_DIRECTION_CODE.INCOMING,
  [RECORD_DIRECTION.OUTGOING]: REGISTRY_DIRECTION_CODE.OUTGOING,
  [RECORD_DIRECTION.INTERNAL]: REGISTRY_DIRECTION_CODE.INTERNAL,
  INTERNAL: REGISTRY_DIRECTION_CODE.INTERNAL,
});

const CANONICAL_CODES = new Set(Object.values(REGISTRY_DIRECTION_CODE));

export function registryDirectionCode(direction) {
  const raw = String(direction || '').trim().toUpperCase();
  if (CODE_BY_DIRECTION[raw]) return CODE_BY_DIRECTION[raw];
  if (CANONICAL_CODES.has(raw)) return raw;
  if (raw === 'INCOMING' || raw === 'IN') return REGISTRY_DIRECTION_CODE.INCOMING;
  if (raw === 'OUTGOING' || raw === 'OUT') return REGISTRY_DIRECTION_CODE.OUTGOING;
  if (raw === 'INTERNAL' || raw === 'INT') return REGISTRY_DIRECTION_CODE.INTERNAL;
  return REGISTRY_DIRECTION_CODE.OUTGOING;
}

/** 1405 → "405" (ASCII short year for sequencing) */
export function toRegistryYearShort(jalaliYearOrDate) {
  const ascii = toAsciiDigits(String(jalaliYearOrDate || '').trim());
  const year = ascii.includes('/') ? ascii.split('/')[0] : ascii;
  const digits = String(year || '').replace(/\D/g, '');
  if (!digits) return '405';
  return digits.slice(-3).padStart(3, '0');
}

/**
 * @param {string} registryNumber
 * @returns {{ yearShort: string, code: string, seq: number }|null}
 */
export function parseRegistryNumber(registryNumber) {
  const raw = toAsciiDigits(String(registryNumber || '').trim());
  const match = raw.match(/^(\d{3})\/(IN|OUT|INT|INCOMING|OUTGOING|INTERNAL)\/(\d+)$/i);
  if (!match) return null;
  return {
    yearShort: match[1],
    code: registryDirectionCode(match[2]),
    seq: Number(match[3]),
  };
}

/**
 * Next sequence for year + direction among existing numbers.
 * @param {Array<{ registryNumber?: string, number?: string }>} records
 * @param {string} yearShort ASCII year short e.g. "405"
 * @param {'IN'|'OUT'|'INT'} code
 */
export function nextRegistrySequence(records, yearShort, code) {
  const normalizedCode = registryDirectionCode(code);
  const yearAscii = toAsciiDigits(yearShort);
  let max = 0;
  (records || []).forEach((item) => {
    const parsed = parseRegistryNumber(item.registryNumber || item.number);
    if (!parsed) return;
    if (parsed.yearShort !== yearAscii || parsed.code !== normalizedCode) return;
    if (Number.isFinite(parsed.seq) && parsed.seq > max) max = parsed.seq;
  });
  return max + 1;
}

/**
 * Build `۴۰۵/OUT/۱۲۵`-style registry number (Persian digits, 3-digit serial).
 * @param {'INCOMING'|'OUTGOING'|'INTERNAL'|string} direction
 * @param {string} jalaliDate
 * @param {Array<object>} records
 */
export function buildRegistryNumber(direction, jalaliDate, records = []) {
  const yearShort = toRegistryYearShort(jalaliDate);
  const code = registryDirectionCode(direction);
  const seq = String(nextRegistrySequence(records, yearShort, code)).padStart(3, '0');
  return `${toPersianDigits(yearShort)}/${code}/${toPersianDigits(seq)}`;
}

/** Ensure an existing registry number uses Persian digits in numeric parts. */
export function formatRegistryNumberFa(registryNumber) {
  const parsed = parseRegistryNumber(registryNumber);
  if (!parsed) return String(registryNumber || '');
  const seq = String(parsed.seq).padStart(3, '0');
  return `${toPersianDigits(parsed.yearShort)}/${parsed.code}/${toPersianDigits(seq)}`;
}
