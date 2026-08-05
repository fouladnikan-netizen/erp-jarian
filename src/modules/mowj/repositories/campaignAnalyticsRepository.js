/**
 * In-memory Campaign Analytics repository.
 */

import { normalizeCampaignAttribution } from '../domain/attribution.types';
import { calculateCampaignKpiSummary } from '../domain/campaignKpiCalculator';

/** @type {Array<object>} */
let attributions = [];

function copy() {
  return attributions.map((item) => ({ ...item }));
}

export function analyticsRepositoryAddAttribution(record) {
  const next = normalizeCampaignAttribution(record);
  if (!next) return null;
  const index = attributions.findIndex((item) => String(item.id) === String(next.id));
  if (index === -1) {
    attributions = [next, ...attributions];
  } else {
    attributions = attributions.slice();
    attributions[index] = next;
  }
  return copy().find((item) => item.id === next.id) || null;
}

export function analyticsRepositoryGetCampaignResults(campaignId) {
  if (campaignId == null || campaignId === '') return [];
  return copy()
    .filter((item) => String(item.campaignId) === String(campaignId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function analyticsRepositoryGetKpiSummary(campaignId, options = {}) {
  return calculateCampaignKpiSummary(
    analyticsRepositoryGetCampaignResults(campaignId),
    options,
  );
}

export function analyticsRepositoryReset() {
  attributions = [];
  return copy();
}

/**
 * @returns {import('../domain/campaignAnalytics.ports').CampaignAnalyticsRepository}
 */
export function createCampaignAnalyticsRepository() {
  return {
    addAttribution: analyticsRepositoryAddAttribution,
    getCampaignResults: analyticsRepositoryGetCampaignResults,
    getKpiSummary: analyticsRepositoryGetKpiSummary,
    reset: analyticsRepositoryReset,
  };
}
