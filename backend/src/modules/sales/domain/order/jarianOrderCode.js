/**
 * Canonical Jarian order code (DDL-27).
 *
 * Format: JR-{Y}{MM}{DD}{NN}
 *   Y  = last digit of Jalali year (1405 → 5)
 *   MM = Jalali month, 2 digits
 *   DD = Jalali day, 2 digits
 *   NN = daily sequence, 2 digits, resets each Jalali day
 *
 * Example: 1405/07/02 seq 1 → JR-5070201
 */
import { gregorianToJalali } from '../../../crm/public/calendar.js';

const TEHRAN = 'Asia/Tehran';

function pad2(value) {
  return String(Number(value)).padStart(2, '0');
}

/**
 * @param {{ year: number, month: number, day: number, sequence: number }} parts
 * @returns {string}
 */
export function formatJarianOrderCode({ year, month, day, sequence }) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const n = Number(sequence);
  if (!Number.isInteger(y) || y < 1) {
    throw new Error('ORDER_CODE_INVALID_YEAR');
  }
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    throw new Error('ORDER_CODE_INVALID_MONTH');
  }
  if (!Number.isInteger(d) || d < 1 || d > 31) {
    throw new Error('ORDER_CODE_INVALID_DAY');
  }
  if (!Number.isInteger(n) || n < 1 || n > 99) {
    throw new Error('ORDER_CODE_DAY_EXHAUSTED');
  }
  return `JR-${y % 10}${pad2(m)}${pad2(d)}${pad2(n)}`;
}

/** @param {{ year: number, month: number, day: number }} parts */
export function jalaliDayKey({ year, month, day }) {
  return `${Number(year)}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Jalali Y/M/D for an instant in Asia/Tehran (calendar day boundary).
 * @param {Date} [date]
 * @param {string} [timeZone]
 */
export function jalaliPartsFromInstant(date = new Date(), timeZone = TEHRAN) {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const [gy, gm, gd] = iso.split('-').map(Number);
  return gregorianToJalali(gy, gm, gd);
}
