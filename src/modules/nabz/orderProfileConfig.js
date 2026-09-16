export const ORDER_PROFILE_TABS = {
  GATEWAY: 'gateway',
  COMMENTS: 'comments',
  TIMELINE: 'timeline',
  ATTACHMENTS: 'attachments',
  CORRESPONDENCE: 'correspondence',
};

export const ORDER_PROFILE_TAB_META = {
  [ORDER_PROFILE_TABS.GATEWAY]: { label: 'گذرگاه' },
  [ORDER_PROFILE_TABS.COMMENTS]: { label: 'میثاق' },
  [ORDER_PROFILE_TABS.TIMELINE]: { label: 'سوابق و تایم‌لاین' },
  [ORDER_PROFILE_TABS.ATTACHMENTS]: { label: 'اسناد و فایل‌ها' },
  // DDL-23 product rule 15 — read-only projection of Gahshomar Correspondence
  // by orderId; Nabz never copies/owns the underlying record.
  [ORDER_PROFILE_TABS.CORRESPONDENCE]: { label: 'مکاتبات رسمی' },
};

export function getOrderProfileTabOrder() {
  return [
    ORDER_PROFILE_TABS.GATEWAY,
    ORDER_PROFILE_TABS.COMMENTS,
    ORDER_PROFILE_TABS.TIMELINE,
    ORDER_PROFILE_TABS.ATTACHMENTS,
    ORDER_PROFILE_TABS.CORRESPONDENCE,
  ];
}

export const ORDER_PROFILE_TAB_ORDER = getOrderProfileTabOrder();
