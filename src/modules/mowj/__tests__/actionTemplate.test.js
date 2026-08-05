import { describe, expect, it, beforeEach } from 'vitest';
import {
  CAMPAIGN_ACTION_TYPE,
  CAMPAIGN_TYPE,
  TEMPLATE_TYPE,
  TEMPLATE_VARIABLE_CATALOG,
  validateCampaignAction,
  validateTemplate,
  validateTemplateVariables,
  validateContentVariables,
  assertCampaignActionCompatibility,
  assertActionTemplateCompatibility,
  assertCampaignActionTemplateCompatibility,
  normalizeCampaignAction,
  normalizeTemplate,
  buildPooyeshCreateTaskIntent,
  validatePooyeshCreateTaskIntent,
  POOYESH_TASK_INTENT_KIND,
  createCampaignDraft,
  CAMPAIGN_PURPOSE,
} from '../domain';
import {
  __testing,
  createAndActivateCampaign,
  getCampaignDetail,
  getTemplate,
  listTemplates,
} from '../services/campaignFacade';

describe('Action validation', () => {
  it('rejects unknown action types', () => {
    const result = validateCampaignAction({
      actionType: 'SEND_SMS',
      campaignId: 'cmp-x',
    });
    expect(result.ok).toBe(false);
  });

  it('requires template or body for BROADCAST_MESSAGE', () => {
    expect(validateCampaignAction({
      actionType: CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE,
      campaignId: 'cmp-x',
    }).ok).toBe(false);

    expect(validateCampaignAction({
      actionType: CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE,
      campaignId: 'cmp-x',
      templateId: 'tpl-msg-inventory',
    }).ok).toBe(true);
  });

  it('normalizes CampaignAction fields', () => {
    const action = normalizeCampaignAction({
      campaignId: 'cmp-1',
      actionType: CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST,
      templateId: 'tpl-survey-delivery',
      configuration: { surveyFormId: 'nps_delivery' },
    });
    expect(action.id).toBeTruthy();
    expect(action.actionType).toBe('SURVEY_REQUEST');
    expect(action.createdAt).toBeTruthy();
  });
});

describe('Template type validation', () => {
  it('validates MESSAGE / SURVEY / TASK / PHYSICAL templates', () => {
    expect(validateTemplate({
      name: 'اعلام موجودی جدید',
      type: TEMPLATE_TYPE.MESSAGE_TEMPLATE,
      content: { body: 'سلام {{customerName}}' },
      variables: ['customerName'],
    }).ok).toBe(true);

    expect(validateTemplate({
      name: 'رضایت پس از تحویل',
      type: TEMPLATE_TYPE.SURVEY_TEMPLATE,
      content: { surveyFormId: 'nps_delivery' },
    }).ok).toBe(true);

    expect(validateTemplate({
      name: 'bad survey',
      type: TEMPLATE_TYPE.SURVEY_TEMPLATE,
      content: {},
    }).ok).toBe(false);

    expect(validateTemplate({
      name: 'تماس با مشتری',
      type: TEMPLATE_TYPE.TASK_TEMPLATE,
      content: { title: 'تماس با مشتری' },
    }).ok).toBe(true);

    expect(validateTemplate({
      name: 'x',
      type: 'EMAIL_TEMPLATE',
      content: { body: 'a' },
    }).ok).toBe(false);
  });

  it('keeps survey template as form reference only', () => {
    const tpl = normalizeTemplate({
      name: 'رضایت پس از تحویل',
      type: TEMPLATE_TYPE.SURVEY_TEMPLATE,
      content: { surveyFormId: 'nps_delivery', intro: 'hi' },
    });
    expect(tpl.content.surveyFormId).toBe('nps_delivery');
    expect(tpl.content.blocks).toBeUndefined();
    expect(tpl.content.schema).toBeUndefined();
  });
});

describe('Campaign action compatibility', () => {
  it('maps campaign types to actions and templates', () => {
    expect(assertCampaignActionCompatibility(CAMPAIGN_TYPE.BROADCAST, CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE).ok).toBe(true);
    expect(assertCampaignActionCompatibility(CAMPAIGN_TYPE.SURVEY, CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST).ok).toBe(true);
    expect(assertCampaignActionCompatibility(CAMPAIGN_TYPE.TASK, CAMPAIGN_ACTION_TYPE.CREATE_TASK).ok).toBe(true);
    expect(assertCampaignActionCompatibility(CAMPAIGN_TYPE.BROADCAST, CAMPAIGN_ACTION_TYPE.CREATE_TASK).ok).toBe(false);
    expect(assertCampaignActionCompatibility(CAMPAIGN_TYPE.DIGITAL_AD, CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE).ok).toBe(false);

    expect(assertActionTemplateCompatibility(
      CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE,
      TEMPLATE_TYPE.MESSAGE_TEMPLATE,
    ).ok).toBe(true);
    expect(assertActionTemplateCompatibility(
      CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST,
      TEMPLATE_TYPE.MESSAGE_TEMPLATE,
    ).ok).toBe(false);

    expect(assertCampaignActionTemplateCompatibility({
      campaignType: CAMPAIGN_TYPE.TASK,
      actionType: CAMPAIGN_ACTION_TYPE.CREATE_TASK,
      templateType: TEMPLATE_TYPE.TASK_TEMPLATE,
    }).ok).toBe(true);
  });

  it('persists action on campaign create', () => {
    __testing.resetToSeed();
    const created = createAndActivateCampaign({
      ...createCampaignDraft(),
      name: 'کمپین اقدام',
      purpose: CAMPAIGN_PURPOSE.RETENTION,
      campaignType: CAMPAIGN_TYPE.BROADCAST,
      action: normalizeCampaignAction({
        actionType: CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE,
        templateId: 'tpl-msg-inventory',
      }),
      status: 'READY',
    });
    const detail = getCampaignDetail(created.id);
    expect(detail.action.actionType).toBe('BROADCAST_MESSAGE');
    expect(detail.action.templateName).toBe('اعلام موجودی جدید');
    expect(getTemplate('tpl-msg-inventory')?.type).toBe('MESSAGE_TEMPLATE');
    expect(listTemplates({ type: TEMPLATE_TYPE.TASK_TEMPLATE }).some((t) => t.name === 'تماس با مشتری')).toBe(true);
  });
});

describe('Variable contract validation', () => {
  it('accepts known tokens and rejects unknown', () => {
    expect(TEMPLATE_VARIABLE_CATALOG.some((v) => v.token === '{{customerName}}')).toBe(true);
    expect(validateTemplateVariables(['customerName', 'orderNumber', 'campaignName']).ok).toBe(true);
    expect(validateTemplateVariables(['{{companyName}}', 'fakeVar']).ok).toBe(false);
    expect(validateContentVariables('سلام {{customerName}} از {{companyName}}').ok).toBe(true);
    expect(validateContentVariables('سلام {{unknownField}}').ok).toBe(false);
  });
});

describe('Pooyesh task contract boundary', () => {
  it('builds intent without creating tasks', () => {
    const action = normalizeCampaignAction({
      id: 'act-x',
      campaignId: 'cmp-x',
      actionType: CAMPAIGN_ACTION_TYPE.CREATE_TASK,
      templateId: 'tpl-task-call',
    });
    const intent = buildPooyeshCreateTaskIntent({
      campaignId: 'cmp-x',
      action,
      template: {
        id: 'tpl-task-call',
        content: { title: 'تماس با مشتری', description: 'پیگیری' },
      },
      audienceMember: { companyId: '1', contactId: '1' },
    });
    expect(intent.kind).toBe(POOYESH_TASK_INTENT_KIND);
    expect(validatePooyeshCreateTaskIntent(intent).ok).toBe(true);
    expect(intent.title).toContain('تماس');
  });
});
