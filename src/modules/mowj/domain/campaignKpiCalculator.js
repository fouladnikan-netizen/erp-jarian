/**
 * CampaignKpiCalculator — derives KPI counts from attribution rows only.
 * No hardcoded / fake metric values.
 */

import { CAMPAIGN_PURPOSE, KPI_METRIC } from './campaign.constants';
import { ATTRIBUTION_ENTITY_TYPE } from './attribution.types';

/**
 * @typedef {object} CampaignKpiSummary
 * @property {string} purpose
 * @property {number|null} targetContacts  real audience/snapshot size or null
 * @property {number} leadsGenerated
 * @property {number} opportunitiesCreated
 * @property {number} ordersGenerated
 * @property {number} surveyResponses
 * @property {number} completedFollowUps
 * @property {number} repeatOrders
 * @property {number} customerActivities
 * @property {number} attributionCount
 * @property {boolean} hasData
 * @property {Array<{ metricKey: string, label: string, value: number }>} metrics
 */

function uniqueEntityCount(attributions, entityType) {
  const ids = new Set();
  (attributions || []).forEach((row) => {
    if (row?.entityType === entityType && row.entityId) {
      ids.add(String(row.entityId));
    }
  });
  return ids.size;
}

function uniqueByEventAndEntity(attributions, eventTypes, entityType) {
  const events = new Set((eventTypes || []).map(String));
  const ids = new Set();
  (attributions || []).forEach((row) => {
    if (row?.entityType !== entityType || !row.entityId) return;
    if (events.size && !events.has(String(row.eventType))) return;
    ids.add(String(row.entityId));
  });
  return ids.size;
}

/**
 * @param {object[]} attributions
 * @param {{
 *   purpose?: string,
 *   targetContacts?: number|null,
 * }} [options]
 * @returns {CampaignKpiSummary}
 */
export function calculateCampaignKpiSummary(attributions = [], options = {}) {
  const rows = Array.isArray(attributions) ? attributions.filter(Boolean) : [];
  const purpose = String(options.purpose || CAMPAIGN_PURPOSE.ACQUISITION).toUpperCase();
  const targetRaw = options.targetContacts;
  const targetContacts = targetRaw == null || targetRaw === ''
    ? null
    : (Number.isFinite(Number(targetRaw)) ? Math.max(0, Math.floor(Number(targetRaw))) : null);

  const leadsGenerated = uniqueEntityCount(rows, ATTRIBUTION_ENTITY_TYPE.LEAD);
  const opportunitiesCreated = uniqueEntityCount(rows, ATTRIBUTION_ENTITY_TYPE.OPPORTUNITY);
  const ordersGenerated = uniqueEntityCount(rows, ATTRIBUTION_ENTITY_TYPE.ORDER);
  const surveyResponses = uniqueEntityCount(rows, ATTRIBUTION_ENTITY_TYPE.SURVEY_RESPONSE);
  const completedFollowUps = uniqueEntityCount(rows, ATTRIBUTION_ENTITY_TYPE.TASK);
  const customerActivities = uniqueEntityCount(rows, ATTRIBUTION_ENTITY_TYPE.CONTACT);
  const repeatOrders = uniqueByEventAndEntity(
    rows,
    ['FirstPurchaseCompleted', 'OrderCreated', 'OrderDelivered'],
    ATTRIBUTION_ENTITY_TYPE.ORDER,
  );

  const hasData = rows.length > 0;

  /** @type {Array<{ metricKey: string, label: string, value: number }>} */
  let metrics = [];
  if (purpose === CAMPAIGN_PURPOSE.RETENTION) {
    metrics = [
      { metricKey: KPI_METRIC.SURVEY_RESPONSES, label: 'پاسخ‌های نظرسنجی', value: surveyResponses },
      { metricKey: 'COMPLETED_FOLLOWUPS', label: 'پیگیری‌های تکمیل‌شده', value: completedFollowUps },
      { metricKey: KPI_METRIC.REPEAT_PURCHASE, label: 'خرید مجدد / سفارش', value: repeatOrders },
      { metricKey: KPI_METRIC.CUSTOMER_ACTIVITY, label: 'فعالیت مشتری', value: customerActivities },
    ];
  } else {
    metrics = [
      { metricKey: KPI_METRIC.LEADS_CREATED, label: 'سرنخ ایجادشده', value: leadsGenerated },
      { metricKey: KPI_METRIC.OPPORTUNITIES_CREATED, label: 'فرصت ایجادشده', value: opportunitiesCreated },
      { metricKey: KPI_METRIC.ORDERS_GENERATED, label: 'سفارش ایجادشده', value: ordersGenerated },
    ];
  }

  return {
    purpose,
    targetContacts,
    leadsGenerated,
    opportunitiesCreated,
    ordersGenerated,
    surveyResponses,
    completedFollowUps,
    repeatOrders,
    customerActivities,
    attributionCount: rows.length,
    hasData,
    metrics,
  };
}

/**
 * Thin alias matching product naming.
 * @param {object[]} attributions
 * @param {object} [options]
 */
export function createCampaignKpiCalculator() {
  return {
    calculate: calculateCampaignKpiSummary,
  };
}
