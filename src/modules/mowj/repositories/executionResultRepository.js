/**
 * In-memory ExecutionResult repository.
 */

import { normalizeExecutionResult } from '../domain/executionResult.types';

/** @type {Array<object>} */
let results = [];

function copyRow(item) {
  return {
    ...item,
    payload: item.payload ? { ...item.payload } : null,
  };
}

function copy() {
  return results.map(copyRow);
}

export function executionResultRepositorySave(record) {
  const next = normalizeExecutionResult(record);
  if (!next) return null;
  const index = results.findIndex((item) => String(item.id) === String(next.id));
  if (index === -1) {
    results = [next, ...results];
  } else {
    results = results.slice();
    results[index] = next;
  }
  return copy().find((item) => item.id === next.id) || null;
}

export function executionResultRepositoryFindAll() {
  return copy().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function executionResultRepositoryFindById(id) {
  if (id == null || id === '') return null;
  return copy().find((item) => String(item.id) === String(id)) || null;
}

export function executionResultRepositoryFindByCampaignId(campaignId) {
  if (campaignId == null || campaignId === '') return [];
  return copy().filter((item) => String(item.campaignId) === String(campaignId));
}

export function executionResultRepositoryFindByIntentId(executionIntentId) {
  if (executionIntentId == null || executionIntentId === '') return null;
  return copy().find((item) => (
    String(item.executionIntentId) === String(executionIntentId)
  )) || null;
}

export function executionResultRepositoryReset() {
  results = [];
  return executionResultRepositoryFindAll();
}

/**
 * @returns {import('../domain/executor.ports').ExecutionResultRepository}
 */
export function createExecutionResultRepository() {
  return {
    save: executionResultRepositorySave,
    findById: executionResultRepositoryFindById,
    findByCampaignId: executionResultRepositoryFindByCampaignId,
    findByIntentId: executionResultRepositoryFindByIntentId,
    findAll: executionResultRepositoryFindAll,
  };
}
