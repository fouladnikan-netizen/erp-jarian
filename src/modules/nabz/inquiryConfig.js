/** نوع تامین در استعلام — رسمی / غیررسمی / مغایرت */
export const SUPPLY_CHANNEL_TYPES = ['رسمی', 'غیررسمی', 'مغایرت'];

export const SUPPLY_TYPE_DISCREPANCY = 'مغایرت';

export function isDiscrepancySupplyType(type) {
  return type === SUPPLY_TYPE_DISCREPANCY;
}

export const ORDER_DETAIL_TABS = {
  OVERVIEW: 'overview',
  INQUIRIES: 'inquiries',
  EVENTS: 'events',
};

export const ORDER_DETAIL_TAB_META = {
  [ORDER_DETAIL_TABS.OVERVIEW]: { label: 'اطلاعات سفارش' },
  [ORDER_DETAIL_TABS.INQUIRIES]: { label: 'استعلام و قیمت‌گذاری' },
  [ORDER_DETAIL_TABS.EVENTS]: { label: 'رویدادها' },
};

export const INQUIRY_STATUS = {
  DRAFT: 'draft',
  FINALIZED: 'finalized',
};

export const INQUIRY_STATUS_LABEL = {
  [INQUIRY_STATUS.DRAFT]: 'پیش‌نویس',
  [INQUIRY_STATUS.FINALIZED]: 'تکمیل‌شده',
};

export const ITEM_INQUIRY_STATUS = {
  PENDING: 'pending',
  READY: 'ready',
};

export const ITEM_INQUIRY_STATUS_LABEL = {
  [ITEM_INQUIRY_STATUS.PENDING]: 'در انتظار استعلام',
  [ITEM_INQUIRY_STATUS.READY]: 'آماده برای مرحله بعدی',
};
