/**
 * KPI foundation — definitions only.
 * Do not store fake runtime metric values on Campaign.
 */

import {
  CAMPAIGN_PURPOSE,
  KPI_METRIC,
  KPI_METRIC_LABELS,
} from './campaign.constants';

/**
 * @typedef {object} CampaignKpiDefinition
 * @property {string} metricKey
 * @property {string} label
 * @property {'RETENTION'|'ACQUISITION'|'SHARED'} purposeFit
 * @property {number|null} [target]
 */

/** @type {CampaignKpiDefinition[]} */
export const KPI_DEFINITION_CATALOG = Object.freeze([
  {
    metricKey: KPI_METRIC.SURVEY_RESPONSES,
    label: KPI_METRIC_LABELS.SURVEY_RESPONSES,
    purposeFit: CAMPAIGN_PURPOSE.RETENTION,
    target: null,
  },
  {
    metricKey: KPI_METRIC.REPEAT_PURCHASE,
    label: KPI_METRIC_LABELS.REPEAT_PURCHASE,
    purposeFit: CAMPAIGN_PURPOSE.RETENTION,
    target: null,
  },
  {
    metricKey: KPI_METRIC.CUSTOMER_ACTIVITY,
    label: KPI_METRIC_LABELS.CUSTOMER_ACTIVITY,
    purposeFit: CAMPAIGN_PURPOSE.RETENTION,
    target: null,
  },
  {
    metricKey: KPI_METRIC.LEADS_CREATED,
    label: KPI_METRIC_LABELS.LEADS_CREATED,
    purposeFit: CAMPAIGN_PURPOSE.ACQUISITION,
    target: null,
  },
  {
    metricKey: KPI_METRIC.OPPORTUNITIES_CREATED,
    label: KPI_METRIC_LABELS.OPPORTUNITIES_CREATED,
    purposeFit: CAMPAIGN_PURPOSE.ACQUISITION,
    target: null,
  },
  {
    metricKey: KPI_METRIC.ORDERS_GENERATED,
    label: KPI_METRIC_LABELS.ORDERS_GENERATED,
    purposeFit: CAMPAIGN_PURPOSE.ACQUISITION,
    target: null,
  },
]);

/**
 * @param {string} [purpose]
 * @returns {CampaignKpiDefinition[]}
 */
export function listKpiDefinitionsForPurpose(purpose) {
  const p = String(purpose || '').toUpperCase();
  return KPI_DEFINITION_CATALOG.filter(
    (item) => item.purposeFit === p || item.purposeFit === 'SHARED',
  );
}

/**
 * @param {unknown} input
 * @returns {CampaignKpiDefinition|null}
 */
export function normalizeKpiDefinition(input) {
  if (!input || typeof input !== 'object') return null;
  const metricKey = String(input.metricKey || '').trim().toUpperCase();
  const catalog = KPI_DEFINITION_CATALOG.find((item) => item.metricKey === metricKey);
  if (!catalog && !input.label) return null;
  const targetRaw = input.target;
  const target = targetRaw == null || targetRaw === ''
    ? null
    : Number(targetRaw);
  return {
    metricKey: catalog?.metricKey || metricKey,
    label: String(input.label || catalog?.label || metricKey).trim(),
    purposeFit: catalog?.purposeFit || 'SHARED',
    target: Number.isFinite(target) ? target : null,
  };
}

/** Display helper for list column — definition only, never fake %. */
export function formatKpiDefinition(def) {
  if (!def?.label) return '—';
  if (def.target != null && Number.isFinite(Number(def.target))) {
    return `${def.label} (هدف: ${Number(def.target).toLocaleString('fa-IR')})`;
  }
  return def.label;
}
