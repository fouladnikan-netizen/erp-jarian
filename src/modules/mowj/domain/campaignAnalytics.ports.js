/**
 * Campaign analytics repository contract — no store imports.
 */

import { calculateCampaignKpiSummary } from './campaignKpiCalculator';

/**
 * @typedef {object} CampaignAnalyticsRepository
 * @property {(attribution: object) => object|null} addAttribution
 * @property {(campaignId: string) => object[]} getCampaignResults
 * @property {(campaignId: string, options?: object) => object} getKpiSummary
 * @property {() => void} [reset]
 */

/**
 * @returns {CampaignAnalyticsRepository}
 */
export function createEmptyCampaignAnalyticsRepository() {
  /** @type {object[]} */
  const rows = [];
  return {
    addAttribution(attribution) {
      if (!attribution) return null;
      rows.unshift(attribution);
      return attribution;
    },
    getCampaignResults(campaignId) {
      return rows.filter((row) => String(row.campaignId) === String(campaignId));
    },
    getKpiSummary(campaignId, options = {}) {
      return calculateCampaignKpiSummary(
        rows.filter((row) => String(row.campaignId) === String(campaignId)),
        options,
      );
    },
    reset() {
      rows.length = 0;
    },
  };
}
