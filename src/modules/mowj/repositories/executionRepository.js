/**
 * CampaignExecution repository — in-memory SSOT.
 */

import {
  MOWJ_DEFAULT_ACTOR_NAME as CURRENT_USER,
  getMowjTodayJalali as getTodayJalali,
} from '../domain/runtimeDefaults';
import {
  EXECUTION_STATUS,
  normalizeCampaignExecution,
} from '../domain/execution.types';

/** @type {Array<object>} */
let executions = seedExecutions();

function seedExecutions() {
  const today = getTodayJalali() || '1405/05/10';
  const raw = [
    {
      id: 'cex-1',
      campaignId: 'cmp-1',
      runNumber: 1,
      startedAt: '2026-07-31T08:00:00.000Z',
      completedAt: '2026-07-31T09:30:00.000Z',
      runDate: today,
      status: EXECUTION_STATUS.COMPLETED,
      executionChannelId: 'WHATSAPP',
      targetCount: 3,
      // Counters recorded from that run — not synthetic % analytics
      successCount: 0,
      failureCount: 0,
      createdBy: { userId: 'user-current', name: CURRENT_USER },
      audienceSnapshotId: 'snap-1',
      createdAt: '2026-07-31T08:00:00.000Z',
      updatedAt: '2026-07-31T09:30:00.000Z',
    },
  ];
  return raw.map((item) => normalizeCampaignExecution(item)).filter(Boolean);
}

function snapshot() {
  return executions.map((item) => ({ ...item }));
}

export function executionRepositoryFindAll() {
  return snapshot().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function executionRepositoryFindById(id) {
  if (id == null || id === '') return null;
  return snapshot().find((item) => String(item.id) === String(id)) || null;
}

export function executionRepositoryFindByCampaignId(campaignId) {
  if (campaignId == null || campaignId === '') return [];
  return snapshot()
    .filter((item) => String(item.campaignId) === String(campaignId))
    .sort((a, b) => b.runNumber - a.runNumber);
}

export function executionRepositoryNextRunNumber(campaignId) {
  const rows = executionRepositoryFindByCampaignId(campaignId);
  if (!rows.length) return 1;
  return Math.max(...rows.map((row) => row.runNumber || 0)) + 1;
}

export function executionRepositorySave(record) {
  const next = normalizeCampaignExecution(record);
  if (!next?.id) return null;
  next.updatedAt = new Date().toISOString();
  const index = executions.findIndex((item) => String(item.id) === String(next.id));
  if (index === -1) {
    if (!next.createdAt) next.createdAt = next.updatedAt;
    executions = [next, ...executions];
  } else {
    executions = executions.slice();
    executions[index] = {
      ...executions[index],
      ...next,
      createdAt: executions[index].createdAt,
      updatedAt: next.updatedAt,
    };
  }
  return executionRepositoryFindById(next.id);
}

export function executionRepositoryResetToSeed() {
  executions = seedExecutions();
  return executionRepositoryFindAll();
}

/**
 * @returns {import('../domain/execution.repository.ports').CampaignExecutionRepository}
 */
export function createCampaignExecutionRepository() {
  return {
    findAll: executionRepositoryFindAll,
    findById: executionRepositoryFindById,
    findByCampaignId: executionRepositoryFindByCampaignId,
    nextRunNumber: executionRepositoryNextRunNumber,
    save: executionRepositorySave,
  };
}
