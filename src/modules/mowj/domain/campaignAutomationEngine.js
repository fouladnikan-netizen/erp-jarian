/**
 * CampaignAutomationEngine — internal decision layer only.
 * Does not send messages or touch channel providers.
 */

import { validateMowjDomainEvent } from './events.contracts';
import {
  matchEligibleCampaigns,
  isCampaignEligibleForAutomation,
} from './campaignMatcher';
import {
  evaluateTrigger,
  eventMatchesTriggerCode,
} from './triggerEvaluator';
import {
  buildAudienceReferenceFromEvent,
  normalizeExecutionIntent,
} from './executionIntent.types';
import { createEmptyCampaignAutomationRepository } from './campaignAutomation.ports';
import { getDefaultActionTypeForCampaign } from './action.rules';
import { CAMPAIGN_STATUS } from './campaign.lifecycle';

/**
 * @param {import('./campaignAutomation.ports').CampaignAutomationRepository} [repository]
 */
export function createCampaignAutomationEngine(repository = createEmptyCampaignAutomationRepository()) {
  const repo = {
    findActiveCampaigns: typeof repository.findActiveCampaigns === 'function'
      ? repository.findActiveCampaigns
      : () => [],
    findByTrigger: typeof repository.findByTrigger === 'function'
      ? repository.findByTrigger
      : () => [],
    saveExecutionIntent: typeof repository.saveExecutionIntent === 'function'
      ? repository.saveExecutionIntent
      : () => null,
  };

  /**
   * Evaluate a domain event against campaign rules.
   * @param {object} event
   * @returns {{
   *   ok: boolean,
   *   activated: boolean,
   *   intents: object[],
   *   ignored: { campaignId?: string, reason: string }[],
   *   error?: string
   * }}
   */
  function evaluate(event) {
    const check = validateMowjDomainEvent(event);
    if (!check.ok) {
      return {
        ok: false,
        activated: false,
        intents: [],
        ignored: [],
        error: check.errors.join(' '),
      };
    }

    const candidates = matchEligibleCampaigns(repo.findActiveCampaigns());
    const ignored = [];
    const intents = [];

    // Also surface explicitly non-eligible for transparency when loaded via findByTrigger
    const byTrigger = repo.findByTrigger(event.type) || [];
    byTrigger.forEach((campaign) => {
      if (!isCampaignEligibleForAutomation(campaign.status)) {
        ignored.push({
          campaignId: campaign.id,
          reason: campaign.status === CAMPAIGN_STATUS.PAUSED
            ? 'کمپین متوقف نادیده گرفته شد.'
            : campaign.status === CAMPAIGN_STATUS.CANCELLED
              ? 'کمپین لغوشده نادیده گرفته شد.'
              : `وضعیت ${campaign.status} قابل ارزیابی نیست.`,
        });
      }
    });

    candidates.forEach((campaign) => {
      if (!campaign.triggerRule) {
        ignored.push({ campaignId: campaign.id, reason: 'تریگر پیکربندی نشده.' });
        return;
      }
      if (!eventMatchesTriggerCode(event.type, campaign.triggerRule.code)) {
        ignored.push({
          campaignId: campaign.id,
          reason: `تریگر ${campaign.triggerRule.code} با رویداد ${event.type} سازگار نیست.`,
        });
        return;
      }

      const triggerResult = evaluateTrigger(event, campaign.triggerRule);
      if (!triggerResult.matched) {
        ignored.push({
          campaignId: campaign.id,
          reason: triggerResult.reason || 'تریگر مطابقت ندارد.',
        });
        return;
      }

      const actionType = campaign.action?.actionType
        || getDefaultActionTypeForCampaign(campaign.campaignType);
      if (!actionType) {
        ignored.push({
          campaignId: campaign.id,
          reason: 'اقدام کمپین پیکربندی نشده است.',
        });
        return;
      }

      const intent = normalizeExecutionIntent({
        campaignId: campaign.id,
        triggerEvent: event,
        actionType,
        audienceReference: buildAudienceReferenceFromEvent(event),
        schedule: triggerResult.schedule,
      });
      if (!intent) {
        ignored.push({ campaignId: campaign.id, reason: 'ساخت intent ناموفق بود.' });
        return;
      }

      const saved = repo.saveExecutionIntent(intent);
      if (saved) intents.push(saved);
    });

    return {
      ok: true,
      activated: intents.length > 0,
      intents,
      ignored,
    };
  }

  return { evaluate };
}

/**
 * Automation readiness for Campaign Detail UI (no execute).
 * @param {object} campaign  presentation or domain campaign
 */
export function getCampaignAutomationStatus(campaign) {
  // triggerView.event being '—' means missing — check carefully
  const triggerOk = Boolean(
    campaign?.triggerRule?.code
    || (campaign?.triggerView?.event && campaign.triggerView.event !== '—'),
  );
  const actionConfigured = Boolean(
    campaign?.action?.actionType
    || (campaign?.actionView?.actionType && campaign.actionView.actionType !== null),
  );
  const actionHasTemplate = Boolean(
    campaign?.action?.templateId
    || (campaign?.actionView?.templateId),
  );
  const statusEligible = isCampaignEligibleForAutomation(campaign?.status);
  const readyForAutomation = triggerOk && actionConfigured && actionHasTemplate && statusEligible;

  return {
    triggerConfigured: triggerOk,
    actionConfigured: actionConfigured && actionHasTemplate,
    readyForAutomation,
    statusEligible,
    labels: {
      triggerConfigured: triggerOk ? 'تریگر پیکربندی شده' : 'تریگر ناقص',
      actionConfigured: (actionConfigured && actionHasTemplate) ? 'اقدام پیکربندی شده' : 'اقدام ناقص',
      readyForAutomation: readyForAutomation
        ? 'آماده برای اتوماسیون'
        : 'آماده برای اتوماسیون نیست',
    },
  };
}
