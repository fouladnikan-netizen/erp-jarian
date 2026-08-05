/**
 * Campaign dashboard runtime — wires real repositories (no fake metrics).
 */

import { createCampaignDashboardService } from '../domain/campaignDashboard';
import { repositoryFindAll } from '../repositories/campaignRepository';
import { executionRepositoryFindAll } from '../repositories/executionRepository';
import { executionResultRepositoryFindAll } from '../repositories/executionResultRepository';
import { analyticsRepositoryGetCampaignResults } from '../repositories/campaignAnalyticsRepository';

let defaultService = null;

function buildService() {
  return createCampaignDashboardService({
    listCampaigns: () => repositoryFindAll(),
    listExecutions: () => executionRepositoryFindAll(),
    listExecutionResults: () => executionResultRepositoryFindAll(),
    getCampaignAttributions: (campaignId) => analyticsRepositoryGetCampaignResults(campaignId),
  });
}

export function getDefaultCampaignDashboardService() {
  if (!defaultService) defaultService = buildService();
  return defaultService;
}

/** @param {ReturnType<typeof createCampaignDashboardService>|null} service */
export function __setDefaultCampaignDashboardForTests(service) {
  defaultService = service;
}

export function __resetCampaignDashboardRuntimeForTests() {
  defaultService = buildService();
}
