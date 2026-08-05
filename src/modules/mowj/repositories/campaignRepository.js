/**
 * Campaign repository — in-memory SSOT until Prisma/API.
 * UI must not hold campaign arrays as source of truth.
 */

import {
  MOWJ_DEFAULT_ACTOR_NAME as CURRENT_USER,
  getMowjTodayJalali as getTodayJalali,
} from '../domain/runtimeDefaults';
import {
  CAMPAIGN_PURPOSE,
  CAMPAIGN_STATUS,
  CAMPAIGN_TYPE,
  AUDIENCE_SOURCE_TYPE,
  AUDIENCE_BASE_SELECTION,
  CONDITION_OPERATOR,
  CAMPAIGN_ACTION_TYPE,
  buildTriggerRule,
  createAudienceDefinition,
  normalizeCampaign,
  normalizeCampaignAction,
} from '../domain';

/** @type {Array<object>} */
let campaigns = seedCampaigns();

function seedCampaigns() {
  const today = getTodayJalali() || '1404/01/20';
  const owner = { userId: 'user-current', name: CURRENT_USER };
  const raw = [
    {
      id: 'cmp-1',
      name: 'رضایت مشتری بعد از ارسال بار',
      description: 'سنجش رضایت پس از تحویل محموله',
      purpose: CAMPAIGN_PURPOSE.RETENTION,
      campaignType: CAMPAIGN_TYPE.SURVEY,
      executionChannelId: 'WHATSAPP',
      status: CAMPAIGN_STATUS.COMPLETED,
      owner,
      startDate: today,
      endDate: null,
      triggerRule: buildTriggerRule('trg-shipment-48h'),
      audience: createAudienceDefinition({
        id: 'aud-1',
        name: 'شرکت‌های دارای سفارش',
        source: AUDIENCE_SOURCE_TYPE.KANOON_COMPANY,
        baseSelection: AUDIENCE_BASE_SELECTION.WITH_ORDERS,
      }),
      action: normalizeCampaignAction({
        id: 'act-1',
        campaignId: 'cmp-1',
        actionType: CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST,
        templateId: 'tpl-survey-delivery',
        configuration: { surveyFormId: 'nps_delivery' },
      }),
      kpiDefinition: {
        metricKey: 'SURVEY_RESPONSES',
        label: 'پاسخ‌های نظرسنجی',
        purposeFit: CAMPAIGN_PURPOSE.RETENTION,
        target: 100,
      },
      surveyFormId: 'nps_delivery',
    },
    {
      id: 'cmp-2',
      name: 'تبریک تولد مشتریان',
      description: null,
      purpose: CAMPAIGN_PURPOSE.RETENTION,
      campaignType: CAMPAIGN_TYPE.BROADCAST,
      executionChannelId: 'SMS',
      status: CAMPAIGN_STATUS.READY,
      owner,
      startDate: today,
      endDate: null,
      triggerRule: buildTriggerRule('trg-birthday'),
      audience: createAudienceDefinition({
        id: 'aud-2',
        name: 'همه شرکت‌های کانون',
        source: AUDIENCE_SOURCE_TYPE.KANOON_COMPANY,
        baseSelection: AUDIENCE_BASE_SELECTION.ALL_COMPANIES,
      }),
      action: normalizeCampaignAction({
        id: 'act-2',
        campaignId: 'cmp-2',
        actionType: CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE,
        templateId: 'tpl-msg-inventory',
        configuration: {},
      }),
      kpiDefinition: {
        metricKey: 'CUSTOMER_ACTIVITY',
        label: 'فعالیت مشتری',
        purposeFit: CAMPAIGN_PURPOSE.RETENTION,
        target: null,
      },
      surveyFormId: null,
    },
    {
      id: 'cmp-3',
      name: 'خبرنامه محصولات جدید',
      description: null,
      purpose: CAMPAIGN_PURPOSE.RETENTION,
      campaignType: CAMPAIGN_TYPE.BROADCAST,
      executionChannelId: 'EMAIL',
      status: CAMPAIGN_STATUS.PAUSED,
      owner,
      startDate: today,
      endDate: null,
      triggerRule: buildTriggerRule('trg-no-followup-7d'),
      audience: createAudienceDefinition({
        id: 'aud-3',
        name: 'شرکت‌های بدون سفارش',
        source: AUDIENCE_SOURCE_TYPE.KANOON_COMPANY,
        baseSelection: AUDIENCE_BASE_SELECTION.WITHOUT_ORDERS,
      }),
      action: normalizeCampaignAction({
        id: 'act-3',
        campaignId: 'cmp-3',
        actionType: CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE,
        templateId: 'tpl-msg-inventory',
        configuration: {},
      }),
      kpiDefinition: {
        metricKey: 'CUSTOMER_ACTIVITY',
        label: 'فعالیت مشتری',
        purposeFit: CAMPAIGN_PURPOSE.RETENTION,
        target: null,
      },
      surveyFormId: null,
    },
    {
      id: 'cmp-4',
      name: 'جذب سرنخ نمایشگاهی',
      description: 'ثبت حضور در نمایشگاه به‌عنوان کمپین جذب',
      purpose: CAMPAIGN_PURPOSE.ACQUISITION,
      campaignType: CAMPAIGN_TYPE.PHYSICAL,
      executionChannelId: 'EXHIBITION',
      status: CAMPAIGN_STATUS.DRAFT,
      owner,
      startDate: today,
      endDate: null,
      triggerRule: buildTriggerRule('trg-customer-created'),
      audience: createAudienceDefinition({
        id: 'aud-4',
        name: 'شرکت‌های نمایشگاه',
        source: AUDIENCE_SOURCE_TYPE.KANOON_COMPANY,
        baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
        rules: [{
          conditionId: 'acquisitionSource',
          operator: CONDITION_OPERATOR.EQUALS,
          value: 'exhibition',
        }],
      }),
      action: normalizeCampaignAction({
        id: 'act-4',
        campaignId: 'cmp-4',
        actionType: CAMPAIGN_ACTION_TYPE.PHYSICAL_DELIVERY,
        templateId: 'tpl-physical-gift',
        configuration: {},
      }),
      kpiDefinition: {
        metricKey: 'LEADS_CREATED',
        label: 'سرنخ ایجادشده',
        purposeFit: CAMPAIGN_PURPOSE.ACQUISITION,
        target: 50,
      },
      surveyFormId: null,
    },
    {
      id: 'cmp-5',
      name: 'رضایت پس از تحویل',
      description: null,
      purpose: CAMPAIGN_PURPOSE.RETENTION,
      campaignType: CAMPAIGN_TYPE.SURVEY,
      executionChannelId: 'WHATSAPP',
      status: CAMPAIGN_STATUS.RUNNING,
      owner,
      startDate: today,
      endDate: null,
      triggerRule: buildTriggerRule('trg-order-delivered'),
      audience: createAudienceDefinition({
        id: 'aud-5',
        name: 'خریداران ورق',
        source: AUDIENCE_SOURCE_TYPE.KANOON_COMPANY,
        baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
        rules: [{
          conditionId: 'purchasedProduct',
          operator: CONDITION_OPERATOR.CONTAINS,
          value: 'ورق',
        }],
      }),
      action: normalizeCampaignAction({
        id: 'act-5',
        campaignId: 'cmp-5',
        actionType: CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST,
        templateId: 'tpl-survey-support',
        configuration: { surveyFormId: 'csat_support' },
      }),
      kpiDefinition: {
        metricKey: 'SURVEY_RESPONSES',
        label: 'پاسخ‌های نظرسنجی',
        purposeFit: CAMPAIGN_PURPOSE.RETENTION,
        target: null,
      },
      surveyFormId: 'csat_support',
    },
    {
      id: 'cmp-6',
      name: 'کمپین تبلیغات دیجیتال (ثبت)',
      description: 'فقط رکورد — بدون اتصال API',
      purpose: CAMPAIGN_PURPOSE.ACQUISITION,
      campaignType: CAMPAIGN_TYPE.DIGITAL_AD,
      executionChannelId: 'GOOGLE_ADS',
      status: CAMPAIGN_STATUS.DRAFT,
      owner,
      startDate: today,
      endDate: null,
      triggerRule: null,
      audience: createAudienceDefinition({
        id: 'aud-6',
        name: 'همه شرکت‌های کانون',
        source: AUDIENCE_SOURCE_TYPE.KANOON_COMPANY,
        baseSelection: AUDIENCE_BASE_SELECTION.ALL_COMPANIES,
      }),
      action: null,
      kpiDefinition: {
        metricKey: 'LEADS_CREATED',
        label: 'سرنخ ایجادشده',
        purposeFit: CAMPAIGN_PURPOSE.ACQUISITION,
        target: 200,
      },
      surveyFormId: null,
    },
    {
      id: 'cmp-7',
      name: 'پیگیری تماس پس از نمایشگاه',
      description: 'ایجاد وظیفه در پویش — بدون ساخت مستقیم تسک',
      purpose: CAMPAIGN_PURPOSE.ACQUISITION,
      campaignType: CAMPAIGN_TYPE.TASK,
      executionChannelId: null,
      status: CAMPAIGN_STATUS.READY,
      owner,
      startDate: today,
      endDate: null,
      triggerRule: buildTriggerRule('trg-customer-created'),
      audience: createAudienceDefinition({
        id: 'aud-7',
        name: 'همه شرکت‌های کانون',
        source: AUDIENCE_SOURCE_TYPE.KANOON_COMPANY,
        baseSelection: AUDIENCE_BASE_SELECTION.ALL_COMPANIES,
      }),
      action: normalizeCampaignAction({
        id: 'act-7',
        campaignId: 'cmp-7',
        actionType: CAMPAIGN_ACTION_TYPE.CREATE_TASK,
        templateId: 'tpl-task-call',
        configuration: {},
      }),
      kpiDefinition: {
        metricKey: 'LEADS_CREATED',
        label: 'سرنخ ایجادشده',
        purposeFit: CAMPAIGN_PURPOSE.ACQUISITION,
        target: null,
      },
      surveyFormId: null,
    },
  ];

  return raw.map((item) => normalizeCampaign(item)).filter(Boolean);
}

function snapshot() {
  return campaigns.map((item) => ({ ...item }));
}

export function repositoryFindAll() {
  return snapshot().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function repositoryFindById(id) {
  if (id == null || id === '') return null;
  return snapshot().find((item) => String(item.id) === String(id)) || null;
}

export function repositorySave(record) {
  const next = normalizeCampaign(record, { requireId: true });
  if (!next?.id) return null;
  next.updatedAt = new Date().toISOString();
  const index = campaigns.findIndex((item) => String(item.id) === String(next.id));
  if (index === -1) {
    if (!next.createdAt) next.createdAt = next.updatedAt;
    campaigns = [next, ...campaigns];
  } else {
    campaigns = campaigns.slice();
    campaigns[index] = {
      ...campaigns[index],
      ...next,
      createdAt: campaigns[index].createdAt,
      updatedAt: next.updatedAt,
    };
  }
  return repositoryFindById(next.id);
}

export function repositorySetStatus(id, status) {
  const existing = repositoryFindById(id);
  if (!existing) return null;
  return repositorySave({ ...existing, status });
}

export function repositoryReplaceAll(nextList) {
  campaigns = (Array.isArray(nextList) ? nextList : [])
    .map((item) => normalizeCampaign(item))
    .filter(Boolean);
  return repositoryFindAll();
}

export function repositoryResetToSeed() {
  campaigns = seedCampaigns();
  return repositoryFindAll();
}

/**
 * @returns {import('../domain/campaign.repository.ports').CampaignRepository}
 */
export function createCampaignRepository() {
  return {
    findAll: repositoryFindAll,
    findById: repositoryFindById,
    save: repositorySave,
    resetToSeed: repositoryResetToSeed,
  };
}
