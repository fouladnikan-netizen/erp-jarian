import { describe, expect, it, beforeEach } from 'vitest';
import {
  CAMPAIGN_ACTION_TYPE,
  TEMPLATE_STATUS,
  TEMPLATE_TYPE,
  TEMPLATE_VARIABLE_CATALOG,
  TemplateValidator,
  assertActionTemplateCompatibility,
  createTemplateVersionSnapshot,
  normalizeTemplate,
  validateContentVariables,
  validateTemplate,
  validateTemplateForAction,
  validateTemplateVariables,
} from '../domain';
import {
  __testing,
  createAndActivateCampaign,
  createTemplateVersion,
  getCampaignDetail,
  getTemplate,
  listTemplates,
  saveTemplate,
} from '../services/campaignFacade';

describe('Template validation', () => {
  it('requires fields by template type', () => {
    expect(validateTemplate({
      name: 'پیام',
      type: TEMPLATE_TYPE.MESSAGE_TEMPLATE,
      content: { body: '' },
    }).ok).toBe(false);

    expect(validateTemplate({
      name: 'پیام',
      type: TEMPLATE_TYPE.MESSAGE_TEMPLATE,
      content: { body: 'سلام {{customerName}}' },
    }).ok).toBe(true);

    expect(validateTemplate({
      name: 'نظرسنجی',
      type: TEMPLATE_TYPE.SURVEY_TEMPLATE,
      content: {},
    }).ok).toBe(false);
  });

  it('validates allowed variables only (no render)', () => {
    expect(validateTemplateVariables(['customerName', 'companyName']).ok).toBe(true);
    expect(validateTemplateVariables(['deliveryDate']).ok).toBe(true);
    expect(validateTemplateVariables(['unknownVar']).ok).toBe(false);
    expect(validateContentVariables('تحویل {{deliveryDate}} برای {{orderNumber}}').ok).toBe(true);
    expect(TEMPLATE_VARIABLE_CATALOG.some((v) => v.key === 'deliveryDate')).toBe(true);
  });
});

describe('Type compatibility', () => {
  it('enforces SURVEY_REQUEST → SURVEY_TEMPLATE and CREATE_TASK → TASK_TEMPLATE', () => {
    expect(assertActionTemplateCompatibility(
      CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST,
      TEMPLATE_TYPE.SURVEY_TEMPLATE,
    ).ok).toBe(true);
    expect(assertActionTemplateCompatibility(
      CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST,
      TEMPLATE_TYPE.MESSAGE_TEMPLATE,
    ).ok).toBe(false);

    expect(validateTemplateForAction({
      actionType: CAMPAIGN_ACTION_TYPE.CREATE_TASK,
      templateType: TEMPLATE_TYPE.TASK_TEMPLATE,
    }).ok).toBe(true);
    expect(validateTemplateForAction({
      actionType: CAMPAIGN_ACTION_TYPE.CREATE_TASK,
      templateType: TEMPLATE_TYPE.SURVEY_TEMPLATE,
    }).ok).toBe(false);

    expect(TemplateValidator.validateForAction({
      actionType: CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE,
      templateType: TEMPLATE_TYPE.MESSAGE_TEMPLATE,
    }).ok).toBe(true);
  });
});

describe('Version creation', () => {
  beforeEach(() => {
    __testing.resetToSeed();
  });

  it('creates v2 while keeping history for old references', () => {
    const before = getTemplate('tpl-survey-delivery');
    expect(before.version).toBe(1);
    expect(before.name).toContain('رضایت');

    const result = createTemplateVersion('tpl-survey-delivery', {
      name: 'رضایت مشتری',
      type: TEMPLATE_TYPE.SURVEY_TEMPLATE,
      status: TEMPLATE_STATUS.ACTIVE,
      content: {
        surveyFormId: 'nps_delivery',
        intro: 'نسخه ۲ — {{orderNumber}} / {{deliveryDate}}',
      },
      variables: ['orderNumber', 'deliveryDate', 'campaignName'],
    });

    expect(result.template.version).toBe(2);
    expect(result.history.length).toBeGreaterThanOrEqual(2);
    expect(result.history.some((row) => row.version === 1)).toBe(true);
    expect(result.history.some((row) => row.version === 2)).toBe(true);

    const snap = createTemplateVersionSnapshot(normalizeTemplate({
      id: 'tpl-x',
      name: 'تست',
      type: TEMPLATE_TYPE.MESSAGE_TEMPLATE,
      content: { body: 'سلام {{customerName}}' },
      version: 3,
    }));
    expect(snap.version).toBe(3);
    expect(snap.templateId).toBe('tpl-x');
  });
});

describe('Campaign template reference', () => {
  beforeEach(() => {
    __testing.resetToSeed();
  });

  it('pins template version on campaign action reference', () => {
    const campaign = createAndActivateCampaign({
      name: 'کمپین با قالب نسخه‌دار',
      purpose: 'RETENTION',
      campaignType: 'SURVEY',
      audienceSegmentId: 'seg-tehran-contacts',
      action: {
        actionType: CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST,
        templateId: 'tpl-survey-delivery',
      },
    });

    expect(campaign.action.templateId).toBe('tpl-survey-delivery');
    expect(campaign.action.templateVersion).toBe(1);

    createTemplateVersion('tpl-survey-delivery', {
      name: 'رضایت مشتری',
      type: TEMPLATE_TYPE.SURVEY_TEMPLATE,
      content: {
        surveyFormId: 'nps_delivery',
        intro: 'نسخه جدید',
      },
    });

    const detail = getCampaignDetail(campaign.id);
    expect(detail.action.templateName).toBeTruthy();
    expect(detail.action.templateVersion).toBe(1);

    const latest = getTemplate('tpl-survey-delivery');
    expect(latest.version).toBe(2);
  });

  it('lists templates as independent entities', () => {
    const created = saveTemplate({
      name: 'قالب مستقل تست',
      type: TEMPLATE_TYPE.MESSAGE_TEMPLATE,
      status: TEMPLATE_STATUS.ACTIVE,
      content: { body: 'سلام {{companyName}}' },
      variables: ['companyName'],
    });
    expect(created?.id).toBeTruthy();
    expect(listTemplates({ type: TEMPLATE_TYPE.MESSAGE_TEMPLATE })
      .some((row) => row.id === created.id)).toBe(true);
  });
});
