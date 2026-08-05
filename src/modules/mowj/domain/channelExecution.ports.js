/**
 * ChannelExecutionRepository contract — attempts + results, no store imports.
 */

import { createEntityId, ENTITY_ID_PREFIX } from '../../../domain/identity';

/**
 * @typedef {object} ChannelExecutionRepository
 * @property {(attempt: object) => object|null} saveAttempt
 * @property {(result: object) => object|null} saveResult
 * @property {(campaignId: string) => object[]} [listByCampaign]
 */

/**
 * @returns {ChannelExecutionRepository}
 */
export function createEmptyChannelExecutionRepository() {
  /** @type {object[]} */
  const attempts = [];
  /** @type {object[]} */
  const results = [];

  return {
    saveAttempt(attempt) {
      if (!attempt) return null;
      const row = {
        ...attempt,
        id: attempt.id || createEntityId(ENTITY_ID_PREFIX.CAMPAIGN, 'ch-attempt'),
        createdAt: attempt.createdAt || new Date().toISOString(),
      };
      attempts.unshift(row);
      return row;
    },
    saveResult(result) {
      if (!result) return null;
      const row = {
        ...result,
        id: result.id || createEntityId(ENTITY_ID_PREFIX.CAMPAIGN, 'ch-result'),
        createdAt: result.createdAt || new Date().toISOString(),
      };
      results.unshift(row);
      return row;
    },
    listByCampaign(campaignId) {
      return results.filter((row) => String(row.campaignId) === String(campaignId));
    },
    listAttempts(campaignId) {
      return attempts.filter((row) => String(row.campaignId) === String(campaignId));
    },
  };
}
