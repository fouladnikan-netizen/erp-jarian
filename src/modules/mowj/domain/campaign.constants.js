/**
 * Mowj (موج) — Campaign Core constants / enums.
 * Catalogs only — no channel provider integrations.
 */

export const CAMPAIGN_PURPOSE = Object.freeze({
  RETENTION: 'RETENTION',
  ACQUISITION: 'ACQUISITION',
});

export const CAMPAIGN_PURPOSE_LABELS = Object.freeze({
  RETENTION: 'نگهداشت',
  ACQUISITION: 'جذب',
});

export const CAMPAIGN_TYPE = Object.freeze({
  BROADCAST: 'BROADCAST',
  SURVEY: 'SURVEY',
  TASK: 'TASK',
  PHYSICAL: 'PHYSICAL',
  DIGITAL_AD: 'DIGITAL_AD',
});

export const CAMPAIGN_TYPE_LABELS = Object.freeze({
  BROADCAST: 'انتشار پیام',
  SURVEY: 'نظرسنجی',
  TASK: 'ایجاد فعالیت در پویش',
  PHYSICAL: 'اقدام فیزیکی',
  DIGITAL_AD: 'تبلیغات دیجیتال',
});

/** @deprecated Import from campaign.lifecycle — kept for transitional re-exports */
export {
  CAMPAIGN_STATUS,
  CAMPAIGN_STATUS_LABELS,
} from './campaign.lifecycle';

export const CHANNEL_CATEGORY = Object.freeze({
  COMMUNICATION: 'COMMUNICATION',
  DIGITAL: 'DIGITAL',
  PHYSICAL: 'PHYSICAL',
});

export const CHANNEL_CATEGORY_LABELS = Object.freeze({
  COMMUNICATION: 'ارتباطی',
  DIGITAL: 'دیجیتال',
  PHYSICAL: 'فیزیکی',
});

/** Audience source contracts — targeting not executed yet. */
export const AUDIENCE_SOURCE = Object.freeze({
  KANOON_CONTACTS: 'KANOON_CONTACTS',
  OFOGH_LEADS: 'OFOGH_LEADS',
  SEGMENT: 'SEGMENT',
  MANUAL: 'MANUAL',
});

/**
 * KPI metric keys by purpose family (definitions only — no stored fake results).
 */
export const KPI_METRIC = Object.freeze({
  SURVEY_RESPONSES: 'SURVEY_RESPONSES',
  REPEAT_PURCHASE: 'REPEAT_PURCHASE',
  CUSTOMER_ACTIVITY: 'CUSTOMER_ACTIVITY',
  LEADS_CREATED: 'LEADS_CREATED',
  OPPORTUNITIES_CREATED: 'OPPORTUNITIES_CREATED',
  ORDERS_GENERATED: 'ORDERS_GENERATED',
});

export const KPI_METRIC_LABELS = Object.freeze({
  SURVEY_RESPONSES: 'پاسخ‌های نظرسنجی',
  REPEAT_PURCHASE: 'خرید مجدد',
  CUSTOMER_ACTIVITY: 'فعالیت مشتری',
  LEADS_CREATED: 'سرنخ ایجادشده',
  OPPORTUNITIES_CREATED: 'فرصت ایجادشده',
  ORDERS_GENERATED: 'سفارش ایجادشده',
});
