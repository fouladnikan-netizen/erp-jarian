import { toAsciiDigits, toPersianDigits } from './dateUtils';

function pad(value, length) {
  return String(value).padStart(length, '0');
}

export function normalizeOrderCode(code) {
  return (code || '').replace(/-/g, '');
}

/** JR050111002 → JR-05-01-11-002 */
export function toDisplayOrderCode(code) {
  const normalized = normalizeOrderCode(code);
  if (!normalized.startsWith('JR') || normalized.length < 11) {
    return code || '—';
  }
  return `JR-${normalized.slice(2, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}-${normalized.slice(8)}`;
}

/** JRYYMMDDSSS — بدون خط تیره */
export function formatOrderCode({ yy, mm, dd, serial }) {
  return `JR${pad(yy, 2)}${pad(mm, 2)}${pad(dd, 2)}${pad(serial, 3)}`;
}

/** JR-YY-MM-DD-SSS — هنگام ثبت سفارش جدید */
export function formatOrderCodeDashed({ yy, mm, dd, serial }) {
  return `JR-${pad(yy, 2)}-${pad(mm, 2)}-${pad(dd, 2)}-${pad(serial, 3)}`;
}

export function nextOrderSerial(orders, yy, mm, dd) {
  const prefix = `JR${pad(yy, 2)}${pad(mm, 2)}${pad(dd, 2)}`;
  const sameDay = orders.filter((o) => normalizeOrderCode(o.code).startsWith(prefix));
  if (!sameDay.length) return 1;
  const maxSerial = Math.max(
    ...sameDay.map((o) => Number(normalizeOrderCode(o.code).slice(-3)) || 0),
  );
  return maxSerial + 1;
}

export function buildOrderCode(orders, { yy, mm, dd }) {
  const serial = nextOrderSerial(orders, yy, mm, dd);
  return formatOrderCode({ yy, mm, dd, serial });
}

export function buildOrderCodeDashed(orders, { yy, mm, dd }) {
  const serial = nextOrderSerial(orders, yy, mm, dd);
  return formatOrderCodeDashed({ yy, mm, dd, serial });
}

export function parseMoneyInput(value) {
  if (value == null || value === '') return null;
  const ascii = toAsciiDigits(String(value))
    .replace(/[^\d.]/g, '');
  if (!ascii) return null;
  const num = Number(ascii);
  return Number.isFinite(num) ? num : null;
}

/** نمایش مبلغ با جداکننده سه‌رقمی (ارقام فارسی) */
export function formatAmountRial(amount) {
  const num = typeof amount === 'string' ? parseMoneyInput(amount) : Number(amount);
  if (num == null || !Number.isFinite(num)) return toPersianDigits('0');
  return toPersianDigits(Math.round(num).toLocaleString('en-US')).replace(/,/g, '٬');
}

/** فرمت زنده هنگام تایپ مبلغ (حفظ جداکننده سه‌رقمی) */
export function formatMoneyInputValue(value) {
  if (value == null || value === '') return '';
  const ascii = toAsciiDigits(String(value)).replace(/[^\d]/g, '');
  if (!ascii) return '';
  return toPersianDigits(Number(ascii).toLocaleString('en-US')).replace(/,/g, '٬');
}

export function formatOrderAmount(order) {
  if (order.isPriced === false || order.amountRial == null) {
    return null;
  }
  return `${formatAmountRial(order.amountRial)} ریال`;
}

export function formatRegisteredAt(order) {
  if (!order.registeredDate) return '—';
  return order.registeredTime
    ? `${order.registeredDate} · ${order.registeredTime}`
    : order.registeredDate;
}
