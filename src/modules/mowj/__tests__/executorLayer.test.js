import { describe, expect, it, beforeEach } from 'vitest';
import {
  CAMPAIGN_ACTION_TYPE,
  CAMPAIGN_STATUS,
  CAMPAIGN_TYPE,
  EXECUTION_INTENT_STATUS,
  EXECUTION_RESULT_STATUS,
  EXECUTOR_PIPELINE_STATUS,
  createCampaignExecutor,
  createEmptyExecutionResultRepository,
  createExecutorRegistry,
  createInMemoryPooyeshTaskPort,
  normalizeExecutionIntent,
  selectExecutor,
  createCustomerCreatedEvent,
} from '../domain';
import {
  __testing,
  executeCampaignIntent,
  getCampaignDetail,
  listExecutorHistory,
} from '../services/campaignFacade';
import { intentRepositorySave } from '../repositories/executionIntentRepository';

function makeCreateTaskIntent(overrides = {}) {
  return normalizeExecutionIntent({
    id: overrides.id || 'intent-task-1',
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

describe('Executor registry', () => {
  it('selects PooyeshTaskExecutor for CREATE_TASK', () => {
    const registry = createExecutorRegistry({}, {
      pooyeshTaskPort: createInMemoryPooyeshTaskPort(),
    });
    const executor = selectExecutor(registry, CAMPAIGN_ACTION_TYPE.CREATE_TASK);
    expect(executor).toBeTruthy();
    expect(executor.actionType).toBe(CAMPAIGN_ACTION_TYPE.CREATE_TASK);
  });
});

describe('CampaignExecutor', () => {
  it('consumes CREATE_TASK intent and creates Pooyesh task via port', () => {
    const port = createInMemoryPooyeshTaskPort();
    const campaign = {
      id: 'cmp-exec-1',
      name: 'کمپین اجرا',
      status: CAMPAIGN_STATUS.READY,
      campaignType: CAMPAIGN_TYPE.TASK,
      owner: { userId: 'u1', name: 'مالک' },
      action: {
        id: 'act-1',
        campaignId: 'cmp-exec-1',
        actionType: CAMPAIGN_ACTION_TYPE.CREATE_TASK,
        templateId: 'tpl-task-call',
        configuration: {},
      },
    };
    const template = {
      id: 'tpl-task-call',
      content: { title: 'تماس پیگیری', description: 'از کمپین موج', priority: 'normal' },
    };
    const results = createEmptyExecutionResultRepository();
    const savedIntents = [];
    const executor = createCampaignExecutor({
      findCampaign: () => campaign,
      findTemplate: () => template,
      saveExecutionIntent: (intent) => {
        savedIntents.push(intent);
        return intent;
      },
      results,
    }, createExecutorRegistry({}, { pooyeshTaskPort: port }));

    const intent = makeCreateTaskIntent({ id: 'intent-ok', campaignId: 'cmp-exec-1' });
    const outcome = executor.execute(intent);

    expect(outcome.ok).toBe(true);
    expect(outcome.result.status).toBe(EXECUTION_RESULT_STATUS.SUCCESS);
    expect(outcome.result.referenceId).toMatch(/^pooyesh-task-/);
    expect(outcome.taskCreationIntent.title).toContain('تماس');
    expect(savedIntents[0].status).toBe(EXECUTION_INTENT_STATUS.CONSUMED);
  });

  it('rejects invalid / unknown action types', () => {
    const results = createEmptyExecutionResultRepository();
    const executor = createCampaignExecutor({
      findCampaign: () => null,
      findTemplate: () => null,
      results,
    }, createExecutorRegistry({}, { pooyeshTaskPort: createInMemoryPooyeshTaskPort() }));
    const intent = makeCreateTaskIntent({
      id: 'intent-bad',
      actionType: 'SEND_SMS',
    });
    const outcome = executor.execute(intent);
    expect(outcome.ok).toBe(false);
    expect(outcome.result.status).toBe(EXECUTION_RESULT_STATUS.FAILED);
    expect(outcome.result.error).toMatch(/نامعتبر|Executor/);
  });

  it('records failed executor outcome when task intent cannot be built', () => {
    const results = createEmptyExecutionResultRepository();
    const executor = createCampaignExecutor({
      findCampaign: () => ({
        id: 'cmp-fail',
        action: {
          id: 'act-f',
          campaignId: 'cmp-fail',
          actionType: CAMPAIGN_ACTION_TYPE.CREATE_TASK,
          templateId: 'tpl-empty',
          configuration: {},
        },
      }),
      findTemplate: () => ({ id: 'tpl-empty', content: { title: '' } }),
      results,
    }, createExecutorRegistry({}, { pooyeshTaskPort: createInMemoryPooyeshTaskPort() }));
    const intent = makeCreateTaskIntent({ id: 'intent-fail', campaignId: 'cmp-fail' });
    const outcome = executor.execute(intent);
    expect(outcome.ok).toBe(false);
    expect(outcome.result.status).toBe(EXECUTION_RESULT_STATUS.FAILED);
    expect(results.findAll()).toHaveLength(1);
  });

  it('persists channel executor failures when channel is not configured (no send)', () => {
    const results = createEmptyExecutionResultRepository();
    const executor = createCampaignExecutor({
      findCampaign: () => ({
        id: 'cmp-bc',
        executionChannelId: null,
        action: {
          actionType: CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE,
          templateId: 'tpl-msg-inventory',
        },
      }),
      findTemplate: () => ({
        id: 'tpl-msg-inventory',
        type: 'MESSAGE_TEMPLATE',
        content: { body: 'hi' },
      }),
      results,
    }, createExecutorRegistry({}, { pooyeshTaskPort: createInMemoryPooyeshTaskPort() }));
    const intent = makeCreateTaskIntent({
      id: 'intent-bc',
      campaignId: 'cmp-bc',
      actionType: CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE,
    });
    const outcome = executor.execute(intent);
    expect(outcome.ok).toBe(false);
    expect(outcome.result.status).toBe(EXECUTION_RESULT_STATUS.FAILED);
    expect(outcome.result.error).toMatch(/کانال|پیکربندی/);
  });
});

describe('Facade executor integration', () => {
  beforeEach(() => {
    __testing.resetToSeed();
  });

  it('executes seed CREATE_TASK campaign intent and shows history statuses', () => {
    const intent = intentRepositorySave(makeCreateTaskIntent({
      id: 'intent-seed-7',
      campaignId: 'cmp-7',
    }));
    expect(intent).toBeTruthy();

    const before = listExecutorHistory('cmp-7');
    expect(before.some((row) => (
      row.intentId === 'intent-seed-7'
      && row.pipelineStatus === EXECUTOR_PIPELINE_STATUS.INTENT_CREATED
    ))).toBe(true);

    const outcome = executeCampaignIntent(intent);
    expect(outcome.ok).toBe(true);
    expect(outcome.result.status).toBe(EXECUTION_RESULT_STATUS.SUCCESS);
    expect(outcome.result.referenceId).toMatch(/^ptask-/);

    const detail = getCampaignDetail('cmp-7');
    const row = detail.executorHistory.find((item) => item.intentId === 'intent-seed-7');
    expect(row.pipelineStatus).toBe(EXECUTOR_PIPELINE_STATUS.COMPLETED);
    expect(row.taskId).toBeTruthy();
    expect(row.assignedToLabel).toBeTruthy();
  });
});
