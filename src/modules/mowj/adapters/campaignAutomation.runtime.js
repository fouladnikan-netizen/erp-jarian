/**
 * CampaignAutomationRepository adapter — uses campaign + intent repositories.
 * Engine must not import module stores.
 */

import {
  isCampaignEligibleForAutomation,
} from '../domain/campaignMatcher';
import { eventMatchesTriggerCode } from '../domain/triggerEvaluator';
import { repositoryFindAll } from '../repositories/campaignRepository';
import {
  intentRepositoryFindAll,
  intentRepositoryFindByCampaignId,
  intentRepositoryReset,
  intentRepositorySave,
} from '../repositories/executionIntentRepository';
import { createCampaignAutomationEngine } from '../domain/campaignAutomationEngine';
import { useMowjStore } from '../store/useMowjStore';

/**
 * @returns {import('../domain/campaignAutomation.ports').CampaignAutomationRepository}
 */
export function createCampaignAutomationRepository() {
  return {
    findActiveCampaigns() {
      return repositoryFindAll().filter((campaign) => (
        isCampaignEligibleForAutomation(campaign.status)
      ));
    },
    findByTrigger(triggerCodeOrEventType) {
      const key = String(triggerCodeOrEventType || '');
      return repositoryFindAll().filter((campaign) => {
        const code = campaign.triggerRule?.code;
        if (!code) return false;
        if (code === key) return true;
        return eventMatchesTriggerCode(key, code);
      });
    },
    saveExecutionIntent(intent) {
      const saved = intentRepositorySave(intent);
      if (saved) useMowjStore.getState().bump();
      return saved;
    },
    listExecutionIntents(campaignId) {
      return campaignId
        ? intentRepositoryFindByCampaignId(campaignId)
        : intentRepositoryFindAll();
    },
  };
}

let defaultEngine = null;

export function getDefaultAutomationEngine() {
  if (!defaultEngine) {
    defaultEngine = createCampaignAutomationEngine(createCampaignAutomationRepository());
  }
  return defaultEngine;
}

/** @param {ReturnType<typeof createCampaignAutomationEngine>|null} engine */
export function __setDefaultAutomationEngineForTests(engine) {
  defaultEngine = engine;
}

export function __resetAutomationRuntimeForTests() {
  intentRepositoryReset();
  defaultEngine = createCampaignAutomationEngine(createCampaignAutomationRepository());
  useMowjStore.getState().bump();
}
