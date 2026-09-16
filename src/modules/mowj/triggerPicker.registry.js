/**
 * Trigger Picker — UI registry (presentation layer only).
 * Maps business-friendly labels to existing domain trigger rule IDs.
 * Does NOT modify domain contracts, automation engine, or evaluator.
 */

import { getTriggerRuleDefinition } from './domain';

/** @typedef {'select'|'radio'} TriggerConfigFieldType */

/**
 * @typedef {object} TriggerPickerDelayOption
 * @property {string} id
 * @property {string} label
 * @property {Record<string, unknown>} [params]
 * @property {boolean} [custom]
 */

/**
 * @typedef {object} TriggerPickerConfigField
 * @property {string} id
 * @property {string} label
 * @property {TriggerConfigFieldType} type
 * @property {Array<{ value: string, label: string }>} [options]
 * @property {string} [placeholder]
 * @property {boolean} [required]
 */

/**
 * @typedef {object} TriggerPickerOption
 * @property {string} id
 * @property {string} domainRuleId
 * @property {string} title
 * @property {string} description
 * @property {boolean} [enabled]
 * @property {{ default?: string, options: TriggerPickerDelayOption[] }} [delaySupport]
 * @property {TriggerPickerConfigField[]} [configSchema]
 */

/**
 * @typedef {object} TriggerPickerCategory
 * @property {string} id
 * @property {string} title
 * @property {string} [moduleLabel]
 * @property {TriggerPickerOption[]} options
 */

/** @type {TriggerPickerCategory[]} */
export const TRIGGER_PICKER_REGISTRY = Object.freeze([
  {
    id: 'delivery-order',
    title: 'تحویل و سفارش',
    moduleLabel: 'نبض',
    options: [
      {
        id: 'order-delivered',
        domainRuleId: 'trg-order-delivered',
        title: 'پس از تحویل سفارش',
        description: 'وقتی سفارش مشتری با موفقیت تحویل داده شد',
        enabled: true,
        delaySupport: {
          default: 'immediate',
          options: [
            { id: 'immediate', label: 'بلافاصله', params: {} },
            { id: '48h', label: '۴۸ ساعت', params: { delayHours: 48, delayLabel: '۴۸ ساعت' } },
            { id: '7d', label: '۷ روز', params: { delayDays: 7, delayLabel: '۷ روز' } },
            { id: '30d', label: '۳۰ روز', params: { delayDays: 30, delayLabel: '۳۰ روز' } },
            { id: 'custom', label: 'سفارشی', custom: true },
          ],
        },
      },
    ],
  },
  {
    id: 'customer-purchase',
    title: 'خرید مشتری',
    moduleLabel: 'نبض',
    options: [
      {
        id: 'first-purchase',
        domainRuleId: 'trg-first-purchase',
        title: 'پس از اولین خرید',
        description: 'برای خوشامدگویی به مشتریان جدید',
        enabled: true,
      },
      {
        id: 'every-purchase',
        domainRuleId: 'trg-order-delivered',
        title: 'پس از هر خرید',
        description: 'پس از ثبت هر سفارش جدید',
        enabled: false,
      },
      {
        id: 'product-purchase',
        domainRuleId: 'trg-first-purchase',
        title: 'پس از خرید محصول مشخص',
        description: 'وقتی مشتری محصول انتخاب‌شده را خریداری کند',
        enabled: false,
        configSchema: [
          {
            id: 'productId',
            label: 'محصول',
            type: 'select',
            placeholder: 'انتخاب محصول…',
            required: true,
            options: [
              { value: 'prod-steel-coil', label: 'کلاف فولادی' },
              { value: 'prod-rebar', label: 'میلگرد' },
              { value: 'prod-sheet', label: 'ورق فولادی' },
            ],
          },
        ],
      },
      {
        id: 'brand-purchase',
        domainRuleId: 'trg-first-purchase',
        title: 'پس از خرید برند مشخص',
        description: 'وقتی مشتری از برند انتخاب‌شده خرید کند',
        enabled: false,
        configSchema: [
          {
            id: 'brandId',
            label: 'برند',
            type: 'select',
            placeholder: 'انتخاب برند…',
            required: true,
            options: [
              { value: 'brand-a', label: 'برند الف' },
              { value: 'brand-b', label: 'برند ب' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'customer-relations',
    title: 'ارتباط با مشتری',
    moduleLabel: 'کانون',
    options: [
      {
        id: 'customer-created',
        domainRuleId: 'trg-customer-created',
        title: 'هنگام ثبت مشتری جدید',
        description: 'بلافاصله پس از ایجاد پرونده مشتری',
        enabled: true,
      },
      {
        id: 'contact-person-created',
        domainRuleId: 'trg-customer-created',
        title: 'هنگام ثبت شخص مرتبط جدید',
        description: 'وقتی شخص مرتبط جدید به مشتری اضافه شود',
        enabled: false,
      },
      {
        id: 'contact-birthday',
        domainRuleId: 'trg-birthday',
        title: 'در روز تولد شخص مرتبط',
        description: 'ارسال پیام مناسبتی بر اساس تاریخ تولد',
        enabled: true,
        configSchema: [
          {
            id: 'sendTiming',
            label: 'زمان ارسال',
            type: 'radio',
            required: true,
            options: [
              { value: 'same_day', label: 'همان روز' },
              { value: '3_days_before', label: '۳ روز قبل' },
              { value: '7_days_before', label: '۷ روز قبل' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'sales',
    title: 'فروش',
    moduleLabel: 'افق',
    options: [
      {
        id: 'lead-created',
        domainRuleId: 'trg-lead-created',
        title: 'هنگام ایجاد سرنخ',
        description: 'وقتی سرنخ جدید در خط فروش ثبت شود',
        enabled: true,
      },
      {
        id: 'opportunity-created',
        domainRuleId: 'trg-opportunity-created',
        title: 'هنگام ایجاد فرصت فروش',
        description: 'وقتی فرصت فروش جدید ایجاد شود',
        enabled: true,
      },
      {
        id: 'opportunity-stage-changed',
        domainRuleId: 'trg-opportunity-created',
        title: 'هنگام تغییر مرحله فرصت',
        description: 'وقتی فرصت به مرحله جدیدی منتقل شود',
        enabled: false,
      },
      {
        id: 'no-followup',
        domainRuleId: 'trg-no-followup-7d',
        title: 'فرصت بدون پیگیری',
        description: 'برای فرصت‌هایی که مدتی پیگیری نشده‌اند',
        enabled: true,
      },
    ],
  },
  {
    id: 'activities',
    title: 'فعالیت‌ها',
    moduleLabel: 'پویش',
    options: [
      {
        id: 'task-completed',
        domainRuleId: 'trg-task-completed',
        title: 'پس از تکمیل فعالیت',
        description: 'وقتی فعالیت یا وظیفه به پایان برسد',
        enabled: true,
      },
      {
        id: 'task-created',
        domainRuleId: 'trg-task-completed',
        title: 'پس از ایجاد فعالیت',
        description: 'وقتی فعالیت جدید برای تیم ثبت شود',
        enabled: false,
      },
      {
        id: 'no-activity',
        domainRuleId: 'trg-task-completed',
        title: 'بدون فعالیت در بازه زمانی',
        description: 'وقتی در بازه مشخص فعالیتی ثبت نشده باشد',
        enabled: false,
      },
    ],
  },
]);

const OPTION_BY_ID = new Map(
  TRIGGER_PICKER_REGISTRY.flatMap((cat) => cat.options.map((opt) => [opt.id, { ...opt, categoryId: cat.id }])),
);

/** @returns {TriggerPickerCategory[]} */
export function listTriggerPickerCategories() {
  return TRIGGER_PICKER_REGISTRY;
}

/** @param {string} optionId */
export function getTriggerPickerOption(optionId) {
  return OPTION_BY_ID.get(String(optionId || '')) || null;
}

/**
 * @typedef {object} TriggerPickerSelection
 * @property {string} optionId
 * @property {string} [delayId]
 * @property {number|null} [customDelayHours]
 * @property {number|null} [customDelayDays]
 * @property {Record<string, string>} [config]
 */

/**
 * @param {TriggerPickerSelection|null|undefined} selection
 * @returns {{ domainRuleId: string, params: Record<string, unknown> }|null}
 */
export function resolveTriggerPickerSelection(selection) {
  if (!selection?.optionId) return null;
  const option = getTriggerPickerOption(selection.optionId);
  if (!option?.enabled || !option.domainRuleId) return null;

  const params = {};

  if (option.delaySupport) {
    const delayId = selection.delayId || option.delaySupport.default || 'immediate';
    const delayOpt = option.delaySupport.options.find((row) => row.id === delayId)
      || option.delaySupport.options[0];
    if (delayOpt?.custom) {
      const hours = selection.customDelayHours != null ? Number(selection.customDelayHours) : null;
      const days = selection.customDelayDays != null ? Number(selection.customDelayDays) : null;
      if (hours != null && hours > 0) {
        params.delayHours = hours;
        params.delayLabel = `${hours.toLocaleString('fa-IR')} ساعت`;
      } else if (days != null && days > 0) {
        params.delayDays = days;
        params.delayLabel = `${days.toLocaleString('fa-IR')} روز`;
      }
    } else if (delayOpt?.params) {
      Object.assign(params, delayOpt.params);
    }
  }

  if (option.configSchema?.length && selection.config) {
    option.configSchema.forEach((field) => {
      const value = selection.config[field.id];
      if (value != null && value !== '') {
        params[field.id] = value;
      }
    });
    if (selection.config.sendTiming === '3_days_before') {
      params.birthdayOffsetDays = -3;
      params.delayLabel = '۳ روز قبل از تولد';
    } else if (selection.config.sendTiming === '7_days_before') {
      params.birthdayOffsetDays = -7;
      params.delayLabel = '۷ روز قبل از تولد';
    } else if (selection.config.sendTiming === 'same_day') {
      params.birthdayOffsetDays = 0;
      params.delayLabel = 'روز تولد';
    }
  }

  return { domainRuleId: option.domainRuleId, params };
}

/**
 * @param {TriggerPickerSelection|null|undefined} selection
 * @returns {boolean}
 */
export function isTriggerPickerSelectionComplete(selection) {
  if (!selection?.optionId) return false;
  const option = getTriggerPickerOption(selection.optionId);
  if (!option?.enabled) return false;

  if (option.delaySupport) {
    const delayId = selection.delayId || option.delaySupport.default || 'immediate';
    const delayOpt = option.delaySupport.options.find((row) => row.id === delayId);
    if (delayOpt?.custom) {
      const hours = selection.customDelayHours != null ? Number(selection.customDelayHours) : null;
      const days = selection.customDelayDays != null ? Number(selection.customDelayDays) : null;
      if (!(hours > 0 || days > 0)) return false;
    }
  }

  if (option.configSchema?.length) {
    for (const field of option.configSchema) {
      if (!field.required) continue;
      const value = selection.config?.[field.id];
      if (value == null || value === '') return false;
    }
  }

  return true;
}

/**
 * Build picker selection from a persisted domain trigger rule (edit mode).
 * @param {object|null|undefined} triggerRule
 * @returns {TriggerPickerSelection|null}
 */
export function triggerPickerSelectionFromRule(triggerRule) {
  if (!triggerRule) return null;
  const def = getTriggerRuleDefinition(triggerRule.id || triggerRule.code) || triggerRule;
  const code = String(def.code || '').toUpperCase();
  const params = { ...(def.params || {}), ...(triggerRule.params || {}) };

  if (code === 'SHIPMENT_48H') {
    return {
      optionId: 'order-delivered',
      delayId: '48h',
      config: {},
    };
  }

  if (code === 'ORDER_DELIVERED') {
    let delayId = 'immediate';
    if (params.delayHours === 48) delayId = '48h';
    else if (params.delayDays === 7) delayId = '7d';
    else if (params.delayDays === 30) delayId = '30d';
    else if (params.delayHours || params.delayDays) {
      return {
        optionId: 'order-delivered',
        delayId: 'custom',
        customDelayHours: params.delayHours ?? null,
        customDelayDays: params.delayDays ?? null,
        config: {},
      };
    }
    return { optionId: 'order-delivered', delayId, config: {} };
  }

  const codeToOption = {
    FIRST_PURCHASE: 'first-purchase',
    CUSTOMER_CREATED: 'customer-created',
    CUSTOMER_BIRTHDAY: 'contact-birthday',
    LEAD_CREATED: 'lead-created',
    OPPORTUNITY_CREATED: 'opportunity-created',
    NO_FOLLOWUP_7D: 'no-followup',
    TASK_COMPLETED: 'task-completed',
  };

  const optionId = codeToOption[code];
  if (!optionId) return null;

  const config = {};
  if (code === 'CUSTOMER_BIRTHDAY') {
    if (params.birthdayOffsetDays === -3) config.sendTiming = '3_days_before';
    else if (params.birthdayOffsetDays === -7) config.sendTiming = '7_days_before';
    else config.sendTiming = 'same_day';
  }

  return { optionId, delayId: 'immediate', config };
}

/**
 * Human-readable label for review / summary screens.
 * @param {TriggerPickerSelection|null|undefined} selection
 * @returns {string}
 */
export function formatTriggerPickerLabel(selection) {
  if (!selection?.optionId) return '—';
  const option = getTriggerPickerOption(selection.optionId);
  if (!option) return '—';

  let label = option.title;

  if (option.delaySupport) {
    const delayId = selection.delayId || option.delaySupport.default;
    if (delayId && delayId !== 'immediate') {
      const delayOpt = option.delaySupport.options.find((row) => row.id === delayId);
      if (delayOpt?.custom) {
        if (selection.customDelayHours) {
          label += ` — ${Number(selection.customDelayHours).toLocaleString('fa-IR')} ساعت بعد`;
        } else if (selection.customDelayDays) {
          label += ` — ${Number(selection.customDelayDays).toLocaleString('fa-IR')} روز بعد`;
        }
      } else if (delayOpt?.label) {
        label += ` — ${delayOpt.label} بعد`;
      }
    }
  }

  if (option.configSchema?.length && selection.config) {
    option.configSchema.forEach((field) => {
      const value = selection.config[field.id];
      if (!value) return;
      const opt = field.options?.find((row) => row.value === value);
      if (opt) label += ` (${opt.label})`;
    });
  }

  return label;
}
