/**
 * In-memory ExecutionIntent repository.
 */

import { normalizeExecutionIntent } from '../domain/executionIntent.types';

/** @type {Array<object>} */
let intents = [];

function copy() {
  return intents.map((item) => ({
    ...item,
    triggerEvent: { ...item.triggerEvent, payload: { ...item.triggerEvent.payload } },
    audienceReference: item.audienceReference ? { ...item.audienceReference } : null,
    schedule: { ...item.schedule },
  }));
}

export function intentRepositorySave(record) {
  const next = normalizeExecutionIntent(record);
  if (!next) return null;
  const index = intents.findIndex((item) => String(item.id) === String(next.id));
  if (index === -1) {
    intents = [next, ...intents];
  } else {
    intents = intents.slice();
    intents[index] = next;
  }
  return copy().find((item) => item.id === next.id) || null;
}

export function intentRepositoryFindAll() {
  return copy().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function intentRepositoryFindByCampaignId(campaignId) {
  if (campaignId == null || campaignId === '') return [];
  return copy().filter((item) => String(item.campaignId) === String(campaignId));
}

export function intentRepositoryReset() {
  intents = [];
  return intentRepositoryFindAll();
}

/**
 * @returns {import('../domain/executionIntent.repository.ports').ExecutionIntentRepository}
 */
export function createExecutionIntentRepository() {
  return {
    save: intentRepositorySave,
    findAll: intentRepositoryFindAll,
    findByCampaignId: intentRepositoryFindByCampaignId,
    reset: intentRepositoryReset,
  };
}
