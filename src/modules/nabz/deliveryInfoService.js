import {
  getEmptyDeliveryInfo,
  toLastUsedDeliveryInfo,
  validateDeliveryInfo,
} from './deliveryInfoConfig';
import {
  getCustomerById,
  getCustomerLastUsedDeliveryInfo,
  updateCustomerLastUsedDeliveryInfo,
} from './customers';
import { GATEWAY_DECISION_OUTCOMES } from './gatewayDecisionConfig';
import { ORDER_TABS, isPhase2Stage } from './config';
import { TADAROK_LINE_STATUS } from './tadarokStageConfig';
import { getTadarokLines } from './tadarokStageService';

export {
  getEmptyDeliveryInfo,
  toLastUsedDeliveryInfo,
  validateDeliveryInfo,
};

/**
 * دکمه «محل ارسال» فقط بعد از تأیید سفارش (ورود به فاز تحقق) معنا دارد.
 * در مراحل کاوش/مظنه/پیش‌کشِ قبل از تأیید مخفی است؛
 * اگر سفارش تأیید شده باشد و کاربر به مراحل قبل رجوع کند، همچنان نمایش داده می‌شود.
 */
export function canShowDeliveryLocationAction(order) {
  if (!order) return false;
  if (order.gatewayDecision?.outcome === GATEWAY_DECISION_OUTCOMES.SUCCESS) return true;
  if (order.status === ORDER_TABS.SUCCESS && isPhase2Stage(order.stageId)) return true;
  return false;
}

/**
 * دکمه «سفارش ارسال» پس از تأیید سفارش دیده می‌شود،
 * ولی فقط وقتی حداقل یک قلم خرید شده باشد فعال است.
 */
export function canShowDeliveryOrderAction(order) {
  return canShowDeliveryLocationAction(order);
}

export function canEnableDeliveryOrderAction(order) {
  if (!canShowDeliveryOrderAction(order)) return false;
  return getTadarokLines(order).some(
    (line) => line.status === TADAROK_LINE_STATUS.PO_ISSUED,
  );
}

/**
 * Prefill فرم تحویل از پروفایل مشتری (Last-Used) یا از خود سفارش
 */
export function resolveDeliveryInfoPrefill(order) {
  if (order?.deliveryInfo) {
    return {
      ...getEmptyDeliveryInfo(),
      ...order.deliveryInfo,
      needsShipping: Boolean(order.deliveryInfo.needsShipping),
    };
  }

  const lastUsed = getCustomerLastUsedDeliveryInfo(order?.customerId);
  if (!lastUsed) return getEmptyDeliveryInfo();

  return {
    ...getEmptyDeliveryInfo(),
    needsShipping: true,
    unloadAddress: lastUsed.unloadAddress || '',
    postalCode: lastUsed.postalCode || '',
    recipientName: lastUsed.recipientName || '',
    recipientPhone: lastUsed.recipientPhone || '',
    shippingNotes: lastUsed.shippingNotes || '',
  };
}

/**
 * ذخیره روی سفارش + همگام‌سازی LastUsed روی پروفایل مشتری (کانون)
 */
export function applyDeliveryInfoToOrder(order, deliveryInfo) {
  const nextInfo = {
    ...getEmptyDeliveryInfo(),
    ...(deliveryInfo || {}),
    needsShipping: Boolean(deliveryInfo?.needsShipping),
  };

  if (nextInfo.needsShipping && order?.customerId) {
    const lastUsed = toLastUsedDeliveryInfo(nextInfo);
    if (lastUsed) {
      updateCustomerLastUsedDeliveryInfo(order.customerId, lastUsed);
    }
  }

  return {
    ...order,
    deliveryInfo: nextInfo,
  };
}

export function hasOrderDeliveryInfo(order) {
  return Boolean(order?.deliveryInfo?.needsShipping);
}

export function getOrderDeliverySummary(order) {
  const info = order?.deliveryInfo;
  if (!info?.needsShipping) return null;
  return {
    unloadAddress: info.unloadAddress || '—',
    postalCode: info.postalCode || '—',
    recipientName: info.recipientName || '—',
    recipientPhone: info.recipientPhone || '—',
    shippingNotes: info.shippingNotes || '',
  };
}

/** برای صورت‌بار / حواله ارسال — اولویت با اطلاعات سفارش */
export function getDeliveryRecipientForShipping(order) {
  const info = order?.deliveryInfo;
  if (info?.needsShipping) {
    const customer = getCustomerById(order.customerId);
    return {
      companyName: customer?.companyName || customer?.personName || order.customer || '—',
      name: info.recipientName || customer?.companyName || customer?.personName || order.customer || '—',
      nationalId: customer?.nationalId || '—',
      phone: info.recipientPhone || '—',
      postalCode: info.postalCode || '—',
      address: info.unloadAddress || '—',
      shippingNotes: info.shippingNotes || '',
    };
  }
  return null;
}
