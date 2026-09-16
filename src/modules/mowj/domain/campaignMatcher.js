/**
 * CampaignMatcher — which campaigns may be evaluated by automation.
 */

import { CAMPAIGN_STATUS } from './campaign.lifecycle';

/**
 * Spec: READY + ACTIVE. ACTIVE is legacy alias; RUNNING counts as active automation.
 * PAUSED / CANCELLED / DRAFT / COMPLETED are ignored.
 */
export const AUTOMATION_ELIGIBLE_STATUSES = Object.freeze([
  CAMPAIGN_STATUS.READY,
  CAMPAIGN_STATUS.RUNNING,
  'ACTIVE',
]);

/**
 * @param {string} status
 */
export function isCampaignEligibleForAutomation(status) {
  const key = String(status || '').toUpperCase();
  if (key === CAMPAIGN_STATUS.PAUSED) return false;
  if (key === CAMPAIGN_STATUS.CANCELLED) return false;
  if (key === CAMPAIGN_STATUS.DRAFT) return false;
  if (key === CAMPAIGN_STATUS.COMPLETED) return false;
  return AUTOMATION_ELIGIBLE_STATUSES.includes(key);
}

/**
 * @param {object[]} campaigns
 * @returns {object[]}
 */
export function matchEligibleCampaigns(campaigns = []) {
  return (Array.isArray(campaigns) ? campaigns : [])
    .filter((campaign) => campaign && isCampaignEligibleForAutomation(campaign.status));
}

/**
 * Filter eligible campaigns whose trigger can fire for this event type (pre-filter).
 * Full trigger evaluation happens in TriggerEvaluator.
 * @param {object[]} campaigns
 * @param {string} eventType
 * @param {(eventType: string, triggerCode: string) => boolean} matchesFn
 */
export function matchCampaignsForEventType(campaigns, eventType, matchesFn) {
  return matchEligibleCampaigns(campaigns).filter((campaign) => {
    const code = campaign.triggerRule?.code;
    if (!code) return false;
    return typeof matchesFn === 'function'
      ? matchesFn(eventType, code)
      : true;
  });
}
