import { describe, expect, it, beforeEach } from 'vitest';
import {
  CAMPAIGN_PURPOSE,
  CAMPAIGN_STATUS,
  CAMPAIGN_TYPE,
  normalizeCampaign,
  createCampaignDraft,
  getExecutionChannel,
  buildTriggerRule,
  canTransitionCampaignStatus,
  assertCampaignTransition,
  createShipmentDeliveredEvent,
  MOWJ_DOMAIN_EVENT_TYPE,
  buildSnapshotMembersFromAudience,
  normalizeAudienceSnapshot,
  normalizeCampaignExecution,
  EXECUTION_STATUS,
  refKanoonContact,
  refNabzOrder,
} from '../domain';
import {
  __testing,
  createAndActivateCampaign,
  getCampaignDetail,
  listCampaigns,
  prepareCampaignExecution,
  toggleCampaignStatus,
} from '../services/campaignFacade';

describe('Mowj Campaign Core', () => {
  beforeEach(() => {
    __testing.resetToSeed();
  });

  it('normalizes a campaign with purpose, type, channel, trigger, kpi', () => {
    const campaign = normalizeCampaign({
      name: 'تست',
      purpose: CAMPAIGN_PURPOSE.ACQUISITION,
      campaignType: CAMPAIGN_TYPE.DIGITAL_AD,
      executionChannelId: 'GOOGLE_ADS',
      triggerRule: buildTriggerRule('trg-customer-created'),
      kpiDefinition: {
        metricKey: 'LEADS_CREATED',
        label: 'سرنخ ایجادشده',
        purposeFit: 'ACQUISITION',
        target: 10,
      },
    });
    expect(campaign.purpose).toBe('ACQUISITION');
    expect(campaign.campaignType).toBe('DIGITAL_AD');
    expect(campaign.executionChannelId).toBe('GOOGLE_ADS');
    expect(getExecutionChannel('GOOGLE_ADS')?.integrationReady).toBe(false);
    expect(campaign.triggerRule.code).toBe('CUSTOMER_CREATED');
    expect(campaign.kpiDefinition.target).toBe(10);
    expect(campaign.metrics).toBeUndefined();
  });

  it('maps legacy ACTIVE status to READY', () => {
    const campaign = normalizeCampaign({
      name: 'legacy',
      status: 'ACTIVE',
    });
    expect(campaign.status).toBe(CAMPAIGN_STATUS.READY);
  });

  it('lists campaigns without fake success metrics', () => {
    const rows = listCampaigns();
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows[0].kpiLabel).toBeTruthy();
    expect(rows[0].metrics).toBeUndefined();
    expect(rows[0].purposeLabel).toBeTruthy();
  });

  it('creates campaign in READY and toggles RUNNING ↔ PAUSED', () => {
    const created = createAndActivateCampaign({
      ...createCampaignDraft(),
      name: 'کمپین جدید موج',
      purpose: CAMPAIGN_PURPOSE.RETENTION,
      campaignType: CAMPAIGN_TYPE.TASK,
      executionChannelId: null,
      status: CAMPAIGN_STATUS.READY,
    });
    expect(created.status).toBe(CAMPAIGN_STATUS.READY);
    expect(created.name).toBe('کمپین جدید موج');
    expect(toggleCampaignStatus(created.id)).toBeNull();
  });
});

describe('Mowj Campaign Lifecycle', () => {
  it('allows DRAFT → READY → RUNNING → COMPLETED', () => {
    expect(canTransitionCampaignStatus('DRAFT', 'READY')).toBe(true);
    expect(canTransitionCampaignStatus('READY', 'RUNNING')).toBe(true);
    expect(canTransitionCampaignStatus('RUNNING', 'COMPLETED')).toBe(true);
    expect(assertCampaignTransition('DRAFT', 'RUNNING').ok).toBe(false);
    expect(assertCampaignTransition('COMPLETED', 'READY').ok).toBe(false);
  });
});

describe('Mowj Campaign Execution Foundation', () => {
  beforeEach(() => {
    __testing.resetToSeed();
  });

  it('exposes seed execution history for completed campaign', () => {
    const detail = getCampaignDetail('cmp-1');
    expect(detail.campaign.name).toContain('رضایت');
    expect(detail.executions.length).toBeGreaterThanOrEqual(1);
    expect(detail.executions[0].targetCount).toBe(3);
    expect(detail.executions[0].successCount).toBe(0);
    expect(detail.canPrepareExecution).toBe(false);
  });

  it('prepareExecution freezes audience snapshot and creates PREPARED run', () => {
    const result = prepareCampaignExecution('cmp-4');
    expect(result.ok).toBe(true);
    expect(result.execution.status).toBe(EXECUTION_STATUS.PREPARED);
    expect(result.snapshot.memberCount).toBe(result.execution.targetCount);
    expect(result.execution.successCount).toBe(0);
    expect(result.execution.failureCount).toBe(0);

    const detail = getCampaignDetail('cmp-4');
    expect(detail.campaign.status).toBe(CAMPAIGN_STATUS.READY);
    expect(detail.executions.some((row) => row.id === result.execution.id)).toBe(true);
  });

  it('builds snapshot members from audience refs', () => {
    const members = buildSnapshotMembersFromAudience({
      contactIds: ['c1'],
      leadIds: ['l1'],
    });
    expect(members).toHaveLength(2);
    const snap = normalizeAudienceSnapshot({
      campaignId: 'cmp-x',
      members,
    });
    expect(snap.memberCount).toBe(2);
  });

  it('defines event contracts without dispatching', () => {
    const event = createShipmentDeliveredEvent({
      orderId: 'ord-1',
      companyId: 'co-1',
    });
    expect(event.type).toBe(MOWJ_DOMAIN_EVENT_TYPE.SHIPMENT_DELIVERED);
    expect(event.sourceModule).toBe('nabz');
    expect(event.payload.orderId).toBe('ord-1');
  });

  it('exposes opaque module refs without coupling', () => {
    expect(refKanoonContact('ct-1').kind).toBe('kanoon.contact');
    expect(refNabzOrder('ord-1', 'sh-1').shipmentId).toBe('sh-1');
  });

  it('normalizes CampaignExecution counters as non-negative integers', () => {
    const row = normalizeCampaignExecution({
      campaignId: 'cmp-x',
      targetCount: 10.7,
      successCount: -2,
      failureCount: '3',
    });
    expect(row.targetCount).toBe(10);
    expect(row.successCount).toBe(0);
    expect(row.failureCount).toBe(3);
  });
});
