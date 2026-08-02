/** داده و گزینه‌های موتور قوانین کمپین */

export const CAMPAIGN_TYPES = {
  survey: { id: 'survey', label: 'نظرسنجی' },
  promo: { id: 'promo', label: 'پروموشن' },
  sales: { id: 'sales', label: 'فروش' },
  informational: { id: 'informational', label: 'اطلاع‌رسانی' },
  nurture: { id: 'nurture', label: 'پرورش رابطه' },
  reminder: { id: 'reminder', label: 'یادآوری' },
};

/** برچسب شاخص موفقیت بر اساس نوع کمپین */
export const METRIC_LABEL_BY_TYPE = {
  survey: 'نرخ مشارکت',
  promo: 'نرخ تبدیل',
  sales: 'نرخ تبدیل',
  informational: 'نرخ بازدید',
  nurture: 'نرخ تعامل',
  reminder: 'نرخ بازدید',
};

export function buildMetrics(type, numericValue = 0) {
  const label = METRIC_LABEL_BY_TYPE[type] || 'شاخص موفقیت';
  const safe = Number.isFinite(Number(numericValue)) ? Number(numericValue) : 0;
  return {
    label,
    value: `${safe}%`,
    numeric: safe,
  };
}

export function parseMetricNumeric(metrics) {
  if (!metrics) return 0;
  if (typeof metrics.numeric === 'number') return metrics.numeric;
  const raw = String(metrics.value || '').replace(/[^\d.]/g, '');
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

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
    metrics: buildMetrics('survey', 68),
    triggerId: 'dispatch_48h',
    actionId: 'whatsapp_survey',
    surveyId: 'nps_delivery',
  },
  {
    id: 'cmp-2',
    name: 'تبریک تولد مشتریان',
    type: 'promo',
    status: 'active',
    metrics: buildMetrics('promo', 12),
    triggerId: 'birthday',
    actionId: 'sms',
    surveyId: null,
  },
  {
    id: 'cmp-3',
    name: 'خبرنامه محصولات جدید',
    type: 'informational',
    status: 'paused',
    metrics: buildMetrics('informational', 95),
    triggerId: 'no_followup_7d',
    actionId: 'email',
    surveyId: null,
  },
  {
    id: 'cmp-4',
    name: 'یادآوری تمدید قرارداد',
    type: 'reminder',
    status: 'draft',
    metrics: buildMetrics('reminder', 0),
    triggerId: 'first_purchase',
    actionId: 'email',
    surveyId: 'renewal_intent',
  },
  {
    id: 'cmp-5',
    name: 'رضایت پس از تحویل',
    type: 'survey',
    status: 'active',
    metrics: buildMetrics('survey', 55),
    triggerId: 'order_delivered',
    actionId: 'whatsapp_survey',
    surveyId: 'csat_support',
  },
  {
    id: 'cmp-6',
    name: 'پیشنهاد ویژه انبار',
    type: 'sales',
    status: 'active',
    metrics: buildMetrics('sales', 18),
    triggerId: 'first_purchase',
    actionId: 'sms',
    surveyId: null,
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
