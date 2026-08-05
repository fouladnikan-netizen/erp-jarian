/**
 * Audience snapshot repository — in-memory SSOT.
 */

import { getMowjTodayJalali as getTodayJalali } from '../domain/runtimeDefaults';
import { AUDIENCE_SOURCE_TYPE } from '../domain/audienceDefinition';
import {
  SNAPSHOT_MEMBER_STATUS,
  normalizeAudienceSnapshot,
} from '../domain/audienceSnapshot.types';

/** @type {Array<object>} */
let snapshots = seedSnapshots();

function seedSnapshots() {
  const today = getTodayJalali() || '1405/05/10';
  const raw = [
    {
      id: 'snap-1',
      campaignId: 'cmp-1',
      executionId: 'cex-1',
      snapshotDate: today,
      source: AUDIENCE_SOURCE_TYPE.KANOON_COMPANY,
      audienceDefinitionId: 'aud-1',
      members: [
        { companyId: '1', customerId: '1', contactId: '1', leadId: null, orderId: null, status: SNAPSHOT_MEMBER_STATUS.INCLUDED },
        { companyId: '2', customerId: '2', contactId: '2', leadId: null, orderId: null, status: SNAPSHOT_MEMBER_STATUS.INCLUDED },
        { companyId: '3', customerId: '3', contactId: '3', leadId: null, orderId: null, status: SNAPSHOT_MEMBER_STATUS.INCLUDED },
      ],
      createdAt: '2026-07-31T08:00:00.000Z',
    },
  ];
  return raw.map((item) => normalizeAudienceSnapshot(item)).filter(Boolean);
}

function copy() {
  return snapshots.map((item) => ({
    ...item,
    members: item.members.map((m) => ({ ...m })),
  }));
}

export function snapshotRepositoryFindAll() {
  return copy().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function snapshotRepositoryFindById(id) {
  if (id == null || id === '') return null;
  return copy().find((item) => String(item.id) === String(id)) || null;
}

export function snapshotRepositoryFindByCampaignId(campaignId) {
  if (campaignId == null || campaignId === '') return [];
  return copy()
    .filter((item) => String(item.campaignId) === String(campaignId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function snapshotRepositorySave(record) {
  const next = normalizeAudienceSnapshot(record);
  if (!next?.id) return null;
  const index = snapshots.findIndex((item) => String(item.id) === String(next.id));
  if (index === -1) {
    snapshots = [next, ...snapshots];
  } else {
    snapshots = snapshots.slice();
    snapshots[index] = next;
  }
  return snapshotRepositoryFindById(next.id);
}

export function snapshotRepositoryResetToSeed() {
  snapshots = seedSnapshots();
  return snapshotRepositoryFindAll();
}

/**
 * @returns {import('../domain/audienceSnapshot.repository.ports').AudienceSnapshotRepository}
 */
export function createAudienceSnapshotRepository() {
  return {
    save: snapshotRepositorySave,
    findById: snapshotRepositoryFindById,
    findByCampaignId: snapshotRepositoryFindByCampaignId,
  };
}
