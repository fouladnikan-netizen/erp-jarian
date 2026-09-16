/**
 * Campaign analytics runtime — wires repository without domain → store coupling.
 */

import { createCampaignAnalyticsService } from '../domain/campaignAnalytics';
import {
  analyticsRepositoryReset,
  createCampaignAnalyticsRepository,
} from '../repositories/campaignAnalyticsRepository';
import { useMowjStore } from '../store/useMowjStore';

let defaultService = null;

function wrapRepository() {
  const base = createCampaignAnalyticsRepository();
  return {
    addAttribution(attribution) {
      const saved = base.addAttribution(attribution);
      if (saved) useMowjStore.getState().bump();
      return saved;
    },
    getCampaignResults: base.getCampaignResults,
    getKpiSummary: base.getKpiSummary,
    reset: base.reset,
  };
}

export function getDefaultCampaignAnalyticsService() {
  if (!defaultService) {
    defaultService = createCampaignAnalyticsService(wrapRepository());
  }
  return defaultService;
}

/** @param {ReturnType<typeof createCampaignAnalyticsService>|null} service */
export function __setDefaultCampaignAnalyticsForTests(service) {
  defaultService = service;
}

export function __resetAnalyticsRuntimeForTests() {
  analyticsRepositoryReset();
  defaultService = createCampaignAnalyticsService(wrapRepository());
  useMowjStore.getState().bump();
}
