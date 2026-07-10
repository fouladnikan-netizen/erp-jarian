export const ORDER_PROFILE_TABS = {
  GATEWAY: 'gateway',
  COMMENTS: 'comments',
  TIMELINE: 'timeline',
  ATTACHMENTS: 'attachments',
};

export const ORDER_PROFILE_TAB_META = {
  [ORDER_PROFILE_TABS.GATEWAY]: { label: 'گذرگاه' },
  [ORDER_PROFILE_TABS.COMMENTS]: { label: 'میثاق' },
  [ORDER_PROFILE_TABS.TIMELINE]: { label: 'سوابق و تایم‌لاین' },
  [ORDER_PROFILE_TABS.ATTACHMENTS]: { label: 'اسناد و فایل‌ها' },
};

export function getOrderProfileTabOrder() {
  return [
    ORDER_PROFILE_TABS.GATEWAY,
    ORDER_PROFILE_TABS.COMMENTS,
    ORDER_PROFILE_TABS.TIMELINE,
    ORDER_PROFILE_TABS.ATTACHMENTS,
  ];
}

export const ORDER_PROFILE_TAB_ORDER = getOrderProfileTabOrder();
