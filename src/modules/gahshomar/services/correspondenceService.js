/**
 * Gahshomar Correspondence Service (DDL-12)
 *
 * @see Docs/architecture/DOMAIN_DECISION_LOG.md DDL-12
 */

import { useMemo } from 'react';
import { getTodayJalali } from '../../nabz/dateUtils';
import {
  CORRESPONDENCE_DIRECTION,
  CORRESPONDENCE_STATUS,
  CORRESPONDENCE_TYPE,
  DEMO_CURRENT_USER_ID,
  isIncomingViewRecord,
  isOutgoingViewRecord,
  normalizeCorrespondence,
  normalizeDirection,
} from '../models/correspondence';
import { useCorrespondenceStore } from '../store/useCorrespondenceStore';

function sortByLetterDateDesc(a, b) {
  const left = String(a.receivedDate || a.letterDate || a.createdAt || '');
  const right = String(b.receivedDate || b.letterDate || b.createdAt || '');
  return right.localeCompare(left, 'fa');
}

function snapshotAll() {
  return useCorrespondenceStore.getState().records.map((item) => ({ ...item }));
}

/**
 * All correspondence (org-wide secretariat list).
 * @returns {Array<object>}
 */
export function listAllCorrespondence() {
  return snapshotAll().sort(sortByLetterDateDesc);
}

/**
 * @param {'incoming'|'outgoing'} tab
 * @param {{ viewerUserId?: string|null, search?: string, companyId?: string|number|null, kpiFilter?: string|null }} [options]
 *   viewerUserId null → org-wide (internal memos appear in both tabs without duplication)
 */
export function listCorrespondenceByTab(tab, options = {}) {
  const {
    viewerUserId = null,
    search = '',
    companyId = null,
    kpiFilter = null,
  } = options;

  const q = String(search || '').trim().toLowerCase();
  const today = getTodayJalaliApprox();

  return snapshotAll()
    .filter((item) => {
      if (tab === 'incoming') {
        if (!isIncomingViewRecord(item, viewerUserId)) return false;
      } else if (tab === 'outgoing') {
        if (!isOutgoingViewRecord(item, viewerUserId)) return false;
      }

      if (companyId != null && companyId !== '' && companyId !== 'all') {
        if (String(item.companyId) !== String(companyId)) return false;
      }

      if (kpiFilter === 'new-incoming') {
        if (item.direction !== CORRESPONDENCE_DIRECTION.INCOMING
          && item.type !== CORRESPONDENCE_TYPE.INTERNAL) return false;
        if (item.status !== CORRESPONDENCE_STATUS.REGISTERED
          && item.status !== CORRESPONDENCE_STATUS.ACTION_NEEDED) return false;
      }
      if (kpiFilter === 'action-needed') {
        if (item.status !== CORRESPONDENCE_STATUS.ACTION_NEEDED
          && item.status !== CORRESPONDENCE_STATUS.REGISTERED) return false;
      }
      if (kpiFilter === 'outgoing-today') {
        if (!isOutgoingViewRecord(item, viewerUserId)) return false;
        const date = item.letterDate || '';
        if (today && date && date !== today) return false;
      }

      if (!q) return true;
      const hay = [
        item.subject,
        item.letterNumber,
        item.externalNumber,
        item.counterpartyName,
        item.senderName,
        item.receiverName,
        item.category,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    })
    .sort(sortByLetterDateDesc);
}

/** Prefer live Jalali today for «صادره امروز» KPI filters. */
function getTodayJalaliApprox() {
  try {
    return getTodayJalali();
  } catch {
    return null;
  }
}

/**
 * Company-scoped list for CustomerProfile documents tab.
 */
export function listCompanyCorrespondence(companyId) {
  if (companyId == null || companyId === '') return [];
  return snapshotAll()
    .filter((item) => String(item.companyId) === String(companyId))
    .sort(sortByLetterDateDesc);
}

export function useCompanyCorrespondence(companyId) {
  const records = useCorrespondenceStore((state) => state.records);
  return useMemo(
    () => listCompanyCorrespondence(companyId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyId, records],
  );
}

export function useCorrespondenceList(tab, options = {}) {
  const records = useCorrespondenceStore((state) => state.records);
  const { viewerUserId, search, companyId, kpiFilter } = options;
  return useMemo(
    () => listCorrespondenceByTab(tab, { viewerUserId, search, companyId, kpiFilter }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, viewerUserId, search, companyId, kpiFilter, records],
  );
}

export function getCorrespondenceById(id) {
  if (id == null || id === '') return null;
  return snapshotAll().find((item) => String(item.id) === String(id)) || null;
}

export function computeCorrespondenceKpis(records = null) {
  const list = Array.isArray(records) ? records : snapshotAll();
  const newIncoming = list.filter((item) => (
    (item.direction === CORRESPONDENCE_DIRECTION.INCOMING
      || item.type === CORRESPONDENCE_TYPE.INTERNAL)
    && (item.status === CORRESPONDENCE_STATUS.REGISTERED
      || item.status === CORRESPONDENCE_STATUS.ACTION_NEEDED)
  )).length;
  const actionNeeded = list.filter((item) => (
    item.status === CORRESPONDENCE_STATUS.ACTION_NEEDED
    || item.status === CORRESPONDENCE_STATUS.REGISTERED
  )).length;
  const today = getTodayJalaliApprox();
  const outgoingToday = list.filter((item) => {
    if (!isOutgoingViewRecord(item, null)) return false;
    const date = item.letterDate || '';
    if (!today) return true;
    return date === today;
  }).length;

  return [
    {
      id: 'new-incoming',
      label: 'نامه‌های جدید وارده',
      value: newIncoming.toLocaleString('fa-IR'),
      trend: 'فیلتر',
      trendDir: 'up',
      variant: 'accent',
    },
    {
      id: 'action-needed',
      label: 'منتظر اقدام',
      value: actionNeeded.toLocaleString('fa-IR'),
      trend: 'فیلتر',
      trendDir: 'up',
      variant: 'danger',
    },
    {
      id: 'outgoing-today',
      label: 'صادره امروز',
      value: outgoingToday.toLocaleString('fa-IR'),
      trend: 'فیلتر',
      trendDir: 'up',
    },
  ];
}

export function createCorrespondence(payload = {}) {
  const direction = normalizeDirection(payload.direction);
  const type = payload.type || CORRESPONDENCE_TYPE.OFFICIAL;
  const defaultStatus = type === CORRESPONDENCE_TYPE.INTERNAL
    ? CORRESPONDENCE_STATUS.SENT
    : (direction === CORRESPONDENCE_DIRECTION.OUTGOING
      ? CORRESPONDENCE_STATUS.DRAFT
      : CORRESPONDENCE_STATUS.REGISTERED);

  const record = normalizeCorrespondence({
    ...payload,
    id: undefined,
    type,
    status: payload.status || defaultStatus,
    senderUserId: payload.senderUserId || (
      type === CORRESPONDENCE_TYPE.INTERNAL ? DEMO_CURRENT_USER_ID : payload.senderUserId
    ),
  });
  if (!record) return null;

  return useCorrespondenceStore.getState().upsert(record);
}

export function updateCorrespondence(id, payload = {}) {
  if (id == null || id === '') return null;
  return useCorrespondenceStore.getState().patch(id, payload);
}
