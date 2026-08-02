/** داده و گزینه‌های موتور قوانین کمپین */

export const CAMPAIGN_TYPES = {
  survey: { id: 'survey', label: 'نظرسنجی' },
  promo: { id: 'promo', label: 'پروموشن' },
  nurture: { id: 'nurture', label: 'پرورش رابطه' },
  reminder: { id: 'reminder', label: 'یادآوری' },
};

export const CAMPAIGN_STATUSES = {
  active: { id: 'active', label: 'فعال' },
  paused: { id: 'paused', label: 'متوقف' },
  draft: { id: 'draft', label: 'پیش‌نویس' },
};

export const TRIGGER_OPTIONS = [
  { id: 'dispatch_48h', label: '۴۸ ساعت پس از ارسال بار', hint: 'پس از ثبت دیسپچ در رهسپار' },
  { id: 'birthday', label: 'در روز تولد مشتری', hint: 'بر اساس تاریخ تولد پروفایل' },
  { id: 'order_delivered', label: 'پس از تحویل سفارش', hint: 'وضعیت سفارش = تحویل‌شده' },
  { id: 'no_followup_7d', label: '۷ روز بدون پیگیری', hint: 'فرصت‌های راکد افق' },
  { id: 'first_purchase', label: 'پس از اولین خرید', hint: 'تبدیل نوپدید به خریدار' },
];

export const ACTION_OPTIONS = [
  { id: 'sms', label: 'ارسال پیامک', hint: 'متن کوتاه از طریق پنل پیامکی' },
  { id: 'whatsapp_survey', label: 'لینک نظرسنجی واتساپ', hint: 'پیام واتساپ + فرم پیوست' },
  { id: 'email', label: 'ارسال ایمیل', hint: 'قالب ایمیلی سازمانی' },
  { id: 'internal_task', label: 'وظیفه داخلی', hint: 'یادآور برای شوالیه مسئول' },
];

export const SURVEY_FORMS = [
  { id: 'nps_delivery', label: 'NPS تحویل کالا' },
  { id: 'csat_support', label: 'رضایت پشتیبانی' },
  { id: 'product_feedback', label: 'بازخورد کیفیت محصول' },
  { id: 'renewal_intent', label: 'قصد تمدید قرارداد' },
];

export const INITIAL_CAMPAIGNS = [
  {
    id: 'cmp-1',
    name: 'نظرسنجی پس از ارسال',
    type: 'survey',
    status: 'active',
    responseRate: 42,
    conversionRate: 18,
    triggerId: 'dispatch_48h',
    actionId: 'whatsapp_survey',
    surveyId: 'nps_delivery',
  },
  {
    id: 'cmp-2',
    name: 'تبریک تولد مشتریان',
    type: 'promo',
    status: 'active',
    responseRate: 61,
    conversionRate: 27,
    triggerId: 'birthday',
    actionId: 'sms',
    surveyId: null,
  },
  {
    id: 'cmp-3',
    name: 'بازفعال‌سازی فرصت‌های راکد',
    type: 'nurture',
    status: 'paused',
    responseRate: 23,
    conversionRate: 9,
    triggerId: 'no_followup_7d',
    actionId: 'internal_task',
    surveyId: null,
  },
  {
    id: 'cmp-4',
    name: 'یادآوری تمدید قرارداد',
    type: 'reminder',
    status: 'draft',
    responseRate: 0,
    conversionRate: 0,
    triggerId: 'first_purchase',
    actionId: 'email',
    surveyId: 'renewal_intent',
  },
  {
    id: 'cmp-5',
    name: 'رضایت پس از تحویل',
    type: 'survey',
    status: 'active',
    responseRate: 55,
    conversionRate: 21,
    triggerId: 'order_delivered',
    actionId: 'whatsapp_survey',
    surveyId: 'csat_support',
  },
];

export function createEmptyDraft() {
  return {
    name: '',
    type: 'survey',
    triggerId: TRIGGER_OPTIONS[0].id,
    actionId: ACTION_OPTIONS[1].id,
    surveyId: SURVEY_FORMS[0].id,
  };
}

export function findLabel(list, id) {
  return list.find((item) => item.id === id)?.label || '—';
}
