/**
 * CampaignPerformanceView — per-campaign dashboard row (attribution + execution only).
 */

import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TYPE_LABELS,
} from './campaign.constants';

/**
 * @typedef {object} CampaignPerformanceView
 * @property {string} campaignId
 * @property {string} campaignName
 * @property {string|null} campaignType
 * @property {string} campaignTypeLabel
 * @property {string|null} purpose
 * @property {string|null} status
 * @property {string} statusLabel
 * @property {number|null} audienceCount
 * @property {number} executionCount
 * @property {number} successCount
 * @property {number} failedCount
 * @property {number} leads
 * @property {number} opportunities
 * @property {number} orders
 * @property {number} tasks
 * @property {number} responses
 * @property {boolean} hasResults
 * @property {number|null} responseRate
 */

/**
 * @param {object} input
 * @returns {CampaignPerformanceView|null}
 */
export function normalizeCampaignPerformanceView(input = {}) {
  const campaignId = String(input.campaignId || '').trim();
  if (!campaignId) return null;

  const audienceRaw = input.audienceCount;
  const audienceCount = audienceRaw == null || audienceRaw === ''
    ? null
    : (Number.isFinite(Number(audienceRaw))
      ? Math.max(0, Math.floor(Number(audienceRaw)))
      : null);

  const toCount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };

  const responses = toCount(input.responses);
  const hasResults = Boolean(input.hasResults);
  let responseRate = null;
  if (hasResults && audienceCount != null && audienceCount > 0) {
    responseRate = responses / audienceCount;
  }

  const status = input.status != null ? String(input.status).toUpperCase() : null;
  const campaignType = input.campaignType != null
    ? String(input.campaignType).toUpperCase()
    : null;

  return {
    campaignId,
    campaignName: String(input.campaignName || '').trim() || campaignId,
    campaignType,
    campaignTypeLabel: CAMPAIGN_TYPE_LABELS[campaignType] || campaignType || '—',
    purpose: input.purpose != null ? String(input.purpose).toUpperCase() : null,
    status,
    statusLabel: CAMPAIGN_STATUS_LABELS[status] || status || '—',
    audienceCount,
    executionCount: toCount(input.executionCount),
    successCount: toCount(input.successCount),
    failedCount: toCount(input.failedCount),
    leads: toCount(input.leads),
    opportunities: toCount(input.opportunities),
    orders: toCount(input.orders),
    tasks: toCount(input.tasks),
    responses,
    hasResults,
    responseRate,
  };
}

export const DASHBOARD_RANK_METRIC = Object.freeze({
  LEADS: 'LEADS',
  ORDERS: 'ORDERS',
  TASKS: 'TASKS',
  RESPONSE_RATE: 'RESPONSE_RATE',
});

export const DASHBOARD_RANK_METRIC_LABELS = Object.freeze({
  LEADS: 'سرنخ',
  ORDERS: 'سفارش',
  TASKS: 'وظایف تکمیل‌شده',
  RESPONSE_RATE: 'نرخ پاسخ',
});

/**
 * Sort key for ranking — null means campaign is ineligible for this metric.
 * @param {CampaignPerformanceView} row
 * @param {string} metric
 * @returns {number|null}
 */
export function getPerformanceRankValue(row, metric) {
  if (!row) return null;
  const key = String(metric || DASHBOARD_RANK_METRIC.LEADS).toUpperCase();
  if (key === DASHBOARD_RANK_METRIC.LEADS) {
    return row.hasResults && row.leads > 0 ? row.leads : null;
  }
  if (key === DASHBOARD_RANK_METRIC.ORDERS) {
    return row.hasResults && row.orders > 0 ? row.orders : null;
  }
  if (key === DASHBOARD_RANK_METRIC.TASKS) {
    return row.hasResults && row.tasks > 0 ? row.tasks : null;
  }
  if (key === DASHBOARD_RANK_METRIC.RESPONSE_RATE) {
    return row.responseRate != null && row.responses > 0 ? row.responseRate : null;
  }
  return null;
}

/**
 * @param {CampaignPerformanceView[]} rows
 * @param {string} metric
 * @param {number} [limit]
 * @returns {CampaignPerformanceView[]}
 */
export function rankCampaignPerformance(rows, metric, limit = 5) {
  const list = (Array.isArray(rows) ? rows : [])
    .map((row) => ({ row, value: getPerformanceRankValue(row, metric) }))
    .filter((item) => item.value != null)
    .sort((a, b) => b.value - a.value)
    .slice(0, Math.max(1, Math.floor(Number(limit) || 5)))
    .map((item) => item.row);
  return list;
}
