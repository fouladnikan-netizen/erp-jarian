/**
 * Mowj domain runtime defaults — no Nabz/Kanoon/Ofogh imports.
 * Adapters may later inject clock / actor from platform identity.
 */

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function toPersianDigits(value) {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Display name for seed / draft actor until Shirazeh session is injected. */
export const MOWJ_DEFAULT_ACTOR_NAME = 'کاربر جاری';

export const MOWJ_DEFAULT_ACTOR = Object.freeze({
  userId: 'user-current',
  name: MOWJ_DEFAULT_ACTOR_NAME,
});

/**
 * Jalali calendar date for domain defaults (YYYY/MM/DD, Persian digits).
 * Pure Intl — no Nabz dateUtils dependency.
 */
export function getMowjTodayJalali() {
  try {
    const parts = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      calendar: 'persian',
    }).formatToParts(new Date());
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (year && month && day) return `${year}/${month}/${day}`;
  } catch {
    /* fallback below */
  }
  return toPersianDigits('1404/01/12');
}
