/**
 * CampaignDashboardService — executive aggregates from real attribution + execution.
 * No ad ROI, no invented metrics.
 */

import { CAMPAIGN_PURPOSE } from './campaign.constants';
import { CAMPAIGN_STATUS } from './campaign.lifecycle';
import { EXECUTION_STATUS } from './execution.types';
import { EXECUTION_RESULT_STATUS } from './executionResult.types';
import { calculateCampaignKpiSummary } from './campaignKpiCalculator';
import {
  DASHBOARD_RANK_METRIC,
  normalizeCampaignPerformanceView,
  rankCampaignPerformance,
} from './campaignPerformance.types';

export const DASHBOARD_EMPTY_MESSAGE = 'داده‌ای برای گزارش وجود ندارد';

/**
 * @typedef {object} CampaignDashboardPorts
 * @property {() => object[]} listCampaigns
 * @property {() => object[]} listExecutions
 * @property {() => object[]} [listExecutionResults]
 * @property {(campaignId: string) => object[]} getCampaignAttributions
 */

/**
 * Latest run targetCount per campaign (real snapshot size only).
 * @param {object[]} executions
 * @returns {Map<string, number>}
 */
function latestAudienceByCampaign(executions) {
  /** @type {Map<string, { runNumber: number, targetCount: number }>} */
  const best = new Map();
  (executions || []).forEach((run) => {
    if (!run?.campaignId) return;
    const id = String(run.campaignId);
    const runNumber = Number(run.runNumber) || 0;
    const target = Number(run.targetCount);
    const targetCount = Number.isFinite(target) && target >= 0 ? Math.floor(target) : 0;
    const prev = best.get(id);
    if (!prev || runNumber > prev.runNumber) {
      best.set(id, { runNumber, targetCount });
    }
  });
  return new Map([...best.entries()].map(([id, row]) => [id, row.targetCount]));
}

/**
 * @param {CampaignDashboardPorts} ports
 */
export function createCampaignDashboardService(ports = {}) {
  const listCampaigns = typeof ports.listCampaigns === 'function'
    ? ports.listCampaigns
    : () => [];
  const listExecutions = typeof ports.listExecutions === 'function'
    ? ports.listExecutions
    : () => [];
  const listExecutionResults = typeof ports.listExecutionResults === 'function'
    ? ports.listExecutionResults
    : () => [];
  const getCampaignAttributions = typeof ports.getCampaignAttributions === 'function'
    ? ports.getCampaignAttributions
    : () => [];

  function buildPerformanceRows() {
    const campaigns = listCampaigns() || [];
    const executions = listExecutions() || [];
    const byCampaignExec = new Map();
    executions.forEach((run) => {
      const id = String(run.campaignId || '');
      if (!id) return;
      if (!byCampaignExec.has(id)) byCampaignExec.set(id, []);
      byCampaignExec.get(id).push(run);
    });
    const audienceMap = latestAudienceByCampaign(executions);

    return campaigns.map((campaign) => {
      const id = String(campaign.id);
      const runs = byCampaignExec.get(id) || [];
      const attributions = getCampaignAttributions(id);
      const summary = calculateCampaignKpiSummary(attributions, {
        purpose: campaign.purpose,
        targetContacts: audienceMap.has(id) ? audienceMap.get(id) : null,
      });
      const successCount = runs.filter((r) => r.status === EXECUTION_STATUS.COMPLETED).length;
      const failedCount = runs.filter((r) => r.status === EXECUTION_STATUS.FAILED).length;
      const audienceCount = audienceMap.has(id) ? audienceMap.get(id) : null;

      return normalizeCampaignPerformanceView({
        campaignId: id,
        campaignName: campaign.name,
        campaignType: campaign.campaignType,
        purpose: campaign.purpose,
        status: campaign.status,
        audienceCount,
        executionCount: runs.length,
        successCount,
        failedCount,
        leads: summary.leadsGenerated,
        opportunities: summary.opportunitiesCreated,
        orders: summary.ordersGenerated,
        tasks: summary.completedFollowUps,
        responses: summary.surveyResponses,
        hasResults: summary.hasData,
      });
    }).filter(Boolean);
  }

  /**
   * Portfolio + execution + business KPI overview.
   */
  function getOverview() {
    const campaigns = listCampaigns() || [];
    const executions = listExecutions() || [];
    const intentResults = listExecutionResults() || [];
    const performance = buildPerformanceRows();

    const byStatus = {
      draft: 0,
      ready: 0,
      running: 0,
      completed: 0,
      paused: 0,
      cancelled: 0,
    };
    campaigns.forEach((row) => {
      const s = String(row.status || '').toUpperCase();
      if (s === CAMPAIGN_STATUS.DRAFT) byStatus.draft += 1;
      else if (s === CAMPAIGN_STATUS.READY) byStatus.ready += 1;
      else if (s === CAMPAIGN_STATUS.RUNNING) byStatus.running += 1;
      else if (s === CAMPAIGN_STATUS.COMPLETED) byStatus.completed += 1;
      else if (s === CAMPAIGN_STATUS.PAUSED) byStatus.paused += 1;
      else if (s === CAMPAIGN_STATUS.CANCELLED) byStatus.cancelled += 1;
    });

    const runSuccessful = executions.filter((r) => r.status === EXECUTION_STATUS.COMPLETED).length;
    const runFailed = executions.filter((r) => r.status === EXECUTION_STATUS.FAILED).length;
    const intentSuccess = intentResults.filter((r) => r.status === EXECUTION_RESULT_STATUS.SUCCESS).length;
    const intentFailed = intentResults.filter((r) => r.status === EXECUTION_RESULT_STATUS.FAILED).length;
    const hasRunData = executions.length > 0;
    const hasIntentResultData = intentResults.length > 0;
    // Do not mix CampaignExecution runs with ExecutionResult intents in one counter.
    const hasExecutionData = hasRunData;

    const audienceMap = latestAudienceByCampaign(executions);
    let targetedContacts = null;
    if (audienceMap.size > 0) {
      targetedContacts = 0;
      audienceMap.forEach((n) => { targetedContacts += n; });
    }

    let leads = 0;
    let opportunities = 0;
    let orders = 0;
    let surveyResponses = 0;
    let completedTasks = 0;
    let customerActivities = 0;
    let hasAcquisitionData = false;
    let hasRetentionData = false;
    let hasBusinessData = false;

    performance.forEach((row) => {
      if (!row.hasResults) return;
      hasBusinessData = true;
      if (row.purpose === CAMPAIGN_PURPOSE.ACQUISITION) {
        hasAcquisitionData = true;
        leads += row.leads;
        opportunities += row.opportunities;
        orders += row.orders;
      } else if (row.purpose === CAMPAIGN_PURPOSE.RETENTION) {
        hasRetentionData = true;
        surveyResponses += row.responses;
        completedTasks += row.tasks;
        // customer activities from attribution CONTACT — recompute from summary fields
        const attrs = getCampaignAttributions(row.campaignId);
        const summary = calculateCampaignKpiSummary(attrs, { purpose: CAMPAIGN_PURPOSE.RETENTION });
        customerActivities += summary.customerActivities;
      } else {
        // Mixed / unknown purpose — still count attributed entities without inventing
        hasAcquisitionData = hasAcquisitionData || row.leads > 0 || row.opportunities > 0 || row.orders > 0;
        hasRetentionData = hasRetentionData || row.responses > 0 || row.tasks > 0;
        leads += row.leads;
        opportunities += row.opportunities;
        orders += row.orders;
        surveyResponses += row.responses;
        completedTasks += row.tasks;
      }
    });

    const hasCampaigns = campaigns.length > 0;

    return {
      hasCampaigns,
      hasExecutionData,
      hasBusinessData,
      hasAcquisitionData,
      hasRetentionData,
      emptyMessage: DASHBOARD_EMPTY_MESSAGE,
      campaigns: {
        total: campaigns.length,
        draft: byStatus.draft,
        ready: byStatus.ready,
        running: byStatus.running,
        completed: byStatus.completed,
        paused: byStatus.paused,
        cancelled: byStatus.cancelled,
      },
      executions: {
        hasData: hasRunData,
        total: hasRunData ? executions.length : null,
        successful: hasRunData ? runSuccessful : null,
        failed: hasRunData ? runFailed : null,
        targetedContacts: targetedContacts,
      },
      /** Intent-level executor outcomes — separate from campaign runs (no double-count). */
      intentResults: {
        hasData: hasIntentResultData,
        total: hasIntentResultData ? intentResults.length : null,
        successful: hasIntentResultData ? intentSuccess : null,
        failed: hasIntentResultData ? intentFailed : null,
      },
      acquisition: {
        hasData: hasAcquisitionData,
        leadsGenerated: hasAcquisitionData ? leads : null,
        opportunitiesCreated: hasAcquisitionData ? opportunities : null,
        ordersGenerated: hasAcquisitionData ? orders : null,
      },
      retention: {
        hasData: hasRetentionData,
        surveyResponses: hasRetentionData ? surveyResponses : null,
        completedTasks: hasRetentionData ? completedTasks : null,
        customerActivities: hasRetentionData ? customerActivities : null,
      },
    };
  }

  function getCampaignPerformance() {
    return buildPerformanceRows().sort((a, b) => (
      String(a.campaignName).localeCompare(String(b.campaignName), 'fa')
    ));
  }

  /**
   * @param {{ metric?: string, limit?: number }} [options]
   */
  function getTopCampaigns(options = {}) {
    const metric = options.metric || DASHBOARD_RANK_METRIC.LEADS;
    const limit = options.limit != null ? options.limit : 5;
    const ranked = rankCampaignPerformance(buildPerformanceRows(), metric, limit);
    return {
      metric: String(metric).toUpperCase(),
      hasData: ranked.length > 0,
      emptyMessage: DASHBOARD_EMPTY_MESSAGE,
      items: ranked,
    };
  }

  /**
   * Recent campaign runs for dashboard (execution history only).
   * @param {{ limit?: number }} [options]
   */
  function getRecentExecutions(options = {}) {
    const limit = Math.max(1, Math.floor(Number(options.limit) || 8));
    const campaigns = listCampaigns() || [];
    const byId = new Map(campaigns.map((c) => [String(c.id), c]));
    const rows = (listExecutions() || [])
      .slice()
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, limit)
      .map((run) => {
        const campaign = byId.get(String(run.campaignId));
        return {
          id: run.id,
          campaignId: run.campaignId,
          campaignName: campaign?.name || run.campaignId,
          runNumber: run.runNumber,
          status: run.status,
          targetCount: run.targetCount,
          runDate: run.runDate,
          createdAt: run.createdAt,
        };
      });
    return {
      hasData: rows.length > 0,
      emptyMessage: DASHBOARD_EMPTY_MESSAGE,
      items: rows,
    };
  }

  return {
    getOverview,
    getCampaignPerformance,
    getTopCampaigns,
    getRecentExecutions,
  };
}
