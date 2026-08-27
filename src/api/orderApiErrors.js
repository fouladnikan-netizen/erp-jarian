/**
 * Map Backend Order rule errors → Persian UX copy.
 */
import { ORDER_RULE_MESSAGES } from '../domain/order/orderLifecycle.js';

const FALLBACK = {
  VERSION_CONFLICT: 'نسخه سفارش تغییر کرده است. دوباره بارگذاری کنید.',
  RAW_LEAD_NOT_ELIGIBLE_FOR_ORDER:
    'لید خام باید ابتدا به شرکت تبدیل شود تا بتوان سفارش ثبت کرد.',
};

export function getOrderApiErrorMessage(error) {
  const data = error?.response?.data;
  const code = data?.error || error?.code;
  if (data?.message && typeof data.message === 'string') {
    return data.message;
  }
  if (code && ORDER_RULE_MESSAGES[code]) {
    return ORDER_RULE_MESSAGES[code];
  }
  if (code && FALLBACK[code]) {
    return FALLBACK[code];
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'ذخیره سفارش ناموفق بود.';
}

export default { getOrderApiErrorMessage };
