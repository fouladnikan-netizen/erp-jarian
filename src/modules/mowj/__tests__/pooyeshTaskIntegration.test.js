import { describe, expect, it, beforeEach } from 'vitest';
import {
  CAMPAIGN_ACTION_TYPE,
  CAMPAIGN_STATUS,
  CAMPAIGN_TYPE,
  EXECUTION_INTENT_STATUS,
  EXECUTION_RESULT_STATUS,
  EXECUTOR_PIPELINE_STATUS,
  POOYESH_TASK_INTENT_KIND,
  TASK_ASSIGNMENT_RULE,
  buildPooyeshCreateTaskIntent,
  createCampaignExecutor,
  createEmptyExecutionResultRepository,
  createExecutorRegistry,
  createInMemoryPooyeshTaskPort,
  createPooyeshTaskExecutor,
  mapTaskTemplateToFields,
  normalizeExecutionIntent,
  resolveTaskAssignee,
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

function makePorts(campaign, template, pooyeshPort) {
  const results = createEmptyExecutionResultRepository();
  const savedIntents = [];
  const registry = createExecutorRegistry({}, { pooyeshTaskPort: pooyeshPort });
  const executor = createCampaignExecutor({
    findCampaign: () => campaign,
    findTemplate: () => template,
    saveExecutionIntent: (intent) => {
      savedIntents.push(intent);
      return intent;
    },
    results,
  }, registry);
  return { executor, results, savedIntents, registry };
}

describe('Executor registry', () => {
  it('CREATE_TASK selects Pooyesh executor', () => {
    const port = createInMemoryPooyeshTaskPort();
    const registry = createExecutorRegistry({}, { pooyeshTaskPort: port });
    const executor = selectExecutor(registry, CAMPAIGN_ACTION_TYPE.CREATE_TASK);
    expect(executor.actionType).toBe(CAMPAIGN_ACTION_TYPE.CREATE_TASK);
    expect(createPooyeshTaskExecutor({ pooyeshTaskPort: port }).actionType).toBe(
      CAMPAIGN_ACTION_TYPE.CREATE_TASK,
    );
  });
});

describe('Task intent + template mapping', () => {
  it('generates TaskCreationIntent with assignment and mapped title', () => {
    const campaign = {
      id: 'cmp-x',
      name: 'کمپین مشتریان بدون خرید',
      owner: { userId: 'u-owner', name: 'مالک کمپین' },
    };
    const action = {
      id: 'act-1',
      campaignId: 'cmp-x',
      actionType: CAMPAIGN_ACTION_TYPE.CREATE_TASK,
      templateId: 'tpl-task-call',
      configuration: {},
    };
    const template = {
      id: 'tpl-task-call',
      content: {
        title: 'تماس پیگیری مشتری — {{companyName}}',
        description: 'مرتبط با کمپین {{campaignName}}',
        priority: 'high',
        dueInDays: 3,
      },
    };

    const mapped = mapTaskTemplateToFields({
      template,
      action,
      campaign,
      audienceReference: { companyId: 'شرکت X', contactId: 'c1' },
      contextVars: { companyName: 'شرکت X', campaignName: campaign.name },
    });
    expect(mapped.title).toContain('شرکت X');
    expect(mapped.description).toContain('کمپین مشتریان بدون خرید');
    expect(mapped.priority).toBe('high');
    expect(mapped.dueDate).toBeTruthy();

    const intent = buildPooyeshCreateTaskIntent({
      campaignId: 'cmp-x',
      action,
      template,
      campaign,
      audienceMember: { companyId: 'co-9', contactId: 'ct-9' },
      contextVars: { companyName: 'شرکت X', campaignName: campaign.name },
    });
    expect(intent.kind).toBe(POOYESH_TASK_INTENT_KIND);
    expect(intent.title).toContain('شرکت X');
    expect(intent.assignedTo.userId).toBe('u-owner');
    expect(intent.campaignReference.campaignId).toBe('cmp-x');
    expect(intent.companyReference.companyId).toBe('co-9');
  });

  it('assignment rule works for campaign owner / fixed user', () => {
    expect(resolveTaskAssignee({
      rule: TASK_ASSIGNMENT_RULE.CAMPAIGN_OWNER,
      campaign: { owner: { userId: 'u1', name: 'علی' } },
    })).toEqual({ userId: 'u1', name: 'علی' });

    expect(resolveTaskAssignee({
      rule: TASK_ASSIGNMENT_RULE.FIXED_USER,
      fixedUser: { userId: 'u-fixed', name: 'کارشناس ثابت' },
    })).toEqual({ userId: 'u-fixed', name: 'کارشناس ثابت' });
  });
});

describe('Pooyesh task execution results', () => {
  it('records successful task creation with real taskId', () => {
    const port = createInMemoryPooyeshTaskPort();
    const campaign = {
      id: 'cmp-ok',
      name: 'کمپین تست',
      status: CAMPAIGN_STATUS.READY,
      campaignType: CAMPAIGN_TYPE.TASK,
      owner: { userId: 'owner-1', name: 'مالک' },
      action: {
        id: 'act-1',
        campaignId: 'cmp-ok',
        actionType: CAMPAIGN_ACTION_TYPE.CREATE_TASK,
        templateId: 'tpl-task-call',
        configuration: {},
      },
    };
    const template = {
      id: 'tpl-task-call',
      content: { title: 'تماس پیگیری', description: 'از کمپین', priority: 'normal', dueInDays: 1 },
    };
    const { executor, results } = makePorts(campaign, template, port);
    const outcome = executor.execute(makeCreateTaskIntent({ id: 'intent-ok', campaignId: 'cmp-ok' }));

    expect(outcome.ok).toBe(true);
    expect(outcome.result.status).toBe(EXECUTION_RESULT_STATUS.SUCCESS);
    expect(outcome.result.referenceId).toMatch(/^pooyesh-task-/);
    expect(outcome.taskCreationIntent.kind).toBe(POOYESH_TASK_INTENT_KIND);
    expect(port.getTask(outcome.result.referenceId)).toBeTruthy();
    expect(results.findByIntentId('intent-ok').payload.assignedTo.name).toBe('مالک');
  });

  it('records failed task creation when port rejects', () => {
    const failingPort = {
      createTask: () => ({
        ok: false,
        taskId: null,
        status: 'FAILED',
        error: 'سرویس پویش در دسترس نیست.',
        assignedTo: null,
      }),
      getTask: () => null,
    };
    const campaign = {
      id: 'cmp-fail-port',
      name: 'کمپین',
      owner: { userId: 'u', name: 'مالک' },
      action: {
        id: 'a',
        actionType: CAMPAIGN_ACTION_TYPE.CREATE_TASK,
        templateId: 'tpl',
        configuration: {},
      },
    };
    const template = { id: 'tpl', content: { title: 'عنوان معتبر' } };
    const { executor, results } = makePorts(campaign, template, failingPort);
    const outcome = executor.execute(
      makeCreateTaskIntent({ id: 'intent-port-fail', campaignId: 'cmp-fail-port' }),
    );
    expect(outcome.ok).toBe(false);
    expect(outcome.result.status).toBe(EXECUTION_RESULT_STATUS.FAILED);
    expect(outcome.result.error).toMatch(/پویش/);
    expect(results.findByIntentId('intent-port-fail')).toBeTruthy();
  });

  it('records failed outcome when template title missing', () => {
    const port = createInMemoryPooyeshTaskPort();
    const { executor, results } = makePorts(
      {
        id: 'cmp-empty',
        action: {
          id: 'a',
          actionType: CAMPAIGN_ACTION_TYPE.CREATE_TASK,
          templateId: 'empty',
          configuration: {},
        },
      },
      { id: 'empty', content: { title: '' } },
      port,
    );
    const outcome = executor.execute(
      makeCreateTaskIntent({ id: 'intent-empty', campaignId: 'cmp-empty' }),
    );
    expect(outcome.ok).toBe(false);
    expect(outcome.result.status).toBe(EXECUTION_RESULT_STATUS.FAILED);
    expect(results.findAll()).toHaveLength(1);
  });
});

describe('Facade Pooyesh integration', () => {
  beforeEach(() => {
    __testing.resetToSeed();
  });

  it('creates real Pooyesh task for seed CREATE_TASK campaign', () => {
    const intent = intentRepositorySave(makeCreateTaskIntent({
      id: 'intent-seed-7',
      campaignId: 'cmp-7',
    }));
    const outcome = executeCampaignIntent(intent);
    expect(outcome.ok).toBe(true);
    expect(outcome.result.referenceId).toMatch(/^ptask-/);

    const detail = getCampaignDetail('cmp-7');
    const row = detail.executorHistory.find((item) => item.intentId === 'intent-seed-7');
    expect(row.pipelineStatus).toBe(EXECUTOR_PIPELINE_STATUS.COMPLETED);
    expect(row.taskId).toBe(outcome.result.referenceId);
    expect(row.assignedToLabel).toBeTruthy();
    expect(row.pooyeshHref).toContain('/pooyesh?taskId=');

    const history = listExecutorHistory('cmp-7');
    expect(history[0].taskId).toBeTruthy();
  });
});
