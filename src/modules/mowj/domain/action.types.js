/**
 * CampaignAction domain — what happens after targeting (no channel send).
 */

import { createEntityId, ENTITY_ID_PREFIX } from '../../../domain/identity';
import {
  CAMPAIGN_ACTION_TYPE,
  getCompatibleTemplateType,
  getDefaultActionTypeForCampaign,
} from './action.rules';

export { CAMPAIGN_ACTION_TYPE };

export const CAMPAIGN_ACTION_TYPE_LABELS = Object.freeze({
  BROADCAST_MESSAGE: 'ارسال پیام',
  SURVEY_REQUEST: 'درخواست نظرسنجی',
  CREATE_TASK: 'ایجاد وظیفه پویش',
  PHYSICAL_DELIVERY: 'تحویل فیزیکی',
});

const ACTION_SET = new Set(Object.values(CAMPAIGN_ACTION_TYPE));

/**
 * @typedef {object} CampaignAction
 * @property {string} id
 * @property {string} campaignId
 * @property {string} actionType
 * @property {string|null} templateId
 * @property {number|null} templateVersion  frozen version used by this campaign / execution
 * @property {object} configuration
 * @property {string} createdAt
 */

/**
 * @param {unknown} input
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateCampaignAction(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['اقدام کمپین نامعتبر است.'] };
  }
  const actionType = String(input.actionType || '').toUpperCase();
  if (!ACTION_SET.has(actionType)) {
    errors.push(`نوع اقدام نامعتبر: ${input.actionType || '—'}`);
  }
  if (input.configuration != null && typeof input.configuration !== 'object') {
    errors.push('configuration باید آبجکت باشد.');
  }
  if (actionType === CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST) {
    if (!input.templateId && !input.configuration?.surveyFormId) {
      errors.push('اقدام نظرسنجی نیاز به templateId یا surveyFormId دارد.');
    }
  }
  if (actionType === CAMPAIGN_ACTION_TYPE.CREATE_TASK) {
    if (!input.templateId && !input.configuration?.title) {
      errors.push('اقدام وظیفه نیاز به templateId یا عنوان در configuration دارد.');
    }
  }
  if (actionType === CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE) {
    if (!input.templateId && !input.configuration?.body) {
      errors.push('اقدام پیام نیاز به templateId یا متن در configuration دارد.');
    }
  }
  if (actionType === CAMPAIGN_ACTION_TYPE.PHYSICAL_DELIVERY) {
    if (!input.templateId && !input.configuration?.instructions) {
      errors.push('اقدام فیزیکی نیاز به templateId یا دستورالعمل دارد.');
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * @param {object} input
 * @returns {CampaignAction|null}
 */
export function normalizeCampaignAction(input = {}) {
  const actionType = String(input.actionType || '').toUpperCase();
  if (!ACTION_SET.has(actionType)) return null;

  const nowIso = new Date().toISOString();
  const configuration = input.configuration && typeof input.configuration === 'object'
    ? { ...input.configuration }
    : {};

  return {
    id: input.id != null && input.id !== ''
      ? String(input.id)
      : createEntityId(ENTITY_ID_PREFIX.CAMPAIGN, 'act'),
    campaignId: input.campaignId != null ? String(input.campaignId) : '',
    actionType,
    templateId: input.templateId != null && input.templateId !== ''
      ? String(input.templateId)
      : null,
    templateVersion: input.templateVersion != null && Number.isFinite(Number(input.templateVersion))
      ? Math.floor(Number(input.templateVersion))
      : null,
    configuration,
    createdAt: input.createdAt || nowIso,
  };
}

/**
 * Default action for a campaign type (template optional until user picks).
 * @param {string} campaignType
 * @param {{ campaignId?: string, templateId?: string, configuration?: object }} [opts]
 */
export function createDefaultActionForCampaignType(campaignType, opts = {}) {
  const actionType = getDefaultActionTypeForCampaign(campaignType);
  if (!actionType) return null;
  return normalizeCampaignAction({
    campaignId: opts.campaignId || '',
    actionType,
    templateId: opts.templateId || null,
    templateVersion: opts.templateVersion ?? null,
    configuration: opts.configuration || {},
  });
}

/**
 * @param {CampaignAction} action
 */
export function formatActionConfigurationSummary(action) {
  if (!action) return '—';
  const cfg = action.configuration || {};
  const parts = [];
  if (cfg.channelHint) parts.push(`کانال پیشنهادی: ${cfg.channelHint}`);
  if (cfg.surveyFormId) parts.push(`فرم: ${cfg.surveyFormId}`);
  if (cfg.title) parts.push(`عنوان: ${cfg.title}`);
  if (cfg.body) parts.push('دارای متن پیام');
  if (cfg.notes) parts.push(String(cfg.notes));
  if (!parts.length && action.templateId) {
    parts.push(`قالب متصل`);
  }
  const expectedTpl = getCompatibleTemplateType(action.actionType);
  if (expectedTpl) parts.push(`نوع قالب مورد انتظار: ${expectedTpl}`);
  return parts.length ? parts.join(' · ') : 'بدون پیکربندی اضافه';
}
