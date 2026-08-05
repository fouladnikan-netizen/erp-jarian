/**
 * Campaign type ↔ Action type ↔ Template type compatibility rules.
 */

import { CAMPAIGN_TYPE } from './campaign.constants';
import { TEMPLATE_TYPE } from './template.types';

export const CAMPAIGN_ACTION_TYPE = Object.freeze({
  BROADCAST_MESSAGE: 'BROADCAST_MESSAGE',
  SURVEY_REQUEST: 'SURVEY_REQUEST',
  CREATE_TASK: 'CREATE_TASK',
  PHYSICAL_DELIVERY: 'PHYSICAL_DELIVERY',
});

/**
 * Primary mapping: CampaignType → ActionType
 */
export const CAMPAIGN_TYPE_TO_ACTION = Object.freeze({
  [CAMPAIGN_TYPE.BROADCAST]: CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE,
  [CAMPAIGN_TYPE.SURVEY]: CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST,
  [CAMPAIGN_TYPE.TASK]: CAMPAIGN_ACTION_TYPE.CREATE_TASK,
  [CAMPAIGN_TYPE.PHYSICAL]: CAMPAIGN_ACTION_TYPE.PHYSICAL_DELIVERY,
  [CAMPAIGN_TYPE.DIGITAL_AD]: null,
});

/**
 * ActionType → TemplateType
 */
export const ACTION_TYPE_TO_TEMPLATE = Object.freeze({
  [CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE]: TEMPLATE_TYPE.MESSAGE_TEMPLATE,
  [CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST]: TEMPLATE_TYPE.SURVEY_TEMPLATE,
  [CAMPAIGN_ACTION_TYPE.CREATE_TASK]: TEMPLATE_TYPE.TASK_TEMPLATE,
  [CAMPAIGN_ACTION_TYPE.PHYSICAL_DELIVERY]: TEMPLATE_TYPE.PHYSICAL_TEMPLATE,
});

/** @param {string} campaignType */
export function getDefaultActionTypeForCampaign(campaignType) {
  const key = String(campaignType || '').toUpperCase();
  return CAMPAIGN_TYPE_TO_ACTION[key] ?? null;
}

/** @param {string} actionType */
export function getCompatibleTemplateType(actionType) {
  const key = String(actionType || '').toUpperCase();
  return ACTION_TYPE_TO_TEMPLATE[key] || null;
}

/**
 * @param {string} campaignType
 * @param {string} actionType
 * @returns {{ ok: boolean, error?: string }}
 */
export function assertCampaignActionCompatibility(campaignType, actionType) {
  const expected = getDefaultActionTypeForCampaign(campaignType);
  const action = String(actionType || '').toUpperCase();
  if (!expected) {
    return {
      ok: false,
      error: `نوع کمپین ${campaignType} اقدام اجرایی داخلی ندارد (مثلاً تبلیغات دیجیتال فقط ثبت است).`,
    };
  }
  if (action !== expected) {
    return {
      ok: false,
      error: `اقدام ${action} با نوع کمپین ${campaignType} سازگار نیست (مورد انتظار: ${expected}).`,
    };
  }
  return { ok: true };
}

/**
 * @param {string} actionType
 * @param {string} templateType
 * @returns {{ ok: boolean, error?: string }}
 */
export function assertActionTemplateCompatibility(actionType, templateType) {
  const expected = getCompatibleTemplateType(actionType);
  const tpl = String(templateType || '').toUpperCase();
  if (!expected) {
    return { ok: false, error: `نوع اقدام ${actionType} قالب متناظر ندارد.` };
  }
  if (tpl !== expected) {
    return {
      ok: false,
      error: `قالب ${tpl} با اقدام ${actionType} سازگار نیست (مورد انتظار: ${expected}).`,
    };
  }
  return { ok: true };
}

/**
 * Full check: campaign type + action + template type.
 * @param {{ campaignType: string, actionType: string, templateType?: string|null }} input
 */
export function assertCampaignActionTemplateCompatibility(input = {}) {
  const a = assertCampaignActionCompatibility(input.campaignType, input.actionType);
  if (!a.ok) return a;
  if (input.templateType) {
    return assertActionTemplateCompatibility(input.actionType, input.templateType);
  }
  return { ok: true };
}
