/**
 * Execution facade — prepare run, history, snapshots.
 * Does not send SMS/WhatsApp/Email or call ad networks.
 */

import { useMemo } from 'react';
import {
  MOWJ_DEFAULT_ACTOR_NAME as CURRENT_USER,
  getMowjTodayJalali as getTodayJalali,
} from '../domain/runtimeDefaults';
import {
  CAMPAIGN_STATUS,
  assertCampaignTransition,
  getExecutionChannelLabel,
} from '../domain';
import {
  normalizeAudienceSnapshot,
} from '../domain/audienceSnapshot.types';
import {
  snapshotMembersFromResolved,
} from '../domain/audienceResolver';
import {
  EXECUTION_STATUS,
  EXECUTION_STATUS_LABELS,
  normalizeCampaignExecution,
} from '../domain/execution.types';
import { getDefaultAudienceResolver } from '../adapters/audienceResolver.runtime';
import {
  repositoryFindById,
  repositorySave,
} from '../repositories/campaignRepository';
import {
  executionRepositoryFindByCampaignId,
  executionRepositoryFindById,
  executionRepositoryNextRunNumber,
  executionRepositoryResetToSeed,
  executionRepositorySave,
} from '../repositories/executionRepository';
import {
  snapshotRepositoryFindByCampaignId,
  snapshotRepositoryFindById,
  snapshotRepositoryResetToSeed,
  snapshotRepositorySave,
} from '../repositories/audienceSnapshotRepository';
import { useMowjStore } from '../store/useMowjStore';

function bump() {
  useMowjStore.getState().bump();
}

function toExecutionPresentation(row) {
  if (!row) return null;
  return {
    id: row.id,
    campaignId: row.campaignId,
    runNumber: row.runNumber,
    runLabel: `اجرای ${Number(row.runNumber || 0).toLocaleString('fa-IR')}`,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    runDate: row.runDate,
    status: row.status,
    statusLabel: EXECUTION_STATUS_LABELS[row.status] || row.status,
    executionChannelId: row.executionChannelId,
    channelLabel: getExecutionChannelLabel(row.executionChannelId),
    targetCount: row.targetCount,
    successCount: row.successCount,
    failureCount: row.failureCount,
    createdBy: row.createdBy,
    audienceSnapshotId: row.audienceSnapshotId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Transition campaign status with lifecycle guard.
 * @returns {{ ok: boolean, campaign?: object, error?: string }}
 */
export function transitionCampaignStatus(campaignId, nextStatus) {
  const existing = repositoryFindById(campaignId);
  if (!existing) return { ok: false, error: 'کمپین یافت نشد.' };
  const check = assertCampaignTransition(existing.status, nextStatus);
  if (!check.ok) return { ok: false, error: check.error };
  const saved = repositorySave({ ...existing, status: nextStatus });
  if (!saved) return { ok: false, error: 'ذخیره وضعیت ناموفق بود.' };
  bump();
  return { ok: true, campaign: saved };
}

/**
 * Prepare execution: freeze audience snapshot + create PREPARED run.
 * DRAFT → READY. Does not dispatch to external channels.
 *
 * @param {string} campaignId
 * @returns {{ ok: boolean, execution?: object, snapshot?: object, error?: string }}
 */
export function prepareCampaignExecution(campaignId) {
  const campaign = repositoryFindById(campaignId);
  if (!campaign) return { ok: false, error: 'کمپین یافت نشد.' };

  if (campaign.status === CAMPAIGN_STATUS.DRAFT) {
    const moved = transitionCampaignStatus(campaignId, CAMPAIGN_STATUS.READY);
    if (!moved.ok) return { ok: false, error: moved.error };
  } else if (
    campaign.status !== CAMPAIGN_STATUS.READY
    && campaign.status !== CAMPAIGN_STATUS.PAUSED
  ) {
    return {
      ok: false,
      error: 'آماده‌سازی اجرا فقط از وضعیت پیش‌نویس، آماده یا متوقف مجاز است.',
    };
  }

  const refreshed = repositoryFindById(campaignId);
  const resolved = getDefaultAudienceResolver().resolve(refreshed.audience);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error || 'حل مخاطب ناموفق بود.' };
  }
  const members = snapshotMembersFromResolved(resolved.members);
  const snapshot = snapshotRepositorySave(normalizeAudienceSnapshot({
    campaignId: refreshed.id,
    snapshotDate: getTodayJalali(),
    source: refreshed.audience?.sourceType,
    audienceDefinitionId: refreshed.audience?.id,
    members,
  }));
  if (!snapshot) return { ok: false, error: 'ثبت اسنپ‌شات مخاطب ناموفق بود.' };

  const runNumber = executionRepositoryNextRunNumber(refreshed.id);
  const execution = executionRepositorySave(normalizeCampaignExecution({
    campaignId: refreshed.id,
    runNumber,
    status: EXECUTION_STATUS.PREPARED,
    executionChannelId: refreshed.executionChannelId,
    targetCount: snapshot.memberCount,
    successCount: 0,
    failureCount: 0,
    runDate: getTodayJalali(),
    audienceSnapshotId: snapshot.id,
    createdBy: {
      userId: refreshed.owner?.userId || 'user-current',
      name: refreshed.owner?.name || CURRENT_USER,
    },
  }));
  if (!execution) return { ok: false, error: 'ثبت اجرای کمپین ناموفق بود.' };

  snapshotRepositorySave({
    ...snapshot,
    executionId: execution.id,
  });

  bump();
  return {
    ok: true,
    execution: toExecutionPresentation(execution),
    snapshot,
  };
}

/**
 * Mark prepared run as RUNNING and campaign RUNNING — still no channel send.
 */
export function markExecutionRunning(executionId) {
  const execution = executionRepositoryFindById(executionId);
  if (!execution) return { ok: false, error: 'اجرا یافت نشد.' };
  if (execution.status !== EXECUTION_STATUS.PREPARED) {
    return { ok: false, error: 'فقط اجرای آماده‌شده قابل شروع است.' };
  }

  const campaignMove = transitionCampaignStatus(execution.campaignId, CAMPAIGN_STATUS.RUNNING);
  if (!campaignMove.ok) {
    const campaign = repositoryFindById(execution.campaignId);
    if (campaign?.status !== CAMPAIGN_STATUS.RUNNING) {
      return { ok: false, error: campaignMove.error };
    }
  }

  const saved = executionRepositorySave({
    ...execution,
    status: EXECUTION_STATUS.RUNNING,
    startedAt: new Date().toISOString(),
  });
  bump();
  return { ok: true, execution: toExecutionPresentation(saved) };
}

export function listCampaignExecutions(campaignId) {
  return executionRepositoryFindByCampaignId(campaignId).map(toExecutionPresentation);
}

export function getAudienceSnapshots(campaignId) {
  return snapshotRepositoryFindByCampaignId(campaignId);
}

export function getAudienceSnapshot(id) {
  return snapshotRepositoryFindById(id);
}

export function useCampaignExecutions(campaignId) {
  const version = useMowjStore((s) => s.version);
  return useMemo(
    () => listCampaignExecutions(campaignId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, campaignId],
  );
}

export const __executionTesting = {
  resetToSeed: () => {
    executionRepositoryResetToSeed();
    snapshotRepositoryResetToSeed();
    bump();
  },
};
