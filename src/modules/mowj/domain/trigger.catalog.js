/**
 * Trigger rule foundation — structure only, no automation engine.
 */

import {
  MOWJ_DOMAIN_EVENT_LABELS,
  TRIGGER_CODE_TO_EVENT_TYPE,
} from './events.contracts';

/**
 * @typedef {object} TriggerRuleDefinition
 * @property {string} id
 * @property {string} code
 * @property {string} label
 * @property {string} [hint]
 * @property {string} [sourceModule]
 * @property {string} [defaultDelay]
 * @property {string} [defaultCondition]
 */

/** @type {TriggerRuleDefinition[]} */
export const TRIGGER_RULE_CATALOG = Object.freeze([
  {
    id: 'trg-shipment-48h',
    code: 'SHIPMENT_48H',
    label: '۴۸ ساعت پس از ارسال بار',
    hint: 'پس از ثبت دیسپچ در رهسپار',
    sourceModule: 'nabz',
    defaultDelay: '۴۸ ساعت',
    defaultCondition: 'وضعیت ارسال = دیسپچ‌شده',
  },
  {
    id: 'trg-no-followup-7d',
    code: 'NO_FOLLOWUP_7D',
    label: '۷ روز بدون پیگیری',
    hint: 'فرصت‌های راکد افق',
    sourceModule: 'ofogh',
    defaultDelay: '۷ روز',
    defaultCondition: 'بدون تعامل / پیگیری',
  },
  {
    id: 'trg-first-purchase',
    code: 'FIRST_PURCHASE',
    label: 'پس از اولین خرید',
    hint: 'تبدیل نوپدید به خریدار',
    sourceModule: 'nabz',
    defaultDelay: 'بلافاصله',
    defaultCondition: 'اولین سفارش موفق',
  },
  {
    id: 'trg-customer-created',
    code: 'CUSTOMER_CREATED',
    label: 'پس از ایجاد مشتری',
    hint: 'ثبت مخاطب جدید در کانون',
    sourceModule: 'kanoon',
    defaultDelay: 'بلافاصله',
    defaultCondition: 'رکورد مشتری ایجاد شد',
  },
  {
    id: 'trg-order-delivered',
    code: 'ORDER_DELIVERED',
    label: 'پس از تحویل سفارش',
    hint: 'وضعیت سفارش = تحویل‌شده',
    sourceModule: 'nabz',
    defaultDelay: 'بلافاصله',
    defaultCondition: 'مرحله سفارش = سرانجام / رهسپار',
  },
  {
    id: 'trg-birthday',
    code: 'CUSTOMER_BIRTHDAY',
    label: 'در روز تولد مشتری',
    hint: 'بر اساس تاریخ تولد پروفایل',
    sourceModule: 'kanoon',
    defaultDelay: 'روز تولد',
    defaultCondition: 'تاریخ تولد = امروز',
  },
  {
    id: 'trg-lead-created',
    code: 'LEAD_CREATED',
    label: 'پس از ایجاد سرنخ',
    hint: 'ثبت سرنخ جدید در افق',
    sourceModule: 'ofogh',
    defaultDelay: 'بلافاصله',
    defaultCondition: 'سرنخ ایجاد شد',
  },
  {
    id: 'trg-opportunity-created',
    code: 'OPPORTUNITY_CREATED',
    label: 'پس از ایجاد فرصت',
    hint: 'فرصت فروش در افق',
    sourceModule: 'ofogh',
    defaultDelay: 'بلافاصله',
    defaultCondition: 'فرصت ایجاد شد',
  },
  {
    id: 'trg-task-completed',
    code: 'TASK_COMPLETED',
    label: 'پس از تکمیل وظیفه پویش',
    hint: 'اتمام فعالیت در پویش',
    sourceModule: 'pooyesh',
    defaultDelay: 'بلافاصله',
    defaultCondition: 'وظیفه تکمیل شد',
  },
]);

const BY_ID = Object.freeze(
  Object.fromEntries(TRIGGER_RULE_CATALOG.map((rule) => [rule.id, rule])),
);
const BY_CODE = Object.freeze(
  Object.fromEntries(TRIGGER_RULE_CATALOG.map((rule) => [rule.code, rule])),
);

/** @param {string} [idOrCode] */
export function getTriggerRuleDefinition(idOrCode) {
  const key = String(idOrCode || '');
  return BY_ID[key] || BY_CODE[key] || null;
}

/**
 * Snapshot embedded on a Campaign (immutable copy of catalog entry + optional params).
 * @param {string} idOrCode
 * @param {Record<string, unknown>} [params]
 */
export function buildTriggerRule(idOrCode, params = {}) {
  const def = getTriggerRuleDefinition(idOrCode);
  if (!def) return null;
  return Object.freeze({
    id: def.id,
    code: def.code,
    label: def.label,
    hint: def.hint || null,
    sourceModule: def.sourceModule || null,
    defaultDelay: def.defaultDelay || null,
    defaultCondition: def.defaultCondition || null,
    params: { ...params },
  });
}

/**
 * Presentation for Campaign Detail trigger section.
 * @param {object|null} rule
 * @returns {{ event: string, condition: string, delay: string }}
 */
export function formatTriggerPresentation(rule) {
  if (!rule) {
    return { event: '—', condition: '—', delay: '—' };
  }
  const def = getTriggerRuleDefinition(rule.id || rule.code) || rule;
  const eventType = TRIGGER_CODE_TO_EVENT_TYPE[rule.code] || null;
  const event = (eventType && MOWJ_DOMAIN_EVENT_LABELS[eventType])
    || rule.label
    || '—';
  const condition = rule.params?.condition
    || def.defaultCondition
    || rule.hint
    || '—';
  const delay = rule.params?.delayLabel
    || (rule.params?.delayHours != null
      ? `${Number(rule.params.delayHours).toLocaleString('fa-IR')} ساعت`
      : null)
    || def.defaultDelay
    || 'بلافاصله';
  return { event, condition, delay };
}
