import { describe, expect, it, beforeEach } from 'vitest';
import {
  ATTRIBUTION_ENTITY_TYPE,
  CAMPAIGN_PURPOSE,
  calculateCampaignKpiSummary,
  createCampaignAnalyticsService,
  createEmptyCampaignAnalyticsRepository,
  createLeadCreatedEvent,
  createOpportunityCreatedEvent,
  createOrderCreatedEvent,
  createSurveyResponseReceivedEvent,
  createTaskCompletedEvent,
  normalizeCampaignAttribution,
  resolveAttributionEntityFromEvent,
} from '../domain';
import {
  __testing,
  attributeCampaignEvent,
  getCampaignDetail,
  getCampaignResultsPresentation,
} from '../services/campaignFacade';

describe('Attribution entity mapping', () => {
  it('maps LeadCreated → LEAD', () => {
    const ref = resolveAttributionEntityFromEvent(
      createLeadCreatedEvent({ leadId: 'lead-1' }),
    );
    expect(ref).toEqual({ entityType: ATTRIBUTION_ENTITY_TYPE.LEAD, entityId: 'lead-1' });
  });

  it('maps OpportunityCreated → OPPORTUNITY', () => {
    const ref = resolveAttributionEntityFromEvent(
      createOpportunityCreatedEvent({ opportunityId: 'opp-1' }),
    );
    expect(ref).toEqual({
      entityType: ATTRIBUTION_ENTITY_TYPE.OPPORTUNITY,
      entityId: 'opp-1',
    });
  });

  it('maps OrderCreated → ORDER', () => {
    const ref = resolveAttributionEntityFromEvent(
      createOrderCreatedEvent({ orderId: 'ord-1' }),
    );
    expect(ref).toEqual({ entityType: ATTRIBUTION_ENTITY_TYPE.ORDER, entityId: 'ord-1' });
  });
});

describe('Campaign attribution + KPI', () => {
  it('attributes lead / opportunity / order to a campaign', () => {
    const repo = createEmptyCampaignAnalyticsRepository();
    const analytics = createCampaignAnalyticsService(repo);

    expect(analytics.attributeEvent('cmp-acq', createLeadCreatedEvent({ leadId: 'L1' })).ok).toBe(true);
    expect(analytics.attributeEvent('cmp-acq', createOpportunityCreatedEvent({ opportunityId: 'O1' })).ok).toBe(true);
    expect(analytics.attributeEvent('cmp-acq', createOrderCreatedEvent({ orderId: 'R1' })).ok).toBe(true);

    const results = analytics.getCampaignResults('cmp-acq');
    expect(results).toHaveLength(3);
    expect(results.every((row) => row.campaignId === 'cmp-acq')).toBe(true);
    expect(results.map((row) => row.entityType).sort()).toEqual([
      ATTRIBUTION_ENTITY_TYPE.LEAD,
      ATTRIBUTION_ENTITY_TYPE.OPPORTUNITY,
      ATTRIBUTION_ENTITY_TYPE.ORDER,
    ].sort());
  });

  it('calculates acquisition KPIs from attributions only', () => {
    const attributions = [
      normalizeCampaignAttribution({
        campaignId: 'c1',
        entityType: ATTRIBUTION_ENTITY_TYPE.LEAD,
        entityId: 'l1',
        eventType: 'LeadCreated',
      }),
      normalizeCampaignAttribution({
        campaignId: 'c1',
        entityType: ATTRIBUTION_ENTITY_TYPE.LEAD,
        entityId: 'l2',
        eventType: 'LeadCreated',
      }),
      normalizeCampaignAttribution({
        campaignId: 'c1',
        entityType: ATTRIBUTION_ENTITY_TYPE.OPPORTUNITY,
        entityId: 'o1',
        eventType: 'OpportunityCreated',
      }),
      normalizeCampaignAttribution({
        campaignId: 'c1',
        entityType: ATTRIBUTION_ENTITY_TYPE.ORDER,
        entityId: 'r1',
        eventType: 'OrderCreated',
      }),
    ];
    const summary = calculateCampaignKpiSummary(attributions, {
      purpose: CAMPAIGN_PURPOSE.ACQUISITION,
      targetContacts: 40,
    });
    expect(summary.hasData).toBe(true);
    expect(summary.targetContacts).toBe(40);
    expect(summary.leadsGenerated).toBe(2);
    expect(summary.opportunitiesCreated).toBe(1);
    expect(summary.ordersGenerated).toBe(1);
    expect(summary.metrics.every((m) => typeof m.value === 'number')).toBe(true);
  });

  it('calculates retention KPIs from survey / task / order attributions', () => {
    const repo = createEmptyCampaignAnalyticsRepository();
    const analytics = createCampaignAnalyticsService(repo);
    analytics.attributeEvent('cmp-ret', createSurveyResponseReceivedEvent({ surveyResponseId: 'sr-1' }));
    analytics.attributeEvent('cmp-ret', createTaskCompletedEvent({ taskId: 't-1' }));
    analytics.attributeEvent('cmp-ret', createOrderCreatedEvent({ orderId: 'ord-r' }));

    const summary = analytics.getKpiSummary('cmp-ret', { purpose: CAMPAIGN_PURPOSE.RETENTION });
    expect(summary.surveyResponses).toBe(1);
    expect(summary.completedFollowUps).toBe(1);
    expect(summary.repeatOrders).toBe(1);
    expect(summary.hasData).toBe(true);
  });

  it('returns empty result when campaign has no attributions', () => {
    const summary = calculateCampaignKpiSummary([], {
      purpose: CAMPAIGN_PURPOSE.ACQUISITION,
      targetContacts: 10,
    });
    expect(summary.hasData).toBe(false);
    expect(summary.attributionCount).toBe(0);
    expect(summary.leadsGenerated).toBe(0);
    expect(summary.opportunitiesCreated).toBe(0);
    expect(summary.ordersGenerated).toBe(0);
  });
});

describe('Facade analytics presentation', () => {
  beforeEach(() => {
    __testing.resetToSeed();
  });

  it('shows empty state when no attribution data exists', () => {
    const detail = getCampaignDetail('cmp-7');
    expect(detail.results.hasData).toBe(false);
    expect(detail.results.attributionCount).toBe(0);
  });

  it('exposes real lead attribution on campaign results', () => {
    const attributed = attributeCampaignEvent(
      'cmp-7',
      createLeadCreatedEvent({ leadId: 'lead-facade-1' }),
    );
    expect(attributed.ok).toBe(true);
    expect(attributed.attribution.entityType).toBe(ATTRIBUTION_ENTITY_TYPE.LEAD);

    const results = getCampaignResultsPresentation('cmp-7');
    expect(results.hasData).toBe(true);
    expect(results.leadsGenerated).toBe(1);
    expect(results.opportunitiesCreated).toBe(0);
    expect(results.ordersGenerated).toBe(0);
  });
});
