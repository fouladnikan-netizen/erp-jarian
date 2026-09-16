/**
 * Campaign analytics contract for Dashboard consumers (آینه / Aineh).
 *
 * Mowj owns campaign data, attribution, and aggregation.
 * Mowj does NOT render executive dashboards — Aineh consumes this API.
 */

export {
  getCampaignDashboard,
  getCampaignResultsPresentation,
  attributeCampaignEvent,
  getCampaign,
  listCampaigns,
} from './campaignFacade';

export {
  DASHBOARD_RANK_METRIC,
  DASHBOARD_RANK_METRIC_LABELS,
  DASHBOARD_EMPTY_MESSAGE,
  createCampaignDashboardService,
  calculateCampaignKpiSummary,
} from '../domain';
