/**
 * In-memory ChannelExecutionRepository.
 */

import { createEntityId, ENTITY_ID_PREFIX } from '../../../domain/identity';

/** @type {object[]} */
let attempts = [];
/** @type {object[]} */
let results = [];

function copyAttempt(row) {
  return {
    ...row,
    request: row.request ? { ...row.request } : null,
  };
}

function copyResult(row) {
  return { ...row };
}

export function channelExecutionSaveAttempt(record) {
  if (!record) return null;
  const row = {
    ...record,
    id: record.id || createEntityId(ENTITY_ID_PREFIX.CAMPAIGN, 'ch-attempt'),
    createdAt: record.createdAt || new Date().toISOString(),
  };
  attempts = [row, ...attempts];
  return copyAttempt(row);
}

export function channelExecutionSaveResult(record) {
  if (!record) return null;
  const row = {
    ...record,
    id: record.id || createEntityId(ENTITY_ID_PREFIX.CAMPAIGN, 'ch-result'),
    createdAt: record.createdAt || new Date().toISOString(),
  };
  results = [row, ...results];
  return copyResult(row);
}

export function channelExecutionListByCampaign(campaignId) {
  if (campaignId == null || campaignId === '') return [];
  return results
    .filter((row) => String(row.campaignId) === String(campaignId))
    .map(copyResult);
}

export function channelExecutionListAttempts(campaignId) {
  if (campaignId == null || campaignId === '') return [];
  return attempts
    .filter((row) => String(row.campaignId) === String(campaignId))
    .map(copyAttempt);
}

export function channelExecutionReset() {
  attempts = [];
  results = [];
}

/**
 * @returns {import('../domain/channelExecution.ports').ChannelExecutionRepository}
 */
export function createChannelExecutionRepository() {
  return {
    saveAttempt: channelExecutionSaveAttempt,
    saveResult: channelExecutionSaveResult,
    listByCampaign: channelExecutionListByCampaign,
    listAttempts: channelExecutionListAttempts,
  };
}
