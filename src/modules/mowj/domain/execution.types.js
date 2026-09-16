/**
 * CampaignExecution domain — tracks each run attempt (no channel send).
 */

import { createEntityId, ENTITY_ID_PREFIX } from '../../../domain/identity';
import { MOWJ_DEFAULT_ACTOR_NAME as CURRENT_USER, getMowjTodayJalali as getTodayJalali } from './runtimeDefaults';
import { getExecutionChannel } from './channel.catalog';

export const EXECUTION_STATUS = Object.freeze({
  PREPARED: 'PREPARED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});

export const EXECUTION_STATUS_LABELS = Object.freeze({
  PREPARED: 'آماده‌شده',
  RUNNING: 'در حال اجرا',
  COMPLETED: 'تکمیل‌شده',
  FAILED: 'ناموفق',
  CANCELLED: 'لغوشده',
});

const EXECUTION_STATUS_SET = new Set(Object.values(EXECUTION_STATUS));

/**
 * @typedef {object} CampaignExecution
 * @property {string} id
 * @property {string} campaignId
 * @property {number} runNumber
 * @property {string|null} startedAt
 * @property {string|null} completedAt
 * @property {string|null} runDate  Jalali display date
 * @property {string} status
 * @property {string|null} executionChannelId
 * @property {number} targetCount
 * @property {number} successCount
 * @property {number} failureCount
 * @property {{ userId: string, name: string }} createdBy
 * @property {string|null} audienceSnapshotId
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @param {object} input
 * @returns {CampaignExecution|null}
 */
export function normalizeCampaignExecution(input = {}) {
  const campaignId = String(input.campaignId || '').trim();
  if (!campaignId) return null;

  const statusRaw = String(input.status || EXECUTION_STATUS.PREPARED).toUpperCase();
  const status = EXECUTION_STATUS_SET.has(statusRaw)
    ? statusRaw
    : EXECUTION_STATUS.PREPARED;

  const channelId = input.executionChannelId != null && input.executionChannelId !== ''
    ? String(input.executionChannelId)
    : (input.executionChannel?.id ? String(input.executionChannel.id) : null);
  const channel = channelId ? getExecutionChannel(channelId) : null;

  const toCount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };

  const nowIso = new Date().toISOString();
  const createdBy = input.createdBy && typeof input.createdBy === 'object'
    ? {
      userId: String(input.createdBy.userId || 'user-current'),
      name: String(input.createdBy.name || CURRENT_USER).trim() || CURRENT_USER,
    }
    : { userId: 'user-current', name: CURRENT_USER };

  return {
    id: input.id != null && input.id !== ''
      ? String(input.id)
      : createEntityId(ENTITY_ID_PREFIX.CAMPAIGN, 'exec'),
    campaignId,
    runNumber: Math.max(1, toCount(input.runNumber) || 1),
    startedAt: input.startedAt || null,
    completedAt: input.completedAt || null,
    runDate: String(input.runDate || '').trim() || getTodayJalali() || null,
    status,
    executionChannelId: channel?.id || null,
    targetCount: toCount(input.targetCount),
    successCount: toCount(input.successCount),
    failureCount: toCount(input.failureCount),
    createdBy,
    audienceSnapshotId: input.audienceSnapshotId != null
      ? String(input.audienceSnapshotId)
      : null,
    createdAt: input.createdAt || nowIso,
    updatedAt: input.updatedAt || nowIso,
  };
}
