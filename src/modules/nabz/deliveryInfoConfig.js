/** Delivery / Smart Dispatch — اطلاعات تحویل سفارش */

export function getEmptyDeliveryInfo() {
  return {
    needsShipping: false,
    unloadAddress: '',
    postalCode: '',
    recipientName: '',
    recipientPhone: '',
    shippingNotes: '',
  };
}

/** فیلدهای ذخیره‌شونده روی پروفایل مشتری (بدون فلگ سفارش) */
export function toLastUsedDeliveryInfo(deliveryInfo) {
  if (!deliveryInfo?.needsShipping) return null;
  return {
    unloadAddress: deliveryInfo.unloadAddress?.trim() || '',
    postalCode: deliveryInfo.postalCode?.trim() || '',
    recipientName: deliveryInfo.recipientName?.trim() || '',
    recipientPhone: deliveryInfo.recipientPhone?.trim() || '',
    shippingNotes: deliveryInfo.shippingNotes?.trim() || '',
  };
}

export function validateDeliveryInfo(deliveryInfo) {
  if (!deliveryInfo?.needsShipping) return '';
  if (!deliveryInfo.unloadAddress?.trim()) return 'آدرس محل تخلیه را وارد کنید.';
  if (!deliveryInfo.recipientName?.trim()) return 'نام تحویل‌گیرنده را وارد کنید.';
  if (!deliveryInfo.recipientPhone?.trim()) return 'شماره تماس تحویل‌گیرنده را وارد کنید.';
  return '';
}
