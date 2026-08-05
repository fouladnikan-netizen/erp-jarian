/**
 * Channel Adapter Framework — mock only, no provider send.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  CAMPAIGN_ACTION_TYPE,
  CAMPAIGN_CHANNEL_STATUS,
  CAMPAIGN_STATUS,
  CAMPAIGN_TYPE,
  CHANNEL_EXECUTION_STATUS,
  EXECUTION_INTENT_STATUS,
  EXECUTION_RESULT_STATUS,
  TEMPLATE_TYPE,
  assertTemplateChannelCompatibility,
  createCampaignExecutor,
  createDefaultChannelExecutorRegistry,
  createEmptyChannelExecutionRepository,
  createEmptyExecutionResultRepository,
  createExecutorRegistry,
  createInMemoryPooyeshTaskPort,
  createMockChannelExecutor,
  getCampaignChannelStatus,
  listCompatibleChannelsForTemplate,
  normalizeExecutionIntent,
  selectExecutor,
  createCustomerCreatedEvent,
} from '../domain';
import {
  __testing,
  executeCampaignIntent,
  getCampaignDetail,
} from '../services/campaignFacade';
import { intentRepositorySave } from '../repositories/executionIntentRepository';

function makeBroadcastIntent(overrides = {}) {
  return normalizeExecutionIntent({
    id: overrides.id || 'intent-broadcast-1',
    campaignId: overrides.campaignId || 'cmp-broadcast-1',
    actionType: CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE,
    triggerEvent: createCustomerCreatedEvent({
      companyId: 'co-1',
      contactId: 'ct-1',
      customerId: 'cu-1',
    }),
    audienceReference: {
      companyId: 'co-1',
      contactId: 'ct-1',
      customerId: 'cu-1',
    },
    status: EXECUTION_INTENT_STATUS.PENDING,
    ...overrides,
  });
}

function makeCreateTaskIntent(overrides = {}) {
  return normalizeExecutionIntent({
    id: overrides.id || 'intent-task-ch-1',
    campaignId: overrides.campaignId || 'cmp-7',
    actionType: CAMPAIGN_ACTION_TYPE.CREATE_TASK,
    triggerEvent: createCustomerCreatedEvent({
      companyId: 'co-1',
      contactId: 'ct-1',
      customerId: 'cu-1',
    }),
    audienceReference: {
      companyId: 'co-1',
      contactId: 'ct-1',
      customerId: 'cu-1',
    },
    status: EXECUTION_INTENT_STATUS.PENDING,
    ...overrides,
  });
}

describe('ChannelExecutorRegistry', () => {
  it('resolves SMS / EMAIL / WHATSAPP mock executors', () => {
    const registry = createDefaultChannelExecutorRegistry();
    for (const channel of ['SMS', 'EMAIL', 'WHATSAPP']) {
      const resolved = registry.resolve(channel);
      expect(resolved.ok).toBe(true);
      expect(resolved.executor.channelType).toBe(channel);
      expect(typeof resolved.executor.execute).toBe('function');
    }
    expect(registry.get('SmsChannelExecutor')?.channelType).toBe('SMS');
    expect(registry.get('EmailChannelExecutor')?.channelType).toBe('EMAIL');
    expect(registry.get('WhatsappChannelExecutor')?.channelType).toBe('WHATSAPP');
  });

  it('rejects unsupported channel', () => {
    const registry = createDefaultChannelExecutorRegistry();
    const resolved = registry.resolve('TWILIO_FAKE');
    expect(resolved.ok).toBe(false);
    expect(resolved.error).toMatch(/پشتیبانی/);
  });
});

describe('Template ↔ channel compatibility', () => {
  it('MESSAGE_TEMPLATE allows SMS EMAIL WHATSAPP TELEGRAM', () => {
    const allowed = listCompatibleChannelsForTemplate(TEMPLATE_TYPE.MESSAGE_TEMPLATE);
    expect(allowed).toEqual(['SMS', 'EMAIL', 'WHATSAPP', 'TELEGRAM']);
    expect(assertTemplateChannelCompatibility(TEMPLATE_TYPE.MESSAGE_TEMPLATE, 'SMS').ok).toBe(true);
    expect(assertTemplateChannelCompatibility(TEMPLATE_TYPE.MESSAGE_TEMPLATE, 'GOOGLE_ADS').ok).toBe(false);
  });

  it('SURVEY_TEMPLATE allows WHATSAPP SMS EMAIL', () => {
    const allowed = listCompatibleChannelsForTemplate(TEMPLATE_TYPE.SURVEY_TEMPLATE);
    expect(allowed).toEqual(['WHATSAPP', 'SMS', 'EMAIL']);
    expect(assertTemplateChannelCompatibility(TEMPLATE_TYPE.SURVEY_TEMPLATE, 'TELEGRAM').ok).toBe(false);
  });
});

describe('Mock ChannelExecutor + repository', () => {
  it('saves attempt and mock result via channel-backed action executor', () => {
    const channelRepo = createEmptyChannelExecutionRepository();
    const channelRegistry = createDefaultChannelExecutorRegistry();
    const results = createEmptyExecutionResultRepository();
    const campaign = {
      id: 'cmp-broadcast-1',
      name: 'کمپین پیام',
      status: CAMPAIGN_STATUS.READY,
      campaignType: CAMPAIGN_TYPE.BROADCAST,
      executionChannelId: 'SMS',
      owner: { userId: 'u1', name: 'مالک' },
      action: {
        id: 'act-b1',
        campaignId: 'cmp-broadcast-1',
        actionType: CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE,
        templateId: 'tpl-msg-1',
        templateVersion: 1,
        configuration: {},
      },
    };
    const template = {
      id: 'tpl-msg-1',
      type: TEMPLATE_TYPE.MESSAGE_TEMPLATE,
      version: 1,
      content: { body: 'سلام' },
    };

    const executor = createCampaignExecutor({
      findCampaign: () => campaign,
      findTemplate: () => template,
      saveExecutionIntent: (intent) => intent,
      results,
    }, createExecutorRegistry({}, {
      channelRegistry,
      channelRepository: channelRepo,
    }));

    const outcome = executor.execute(makeBroadcastIntent());
    expect(outcome.ok).toBe(true);
    expect(outcome.result.status).toBe(EXECUTION_RESULT_STATUS.SUCCESS);
    expect(outcome.result.payload?.mocked).toBe(true);
    expect(outcome.result.payload?.channelType).toBe('SMS');

    const saved = channelRepo.listByCampaign('cmp-broadcast-1');
    expect(saved.length).toBe(1);
    expect(saved[0].status).toBe(CHANNEL_EXECUTION_STATUS.MOCKED);
    expect(saved[0].externalReference).toBeTruthy();
    expect(channelRepo.listAttempts('cmp-broadcast-1').length).toBe(1);
  });

  it('mock executor never contacts a provider', () => {
    const sms = createMockChannelExecutor('SMS');
    const result = sms.execute({
      campaignId: 'cmp-x',
      templateVersion: 1,
      audienceSnapshot: { members: [] },
      variables: {},
      metadata: {},
    });
    expect(result.status).toBe(CHANNEL_EXECUTION_STATUS.MOCKED);
    expect(result.mocked).toBe(true);
    expect(result.externalReference).toMatch(/^cmp-/);
  });
});

describe('CREATE_TASK flow unchanged with channel adapters', () => {
  beforeEach(() => {
    __testing.resetToSeed();
  });

  it('still routes CREATE_TASK to Pooyesh and creates a task', () => {
    const port = createInMemoryPooyeshTaskPort();
    const channelRepo = createEmptyChannelExecutionRepository();
    const registry = createExecutorRegistry({}, {
      pooyeshTaskPort: port,
      channelRepository: channelRepo,
    });
    expect(selectExecutor(registry, CAMPAIGN_ACTION_TYPE.CREATE_TASK).actionType)
      .toBe(CAMPAIGN_ACTION_TYPE.CREATE_TASK);

    const campaign = {
      id: 'cmp-task-ch',
      name: 'وظیفه',
      status: CAMPAIGN_STATUS.READY,
      campaignType: CAMPAIGN_TYPE.TASK,
      executionChannelId: null,
      owner: { userId: 'u1', name: 'مالک' },
      action: {
        id: 'act-t',
        campaignId: 'cmp-task-ch',
        actionType: CAMPAIGN_ACTION_TYPE.CREATE_TASK,
        templateId: 'tpl-task-call',
        configuration: {},
      },
    };
    const template = {
      id: 'tpl-task-call',
      type: TEMPLATE_TYPE.TASK_TEMPLATE,
      content: { title: 'تماس', description: 'پیگیری', priority: 'normal' },
    };
    const results = createEmptyExecutionResultRepository();
    const executor = createCampaignExecutor({
      findCampaign: () => campaign,
      findTemplate: () => template,
      saveExecutionIntent: (intent) => intent,
      results,
    }, registry);

    const outcome = executor.execute(makeCreateTaskIntent({
      id: 'intent-task-unchanged',
      campaignId: 'cmp-task-ch',
    }));
    expect(outcome.ok).toBe(true);
    expect(outcome.result.referenceId).toMatch(/^pooyesh-task-/);
    expect(channelRepo.listByCampaign('cmp-task-ch')).toHaveLength(0);
  });

  it('runtime CREATE_TASK via facade still works', () => {
    const intent = intentRepositorySave(makeCreateTaskIntent({
      id: 'intent-runtime-task',
      campaignId: 'cmp-7',
    }));
    const outcome = executeCampaignIntent(intent);
    expect(outcome.ok).toBe(true);
    expect(outcome.result.status).toBe(EXECUTION_RESULT_STATUS.SUCCESS);
    const detail = getCampaignDetail('cmp-7');
    expect(detail.channel).toBeTruthy();
    expect(detail.channel.status).toBeDefined();
  });
});

describe('Campaign channel status (Detail UI)', () => {
  it('reports NOT_CONFIGURED / READY / EXECUTED', () => {
    expect(getCampaignChannelStatus({ executionChannelId: null }).status)
      .toBe(CAMPAIGN_CHANNEL_STATUS.NOT_CONFIGURED);

    expect(getCampaignChannelStatus({
      executionChannelId: 'SMS',
      action: { actionType: CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE },
      actionView: { templateType: TEMPLATE_TYPE.MESSAGE_TEMPLATE },
    }).status).toBe(CAMPAIGN_CHANNEL_STATUS.READY);

    expect(getCampaignChannelStatus({
      executionChannelId: 'SMS',
      action: { actionType: CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE },
      actionView: { templateType: TEMPLATE_TYPE.MESSAGE_TEMPLATE },
    }, {
      channelResults: [{ status: CHANNEL_EXECUTION_STATUS.MOCKED }],
    }).status).toBe(CAMPAIGN_CHANNEL_STATUS.EXECUTED);
  });
});
