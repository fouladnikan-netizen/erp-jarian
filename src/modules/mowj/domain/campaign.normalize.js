/**
 * Campaign Core normalize + create helpers.
 */

import { createEntityId, ENTITY_ID_PREFIX } from '../../../domain/identity';
import { MOWJ_DEFAULT_ACTOR_NAME as CURRENT_USER, getMowjTodayJalali as getTodayJalali } from './runtimeDefaults';
import { normalizeAudienceDefinition, createAudienceDefinition } from './audienceDefinition';
import {
  CAMPAIGN_PURPOSE,
  CAMPAIGN_STATUS,
  CAMPAIGN_TYPE,
} from './campaign.constants';
import { getExecutionChannel } from './channel.catalog';
import { normalizeKpiDefinition } from './kpi.types';
import { buildTriggerRule } from './trigger.catalog';
import {
  createDefaultActionForCampaignType,
  normalizeCampaignAction,
} from './action.types';
import { getDefaultActionTypeForCampaign } from './action.rules';

const DEFAULT_TEMPLATE_BY_CAMPAIGN_TYPE = Object.freeze({
  [CAMPAIGN_TYPE.BROADCAST]: 'tpl-msg-inventory',
  [CAMPAIGN_TYPE.SURVEY]: 'tpl-survey-delivery',
  [CAMPAIGN_TYPE.TASK]: 'tpl-task-call',
  [CAMPAIGN_TYPE.PHYSICAL]: 'tpl-physical-gift',
});

const PURPOSE_SET = new Set(Object.values(CAMPAIGN_PURPOSE));
const TYPE_SET = new Set(Object.values(CAMPAIGN_TYPE));
const STATUS_SET = new Set(Object.values(CAMPAIGN_STATUS));

function createLocalId() {
  return createEntityId(ENTITY_ID_PREFIX.CAMPAIGN);
}

function normalizeOwner(input) {
  if (!input || typeof input !== 'object') {
    return {
      userId: 'user-current',
      name: CURRENT_USER,
    };
  }
  return {
    userId: input.userId != null ? String(input.userId) : 'user-current',
    name: String(input.name || CURRENT_USER).trim() || CURRENT_USER,
  };
}

function normalizeTriggerRule(input) {
  if (!input) return null;
  if (typeof input === 'string') return buildTriggerRule(input);
  if (typeof input === 'object') {
    if (input.code || input.id) {
      return buildTriggerRule(input.id || input.code, input.params || {}) || {
        id: String(input.id || input.code),
        code: String(input.code || input.id),
        label: String(input.label || input.code || '—'),
        hint: input.hint || null,
        sourceModule: input.sourceModule || null,
        params: input.params && typeof input.params === 'object' ? { ...input.params } : {},
      };
    }
  }
  return null;
}

/**
 * @param {object} input
 * @param {{ requireId?: boolean }} [options]
 * @returns {object|null}
 */
export function normalizeCampaign(input = {}, options = {}) {
  const name = String(input.name || '').trim();
  if (!name && options.requireId) return null;
  // Builder drafts may have an empty name until the review step.
  if (!name && !input.id && !options.allowEmptyName && options.requireId !== false) return null;

  const purpose = String(input.purpose || '').toUpperCase();
  const campaignType = String(input.campaignType || input.type || '').toUpperCase();
  let status = String(input.status || '').toUpperCase();
  // Legacy Kampayn / early Mowj statuses
  if (status === 'ACTIVE') status = CAMPAIGN_STATUS.READY;
  if (status === 'ARCHIVED') status = CAMPAIGN_STATUS.CANCELLED;

  const channelId = input.executionChannelId != null && input.executionChannelId !== ''
    ? String(input.executionChannelId)
    : (input.executionChannel?.id ? String(input.executionChannel.id) : null);
  const channel = channelId ? getExecutionChannel(channelId) : null;

  const nowIso = new Date().toISOString();
  const campaignId = input.id != null && input.id !== ''
    ? String(input.id)
    : (options.requireId ? null : createLocalId());

  const resolvedType = TYPE_SET.has(campaignType) ? campaignType : CAMPAIGN_TYPE.BROADCAST;
  let action = null;
  if (input.action) {
    action = normalizeCampaignAction({
      ...input.action,
      campaignId: input.action.campaignId || campaignId || '',
    });
  } else if (getDefaultActionTypeForCampaign(resolvedType)) {
    action = createDefaultActionForCampaignType(resolvedType, {
      campaignId: campaignId || '',
      templateId: input.actionTemplateId
        || DEFAULT_TEMPLATE_BY_CAMPAIGN_TYPE[resolvedType]
        || null,
      configuration: input.actionConfiguration || {},
    });
  }

  let surveyFormId = input.surveyFormId != null && input.surveyFormId !== ''
    ? String(input.surveyFormId)
    : (input.surveyId != null && input.surveyId !== '' ? String(input.surveyId) : null);
  if (!surveyFormId && action?.configuration?.surveyFormId) {
    surveyFormId = String(action.configuration.surveyFormId);
  }

  const audienceSegmentId = input.audienceSegmentId != null && input.audienceSegmentId !== ''
    ? String(input.audienceSegmentId)
    : null;

  let audience = null;
  if (input.audience || input.audienceDefinition) {
    audience = normalizeAudienceDefinition(input.audience || input.audienceDefinition);
  }
  // When only segment id is provided without hydrated audience, keep a placeholder;
  // facade hydrates from AudienceRepository before persist.
  if (!audience && input._resolvedAudienceFromSegment) {
    audience = normalizeAudienceDefinition(input._resolvedAudienceFromSegment);
  }
  if (!audience) {
    audience = createAudienceDefinition();
  }

  return {
    id: campaignId,
    name: name || 'بدون نام',
    description: String(input.description || '').trim() || null,
    purpose: PURPOSE_SET.has(purpose) ? purpose : CAMPAIGN_PURPOSE.RETENTION,
    campaignType: resolvedType,
    executionChannelId: channel?.id || null,
    status: STATUS_SET.has(status) ? status : CAMPAIGN_STATUS.DRAFT,
    owner: normalizeOwner(input.owner),
    startDate: String(input.startDate || '').trim() || null,
    endDate: String(input.endDate || '').trim() || null,
    triggerRule: normalizeTriggerRule(input.triggerRule || input.triggerRuleId || input.triggerId),
    audienceSegmentId,
    audience,
    action,
    kpiDefinition: normalizeKpiDefinition(input.kpiDefinition || input.kpi) || null,
    surveyFormId,
    createdAt: input.createdAt || nowIso,
    updatedAt: input.updatedAt || nowIso,
  };
}

/**
 * @param {Partial<object>} [partial]
 */
export function createCampaignDraft(partial = {}) {
  const today = getTodayJalali() || null;
  return normalizeCampaign({
    name: '',
    description: '',
    purpose: CAMPAIGN_PURPOSE.RETENTION,
    campaignType: CAMPAIGN_TYPE.SURVEY,
    executionChannelId: 'WHATSAPP',
    status: CAMPAIGN_STATUS.DRAFT,
    owner: { userId: 'user-current', name: CURRENT_USER },
    startDate: today,
    endDate: null,
    triggerRule: buildTriggerRule('trg-shipment-48h'),
    audience: createAudienceDefinition(),
    kpiDefinition: {
      metricKey: 'SURVEY_RESPONSES',
      label: 'پاسخ‌های نظرسنجی',
      purposeFit: CAMPAIGN_PURPOSE.RETENTION,
      target: null,
    },
    surveyFormId: 'nps_delivery',
    ...partial,
  }, { requireId: false, allowEmptyName: true });
}
