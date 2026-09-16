/**
 * Campaign automation repository contract — no store imports.
 * Implementations live in adapters / repositories.
 */

/**
 * @typedef {object} CampaignAutomationRepository
 * @property {() => object[]} findActiveCampaigns
 * @property {(triggerCodeOrEventType: string) => object[]} findByTrigger
 * @property {(intent: object) => object|null} saveExecutionIntent
 * @property {(campaignId?: string) => object[]} [listExecutionIntents]
 */

/**
 * @returns {CampaignAutomationRepository}
 */
export function createEmptyCampaignAutomationRepository() {
  const intents = [];
  return {
    findActiveCampaigns: () => [],
    findByTrigger: () => [],
    saveExecutionIntent: (intent) => {
      if (!intent) return null;
      intents.unshift(intent);
      return intent;
    },
    listExecutionIntents: () => [...intents],
  };
}
