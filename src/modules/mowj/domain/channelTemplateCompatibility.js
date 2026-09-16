/**
 * Template type ↔ channel type compatibility (no send).
 */

import { TEMPLATE_TYPE } from './template.types';

/** MESSAGE_TEMPLATE → communication messaging channels */
export const MESSAGE_TEMPLATE_CHANNELS = Object.freeze([
  'SMS',
  'EMAIL',
  'WHATSAPP',
  'TELEGRAM',
]);

/** SURVEY_TEMPLATE → survey delivery channels */
export const SURVEY_TEMPLATE_CHANNELS = Object.freeze([
  'WHATSAPP',
  'SMS',
  'EMAIL',
]);

/** PHYSICAL_TEMPLATE → physical channels */
export const PHYSICAL_TEMPLATE_CHANNELS = Object.freeze([
  'EXHIBITION',
  'POST',
  'DELIVERY',
  'COURIER',
  'GIFT_DELIVERY',
]);

/**
 * @param {string} templateType
 * @returns {string[]}
 */
export function listCompatibleChannelsForTemplate(templateType) {
  const key = String(templateType || '').toUpperCase();
  if (key === TEMPLATE_TYPE.MESSAGE_TEMPLATE) return [...MESSAGE_TEMPLATE_CHANNELS];
  if (key === TEMPLATE_TYPE.SURVEY_TEMPLATE) return [...SURVEY_TEMPLATE_CHANNELS];
  if (key === TEMPLATE_TYPE.PHYSICAL_TEMPLATE) return [...PHYSICAL_TEMPLATE_CHANNELS];
  return [];
}

/**
 * @param {string} templateType
 * @param {string} channelType
 * @returns {{ ok: boolean, error?: string }}
 */
export function assertTemplateChannelCompatibility(templateType, channelType) {
  const tpl = String(templateType || '').toUpperCase();
  const channel = String(channelType || '').toUpperCase();
  if (!tpl) return { ok: false, error: 'نوع قالب مشخص نیست.' };
  if (!channel) return { ok: false, error: 'کانال مشخص نیست.' };

  const allowed = listCompatibleChannelsForTemplate(tpl);
  if (!allowed.length) {
    return {
      ok: false,
      error: `قالب ${tpl} کانال اجرایی خارجی ندارد (مثلاً TASK فقط پویش).`,
    };
  }
  if (!allowed.includes(channel)) {
    return {
      ok: false,
      error: `کانال ${channel} با قالب ${tpl} سازگار نیست.`,
    };
  }
  return { ok: true };
}
