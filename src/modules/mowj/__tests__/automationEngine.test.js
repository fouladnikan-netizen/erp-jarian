import { describe, expect, it, beforeEach } from 'vitest';
import {
  CAMPAIGN_ACTION_TYPE,
  CAMPAIGN_STATUS,
  CAMPAIGN_TYPE,
  SCHEDULE_KIND,
  createCampaignAutomationEngine,
  createEmptyCampaignAutomationRepository,
  createNoFollowUpDetectedEvent,
  createOrderDeliveredEvent,
  createLeadCreatedEvent,
  evaluateTrigger,
  eventMatchesTriggerCode,
  getCampaignAutomationStatus,
  isCampaignEligibleForAutomation,
  matchEligibleCampaigns,
  validateDelayRule,
} from '../domain';
import {
  __testing,
  evaluateCampaignAutomation,
  getCampaignDetail,
} from '../services/campaignFacade';

function makeCampaign(overrides = {}) {
  return {
    id: overrides.id || 'cmp-auto-1',
    name: 'اتوماسیون تست',
    campaignType: CAMPAIGN_TYPE.SURVEY,
    status: CAMPAIGN_STATUS.READY,
    triggerRule: {
      id: 'trg-shipment-48h',
      code: 'SHIPMENT_48H',
      label: '۴۸ ساعت پس از ارسال بار',
      defaultDelay: '۴۸ ساعت',
      params: {},
    },
    action: {
      actionType: CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST,
      templateId: 'tpl-survey-delivery',
    },
    ...overrides,
  };
}

function makeRepo(campaigns = []) {
  const intents = [];
  return {
    findActiveCampaigns: () => campaigns.filter((c) => isCampaignEligibleForAutomation(c.status)),
    findByTrigger: (key) => campaigns.filter((c) => {
      const code = c.triggerRule?.code;
      if (!code) return false;
      if (code === key) return true;
      return eventMatchesTriggerCode(key, code);
    }),
    saveExecutionIntent: (intent) => {
      intents.unshift(intent);
      return intent;
    },
    listExecutionIntents: () => [...intents],
  };
}

describe('Trigger matching', () => {
  it('matches OrderDelivered to SHIPMENT_48H / ORDER_DELIVERED', () => {
    expect(eventMatchesTriggerCode('OrderDelivered', 'SHIPMENT_48H')).toBe(true);
    expect(eventMatchesTriggerCode('OrderDelivered', 'ORDER_DELIVERED')).toBe(true);

    const event = createOrderDeliveredEvent({ orderId: 'ord-1', companyId: 'co-1' });
    const result = evaluateTrigger(event, {
      code: 'SHIPMENT_48H',
      defaultDelay: '۴۸ ساعت',
    });
    expect(result.matched).toBe(true);
    expect(result.schedule.kind).toBe(SCHEDULE_KIND.DELAY);
    expect(result.schedule.delayHours).toBe(48);
  });

  it('ignores wrong event for trigger', () => {
    expect(eventMatchesTriggerCode('LeadCreated', 'SHIPMENT_48H')).toBe(false);
    const event = createLeadCreatedEvent({ leadId: 'lead-1' });
    const result = evaluateTrigger(event, { code: 'SHIPMENT_48H' });
    expect(result.matched).toBe(false);
  });
});

describe('CampaignMatcher', () => {
  it('allows READY / RUNNING / ACTIVE only', () => {
    expect(isCampaignEligibleForAutomation(CAMPAIGN_STATUS.READY)).toBe(true);
    expect(isCampaignEligibleForAutomation(CAMPAIGN_STATUS.RUNNING)).toBe(true);
    expect(isCampaignEligibleForAutomation('ACTIVE')).toBe(true);
    expect(isCampaignEligibleForAutomation(CAMPAIGN_STATUS.PAUSED)).toBe(false);
    expect(isCampaignEligibleForAutomation(CAMPAIGN_STATUS.CANCELLED)).toBe(false);
    expect(isCampaignEligibleForAutomation(CAMPAIGN_STATUS.DRAFT)).toBe(false);

    const matched = matchEligibleCampaigns([
      makeCampaign({ id: 'a', status: CAMPAIGN_STATUS.READY }),
      makeCampaign({ id: 'b', status: CAMPAIGN_STATUS.PAUSED }),
      makeCampaign({ id: 'c', status: CAMPAIGN_STATUS.CANCELLED }),
    ]);
    expect(matched.map((c) => c.id)).toEqual(['a']);
  });
});

describe('CampaignAutomationEngine', () => {
  it('creates Survey execution intent for OrderDelivered + delay rule', () => {
    const campaign = makeCampaign();
    const engine = createCampaignAutomationEngine(makeRepo([campaign]));
    const event = createOrderDeliveredEvent({
      orderId: 'ord-9',
      companyId: 'co-9',
      customerId: 'cu-9',
    });
    const result = engine.evaluate(event);

    expect(result.ok).toBe(true);
    expect(result.activated).toBe(true);
    expect(result.intents).toHaveLength(1);

    const intent = result.intents[0];
    expect(intent.campaignId).toBe(campaign.id);
    expect(intent.triggerEvent.type).toBe('OrderDelivered');
    expect(intent.actionType).toBe(CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST);
    expect(intent.audienceReference).toMatchObject({
      orderId: 'ord-9',
      companyId: 'co-9',
      customerId: 'cu-9',
    });
    expect(intent.createdAt).toBeTruthy();
    expect(intent.schedule.kind).toBe(SCHEDULE_KIND.DELAY);
    expect(intent.schedule.delayHours).toBe(48);
  });

  it('creates Task execution intent for NoFollowUpDetected + 7 day delay', () => {
    const campaign = makeCampaign({
      id: 'cmp-task',
      campaignType: CAMPAIGN_TYPE.TASK,
      triggerRule: {
        id: 'trg-no-followup-7d',
        code: 'NO_FOLLOWUP_7D',
        defaultDelay: '۷ روز',
      },
      action: {
        actionType: CAMPAIGN_ACTION_TYPE.CREATE_TASK,
        templateId: 'tpl-task-followup',
      },
    });
    const engine = createCampaignAutomationEngine(makeRepo([campaign]));
    const event = createNoFollowUpDetectedEvent({ leadId: 'lead-7', opportunityId: 'opp-7' });
    const result = engine.evaluate(event);

    expect(result.activated).toBe(true);
    expect(result.intents[0].actionType).toBe(CAMPAIGN_ACTION_TYPE.CREATE_TASK);
    expect(result.intents[0].schedule.kind).toBe(SCHEDULE_KIND.DELAY);
    expect(result.intents[0].schedule.delayDays).toBe(7);
  });

  it('ignores wrong event against eligible campaign', () => {
    const campaign = makeCampaign();
    const engine = createCampaignAutomationEngine(makeRepo([campaign]));
    const result = engine.evaluate(createLeadCreatedEvent({ leadId: 'l-1' }));
    expect(result.ok).toBe(true);
    expect(result.activated).toBe(false);
    expect(result.intents).toHaveLength(0);
  });

  it('ignores paused campaign', () => {
    const paused = makeCampaign({ id: 'cmp-paused', status: CAMPAIGN_STATUS.PAUSED });
    const engine = createCampaignAutomationEngine(makeRepo([paused]));
    const result = engine.evaluate(createOrderDeliveredEvent({ orderId: 'o-1' }));
    expect(result.activated).toBe(false);
    expect(result.ignored.some((row) => (
      row.campaignId === 'cmp-paused' && /متوقف/.test(row.reason)
    ))).toBe(true);
  });

  it('ignores cancelled campaign', () => {
    const cancelled = makeCampaign({ id: 'cmp-cancel', status: CAMPAIGN_STATUS.CANCELLED });
    const engine = createCampaignAutomationEngine(makeRepo([cancelled]));
    const result = engine.evaluate(createOrderDeliveredEvent({ orderId: 'o-2' }));
    expect(result.activated).toBe(false);
    expect(result.ignored.some((row) => (
      row.campaignId === 'cmp-cancel' && /لغو/.test(row.reason)
    ))).toBe(true);
  });

  it('empty repository produces no intents', () => {
    const engine = createCampaignAutomationEngine(createEmptyCampaignAutomationRepository());
    const result = engine.evaluate(createOrderDeliveredEvent({ orderId: 'o-3' }));
    expect(result.ok).toBe(true);
    expect(result.activated).toBe(false);
  });
});

describe('Delay rule validation', () => {
  it('requires positive delay for DELAY kind', () => {
    expect(validateDelayRule({ delayHours: 48 }).ok).toBe(true);
    expect(validateDelayRule({ delayDays: 7 }).ok).toBe(true);
    expect(validateDelayRule({}).ok).toBe(false);
    expect(validateDelayRule({ delayHours: 0 }).ok).toBe(false);
  });
});

describe('Automation status + facade', () => {
  beforeEach(() => {
    __testing.resetToSeed();
  });

  it('exposes automation readiness on campaign detail', () => {
    const detail = getCampaignDetail('cmp-2');
    expect(detail.automation).toBeTruthy();
    expect(detail.automation.triggerConfigured).toBe(true);
    expect(detail.automation.actionConfigured).toBe(true);
    expect(detail.automation.readyForAutomation).toBe(true);
    expect(detail.automation.labels.readyForAutomation).toBe('آماده برای اتوماسیون');
  });

  it('getCampaignAutomationStatus reflects incomplete action', () => {
    const status = getCampaignAutomationStatus({
      status: CAMPAIGN_STATUS.READY,
      triggerRule: { code: 'ORDER_DELIVERED' },
      action: { actionType: CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST },
    });
    expect(status.triggerConfigured).toBe(true);
    expect(status.actionConfigured).toBe(false);
    expect(status.readyForAutomation).toBe(false);
  });

  it('facade evaluateCampaignAutomation is decision-only (no channel send)', () => {
    const result = evaluateCampaignAutomation(
      createOrderDeliveredEvent({ orderId: 'seed-ord', companyId: 'seed-co' }),
    );
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.intents)).toBe(true);
    expect(result).not.toHaveProperty('sentMessages');
  });
});
