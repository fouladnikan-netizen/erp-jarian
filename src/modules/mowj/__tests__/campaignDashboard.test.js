/**
 * Campaign Management Dashboard — aggregation from real attribution/execution.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  ATTRIBUTION_ENTITY_TYPE,
  CAMPAIGN_PURPOSE,
  CAMPAIGN_STATUS,
  CAMPAIGN_TYPE,
  DASHBOARD_EMPTY_MESSAGE,
  DASHBOARD_RANK_METRIC,
  EXECUTION_STATUS,
  createCampaignDashboardService,
  createLeadCreatedEvent,
  createOpportunityCreatedEvent,
  createOrderCreatedEvent,
  createSurveyResponseReceivedEvent,
  createTaskCompletedEvent,
  normalizeCampaignAttribution,
  rankCampaignPerformance,
  normalizeCampaignPerformanceView,
} from '../domain';
import {
  __testing,
  attributeCampaignEvent,
  getCampaignDashboard,
} from '../services/campaignFacade';
import { executionRepositorySave } from '../repositories/executionRepository';
import { normalizeCampaignExecution } from '../domain/execution.types';

function makePorts({ campaigns = [], executions = [], attributionsByCampaign = {} } = {}) {
  return {
    listCampaigns: () => campaigns,
    listExecutions: () => executions,
    listExecutionResults: () => [],
    getCampaignAttributions: (id) => attributionsByCampaign[String(id)] || [],
  };
}

describe('CampaignDashboardService aggregation', () => {
  it('aggregates campaign status counts', () => {
    const service = createCampaignDashboardService(makePorts({
      campaigns: [
        { id: 'a', name: 'A', status: CAMPAIGN_STATUS.DRAFT, purpose: CAMPAIGN_PURPOSE.ACQUISITION, campaignType: CAMPAIGN_TYPE.BROADCAST },
        { id: 'b', name: 'B', status: CAMPAIGN_STATUS.READY, purpose: CAMPAIGN_PURPOSE.ACQUISITION, campaignType: CAMPAIGN_TYPE.TASK },
        { id: 'c', name: 'C', status: CAMPAIGN_STATUS.RUNNING, purpose: CAMPAIGN_PURPOSE.RETENTION, campaignType: CAMPAIGN_TYPE.SURVEY },
        { id: 'd', name: 'D', status: CAMPAIGN_STATUS.COMPLETED, purpose: CAMPAIGN_PURPOSE.RETENTION, campaignType: CAMPAIGN_TYPE.SURVEY },
      ],
    }));
    const overview = service.getOverview();
    expect(overview.campaigns.total).toBe(4);
    expect(overview.campaigns.draft).toBe(1);
    expect(overview.campaigns.ready).toBe(1);
    expect(overview.campaigns.running).toBe(1);
    expect(overview.campaigns.completed).toBe(1);
    expect(overview.hasCampaigns).toBe(true);
  });

  it('aggregates execution totals and targeted contacts from real runs', () => {
    const service = createCampaignDashboardService(makePorts({
      campaigns: [
        { id: 'cmp-1', name: 'One', status: CAMPAIGN_STATUS.COMPLETED, purpose: CAMPAIGN_PURPOSE.RETENTION, campaignType: CAMPAIGN_TYPE.SURVEY },
      ],
      executions: [
        {
          id: 'ex-1',
          campaignId: 'cmp-1',
          runNumber: 1,
          status: EXECUTION_STATUS.COMPLETED,
          targetCount: 40,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'ex-2',
          campaignId: 'cmp-1',
          runNumber: 2,
          status: EXECUTION_STATUS.FAILED,
          targetCount: 55,
          createdAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    }));
    const overview = service.getOverview();
    expect(overview.executions.hasData).toBe(true);
    expect(overview.executions.total).toBe(2);
    expect(overview.executions.successful).toBe(1);
    expect(overview.executions.failed).toBe(1);
    // latest run targetCount only
    expect(overview.executions.targetedContacts).toBe(55);

    const perf = service.getCampaignPerformance();
    expect(perf).toHaveLength(1);
    expect(perf[0].audienceCount).toBe(55);
    expect(perf[0].executionCount).toBe(2);
    expect(perf[0].successCount).toBe(1);
    expect(perf[0].failedCount).toBe(1);
  });
});

describe('Dashboard empty state', () => {
  it('does not treat missing business data as zero success', () => {
    const service = createCampaignDashboardService(makePorts({
      campaigns: [
        { id: 'empty', name: 'Empty', status: CAMPAIGN_STATUS.DRAFT, purpose: CAMPAIGN_PURPOSE.ACQUISITION, campaignType: CAMPAIGN_TYPE.BROADCAST },
      ],
    }));
    const overview = service.getOverview();
    expect(overview.hasBusinessData).toBe(false);
    expect(overview.acquisition.hasData).toBe(false);
    expect(overview.acquisition.leadsGenerated).toBeNull();
    expect(overview.retention.hasData).toBe(false);
    expect(overview.executions.hasData).toBe(false);
    expect(overview.executions.total).toBeNull();
    expect(overview.emptyMessage).toBe(DASHBOARD_EMPTY_MESSAGE);

    const top = service.getTopCampaigns({ metric: DASHBOARD_RANK_METRIC.LEADS });
    expect(top.hasData).toBe(false);
    expect(top.items).toHaveLength(0);
  });
});

describe('Acquisition / Retention KPI calculation', () => {
  it('sums acquisition KPIs from attributions only', () => {
    const attributions = [
      normalizeCampaignAttribution({
        campaignId: 'acq-1',
        entityType: ATTRIBUTION_ENTITY_TYPE.LEAD,
        entityId: 'l1',
        eventType: 'LeadCreated',
      }),
      normalizeCampaignAttribution({
        campaignId: 'acq-1',
        entityType: ATTRIBUTION_ENTITY_TYPE.LEAD,
        entityId: 'l2',
        eventType: 'LeadCreated',
      }),
      normalizeCampaignAttribution({
        campaignId: 'acq-1',
        entityType: ATTRIBUTION_ENTITY_TYPE.OPPORTUNITY,
        entityId: 'o1',
        eventType: 'OpportunityCreated',
      }),
      normalizeCampaignAttribution({
        campaignId: 'acq-1',
        entityType: ATTRIBUTION_ENTITY_TYPE.ORDER,
        entityId: 'r1',
        eventType: 'OrderCreated',
      }),
    ];
    const service = createCampaignDashboardService(makePorts({
      campaigns: [
        {
          id: 'acq-1',
          name: 'جذب',
          status: CAMPAIGN_STATUS.RUNNING,
          purpose: CAMPAIGN_PURPOSE.ACQUISITION,
          campaignType: CAMPAIGN_TYPE.BROADCAST,
        },
      ],
      attributionsByCampaign: { 'acq-1': attributions },
    }));
    const overview = service.getOverview();
    expect(overview.acquisition.hasData).toBe(true);
    expect(overview.acquisition.leadsGenerated).toBe(2);
    expect(overview.acquisition.opportunitiesCreated).toBe(1);
    expect(overview.acquisition.ordersGenerated).toBe(1);
    expect(overview.retention.hasData).toBe(false);
  });

  it('sums retention KPIs from survey / task / activity attributions', () => {
    const attributions = [
      normalizeCampaignAttribution({
        campaignId: 'ret-1',
        entityType: ATTRIBUTION_ENTITY_TYPE.SURVEY_RESPONSE,
        entityId: 'sr1',
        eventType: 'SurveyResponseReceived',
      }),
      normalizeCampaignAttribution({
        campaignId: 'ret-1',
        entityType: ATTRIBUTION_ENTITY_TYPE.TASK,
        entityId: 't1',
        eventType: 'TaskCompleted',
      }),
      normalizeCampaignAttribution({
        campaignId: 'ret-1',
        entityType: ATTRIBUTION_ENTITY_TYPE.CONTACT,
        entityId: 'c1',
        eventType: 'CustomerActivity',
      }),
    ];
    const service = createCampaignDashboardService(makePorts({
      campaigns: [
        {
          id: 'ret-1',
          name: 'نگهداشت',
          status: CAMPAIGN_STATUS.COMPLETED,
          purpose: CAMPAIGN_PURPOSE.RETENTION,
          campaignType: CAMPAIGN_TYPE.SURVEY,
        },
      ],
      attributionsByCampaign: { 'ret-1': attributions },
    }));
    const overview = service.getOverview();
    expect(overview.retention.hasData).toBe(true);
    expect(overview.retention.surveyResponses).toBe(1);
    expect(overview.retention.completedTasks).toBe(1);
    expect(overview.retention.customerActivities).toBe(1);
    expect(overview.acquisition.hasData).toBe(false);
  });
});

describe('Ranking', () => {
  it('ranks by leads / orders / tasks / response rate without inventing zeros', () => {
    const rows = [
      normalizeCampaignPerformanceView({
        campaignId: '1',
        campaignName: 'A',
        leads: 5,
        orders: 1,
        tasks: 0,
        responses: 0,
        audienceCount: 10,
        hasResults: true,
      }),
      normalizeCampaignPerformanceView({
        campaignId: '2',
        campaignName: 'B',
        leads: 2,
        orders: 4,
        tasks: 3,
        responses: 8,
        audienceCount: 10,
        hasResults: true,
      }),
      normalizeCampaignPerformanceView({
        campaignId: '3',
        campaignName: 'C',
        leads: 0,
        orders: 0,
        tasks: 0,
        responses: 0,
        audienceCount: null,
        hasResults: false,
      }),
    ];

    expect(rankCampaignPerformance(rows, DASHBOARD_RANK_METRIC.LEADS).map((r) => r.campaignId))
      .toEqual(['1', '2']);
    expect(rankCampaignPerformance(rows, DASHBOARD_RANK_METRIC.ORDERS).map((r) => r.campaignId))
      .toEqual(['2', '1']);
    expect(rankCampaignPerformance(rows, DASHBOARD_RANK_METRIC.TASKS).map((r) => r.campaignId))
      .toEqual(['2']);
    expect(rankCampaignPerformance(rows, DASHBOARD_RANK_METRIC.RESPONSE_RATE)[0].campaignId)
      .toBe('2');
  });
});

describe('Facade dashboard integration', () => {
  beforeEach(() => {
    __testing.resetToSeed();
  });

  it('exposes seed executions and attributes acquisition/retention via facade', () => {
    attributeCampaignEvent('cmp-7', createLeadCreatedEvent({ leadId: 'dash-lead-1' }));
    attributeCampaignEvent('cmp-7', createOpportunityCreatedEvent({ opportunityId: 'dash-opp-1' }));
    attributeCampaignEvent('cmp-7', createOrderCreatedEvent({ orderId: 'dash-ord-1' }));
    attributeCampaignEvent('cmp-1', createSurveyResponseReceivedEvent({ surveyResponseId: 'dash-sr-1' }));
    attributeCampaignEvent('cmp-1', createTaskCompletedEvent({ taskId: 'dash-task-1' }));

    executionRepositorySave(normalizeCampaignExecution({
      id: 'cex-dash-fail',
      campaignId: 'cmp-2',
      runNumber: 1,
      status: EXECUTION_STATUS.FAILED,
      targetCount: 12,
      executionChannelId: 'SMS',
    }));

    const dashboard = getCampaignDashboard({ rankMetric: DASHBOARD_RANK_METRIC.LEADS });
    expect(dashboard.overview.hasCampaigns).toBe(true);
    expect(dashboard.overview.executions.hasData).toBe(true);
    expect(dashboard.overview.acquisition.leadsGenerated).toBe(1);
    expect(dashboard.overview.retention.surveyResponses).toBe(1);
    expect(dashboard.performance.some((row) => row.campaignId === 'cmp-7' && row.leads === 1)).toBe(true);
    expect(dashboard.topCampaigns.hasData).toBe(true);
    expect(dashboard.topCampaigns.items[0].campaignId).toBe('cmp-7');
    expect(dashboard.recentExecutions.hasData).toBe(true);
  });
});
