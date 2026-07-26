export const CRM_ACTIVITY_TYPES = {
  CALL: 'call',
  NOTE: 'note',
  MESSAGE: 'message',
  MEETING: 'meeting',
  PAYMENT: 'payment',
};

export const CRM_ACTIVITY_META = {
  [CRM_ACTIVITY_TYPES.CALL]: { label: 'تماس', icon: '📞' },
  [CRM_ACTIVITY_TYPES.NOTE]: { label: 'یادداشت', icon: '📝' },
  [CRM_ACTIVITY_TYPES.MESSAGE]: { label: 'پیام', icon: '💬' },
  [CRM_ACTIVITY_TYPES.MEETING]: { label: 'جلسه', icon: '📅' },
  [CRM_ACTIVITY_TYPES.PAYMENT]: { label: 'دریافت وجه', icon: '💰' },
};

export const CRM_ACTIVITY_ORDER = [
  CRM_ACTIVITY_TYPES.CALL,
  CRM_ACTIVITY_TYPES.NOTE,
  CRM_ACTIVITY_TYPES.MESSAGE,
  CRM_ACTIVITY_TYPES.MEETING,
  CRM_ACTIVITY_TYPES.PAYMENT,
];

export const CRM_TIMELINE_FILTERS = {
  ALL: 'all',
  CALLS: 'calls',
  NOTES: 'notes',
  REMINDERS: 'reminders',
};

export const CRM_TIMELINE_FILTER_META = {
  [CRM_TIMELINE_FILTERS.ALL]: { label: 'همه' },
  [CRM_TIMELINE_FILTERS.CALLS]: { label: 'تماس‌ها' },
  [CRM_TIMELINE_FILTERS.NOTES]: { label: 'یادداشت‌ها' },
  [CRM_TIMELINE_FILTERS.REMINDERS]: { label: 'یادآورهای فعال' },
};

export const CRM_TIMELINE_FILTER_ORDER = [
  CRM_TIMELINE_FILTERS.ALL,
  CRM_TIMELINE_FILTERS.CALLS,
  CRM_TIMELINE_FILTERS.NOTES,
  CRM_TIMELINE_FILTERS.REMINDERS,
];

export const CRM_FOLLOW_UP_ACTIONS = [
  'تماس مجدد',
  'ارسال پیش‌فاکتور',
  'پیگیری پرداخت',
  'جلسه حضوری',
  'ارسال پیام',
];

export const CRM_MENTION_OPTIONS = [
  { handle: 'کاشف', roleLabel: 'کاشف' },
  { handle: 'شوالیه', roleLabel: 'شوالیه' },
];

export const CRM_ASSIGNEE_OPTIONS = [
  { value: 'knight', label: 'شوالیه' },
  { value: 'explorer', label: 'کاشف' },
];

export const CRM_ROLE_LABELS = {
  knight: 'شوالیه',
  explorer: 'کاشف',
  leader: 'راهبر',
  branch: 'شعبه',
  watcher: 'ناظر',
  manager: 'راهبر',
};
