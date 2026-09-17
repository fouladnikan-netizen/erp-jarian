/**
 * NPS inch display for pipe Types whose size identity is stored as a
 * decimal inch (0.5 = 1/2"). Display-only: not SKU, not UOM conversion.
 * Shared Attribute Definition `size` stays millimetre in the registry.
 * Category لوله Types (except لوله داربست) bind `size_pipe` (UOM اینچ).
 * Overlay still accepts leftover `size` codes on the closed Type list.
 * Seamless welded fittings reuse size_pipe plus run/branch/large/small
 * (type-gated; pipes do not bind those codes). Forged / threaded / flange
 * Types use the same overlay for size_pipe / size_run / size_branch /
 * size_large / size_small (DDL-63).
 */

import { toPersianDigits } from './normalize.js';

export const NPS_INCH_SIZE_TYPE_NAMES = Object.freeze([
  'لوله تست گاز',
  'لوله API',
  'لوله تست آب',
  'لوله گالوانیزه',
  'لوله جدار چاه',
  'لوله اسپیرال',
  'لوله درزدار',
  'لوله مانیسمان',
  'زانو ۹۰ درجه مانیسمان',
  'زانو ۴۵ درجه مانیسمان',
  'زانو ۱۸۰ درجه مانیسمان (U-Bend)',
  'سه راهی مساوی مانیسمان',
  'سه راهی تبدیلی مانیسمان',
  'تبدیل هم‌مرکز مانیسمان',
  'تبدیل غیرهم‌مرکز مانیسمان',
  'کپ مانیسمان (درپوش)',
  'تبدیل لبه‌دار (استب اند)',
  'زانو ساکت‌ولد',
  'سه راهی مساوی ساکت‌ولد',
  'سه راهی تبدیلی ساکت‌ولد',
  'کاپلینگ ساکت‌ولد (بوشن)',
  'نیم‌بوشن ساکت‌ولد',
  'مهره ماسوره ساکت‌ولد',
  'کپ ساکت‌ولد',
  'تردوولت / ساکوولت (اتصالات انشعابی)',
  'زانو دنده‌ای فشار قوی',
  'سه راهی دنده‌ای فشار قوی',
  'مغزی فشار قوی',
  'زانو دنده‌ای',
  'سه راهی مساوی دنده‌ای',
  'سه راهی تبدیلی دنده‌ای',
  'چپقی دنده‌ای (زانو مغزی)',
  'مغزی دنده‌ای',
  'بوشن دنده‌ای',
  'تبدیل دنده‌ای (روپیچ توپیچ)',
  'مهره ماسوره دنده‌ای',
  'درپوش دنده‌ای (چهارگوش/شش‌گوش)',
  'فلنج گلودار جوشی',
  'فلنج اسلیپون (روکار)',
  'فلنج کور',
  'فلنج ساکت‌ولد',
  'فلنج دنده‌ای',
  'فلنج لبه‌دار',
  'فلنج لبه‌دار (لپ جوینت)',
]);
export const NPS_INCH_SIZE_CODE = 'size';
export const NPS_INCH_SIZE_CODES = Object.freeze([
  'size',
  'size_pipe',
  'size_run',
  'size_branch',
  'size_large',
  'size_small',
]);
export const NPS_INCH_UNIT_FA = 'اینچ';

export function usesNpsInchSize(typeName) {
  return NPS_INCH_SIZE_TYPE_NAMES.includes(String(typeName || ''));
}

const LATIN_LABELS = Object.freeze({
  0.5: '1/2',
  0.75: '3/4',
  1: '1',
  1.25: '1 1/4',
  1.5: '1 1/2',
  2: '2',
  2.5: '2 1/2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  8: '8',
  10: '10',
  12: '12',
  14: '14',
  16: '16',
  18: '18',
  20: '20',
  24: '24',
  28: '28',
  30: '30',
  32: '32',
});

export function npsInchLatinLabel(size) {
  const n = Number(size);
  if (!Number.isFinite(n)) return '';
  return LATIN_LABELS[n] || '';
}

export { toPersianDigits };

export function formatNpsInchDisplay(size) {
  const n = Number(size);
  if (!Number.isFinite(n)) return '';
  const latin = npsInchLatinLabel(size);
  if (latin) return `${toPersianDigits(latin)} ${NPS_INCH_UNIT_FA}`;
  return `${toPersianDigits(String(n))} ${NPS_INCH_UNIT_FA}`;
}

export function applyNpsInchSizeDisplay({ typeName, code, displayValue, unitLabel } = {}) {
  if (!usesNpsInchSize(typeName) || !NPS_INCH_SIZE_CODES.includes(code)) {
    return { displayValue, unitLabel };
  }
  const formatted = formatNpsInchDisplay(displayValue);
  if (!formatted) return { displayValue, unitLabel };
  return { displayValue: formatted, unitLabel: null };
}

export default {
  NPS_INCH_SIZE_TYPE_NAMES,
  NPS_INCH_SIZE_CODE,
  NPS_INCH_SIZE_CODES,
  NPS_INCH_UNIT_FA,
  usesNpsInchSize,
  npsInchLatinLabel,
  formatNpsInchDisplay,
  applyNpsInchSizeDisplay,
};
