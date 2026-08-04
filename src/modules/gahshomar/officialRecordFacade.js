/**
 * Gahshomar Official Record Facade (MVP).
 * UI must communicate ONLY with this module — never the repository directly.
 */

import { useMemo } from 'react';
import { getTodayJalali } from '../nabz/dateUtils';
import {
  RECORD_DIRECTION,
  RECORD_STATUS,
  defaultStatusForDirection,
  normalizeDirection,
} from './models/officialRecord';
import {
  repositoryCreateDraft,
  repositoryCreateReply,
  repositoryFindAll,
  repositoryFindByCompanyId,
  repositoryFindById,
  repositoryFindByThreadId,
  repositoryIssueRecord,
  repositoryReplaceAll,
  repositoryResetToSeed,
  repositorySave,
  toDetailPresentationModel,
  toListPresentationModel,
} from './repositories/officialRecordRepository';
import { searchLetterContacts } from './services/letterContactSearch';
import { getLetterSignatory } from './services/letterDocument';
import { ensureLetterHtml, htmlToPlainText, isHtmlContent, plainTextToHtml } from './services/letterHtml';
import { useOfficialRecordStore } from './store/useOfficialRecordStore';

function bumpStore() {
  useOfficialRecordStore.getState().bump();
}

function getToday() {
  try {
    return getTodayJalali();
  } catch {
    return null;
  }
}

function matchesTab(record, tab) {
  if (tab === 'incoming') return record.direction === RECORD_DIRECTION.INCOMING;
  if (tab === 'outgoing') return record.direction === RECORD_DIRECTION.OUTGOING;
  return true;
}

function matchesKpi(record, kpiFilter) {
  if (!kpiFilter) return true;
  if (kpiFilter === 'new-incoming') {
    return record.direction === RECORD_DIRECTION.INCOMING
      && record.status === RECORD_STATUS.RECEIVED;
  }
  if (kpiFilter === 'pending-action') {
    return record.status === RECORD_STATUS.RECEIVED
      || record.status === RECORD_STATUS.DRAFT;
  }
  if (kpiFilter === 'issued-today') {
    if (record.direction !== RECORD_DIRECTION.OUTGOING) return false;
    if (record.status !== RECORD_STATUS.ISSUED) return false;
    const today = getToday();
    if (!today) return true;
    return record.recordDate === today;
  }
  return true;
}

function matchesSearch(record, search) {
  const q = String(search || '').trim().toLowerCase();
  if (!q) return true;
  const hay = [
    record.number,
    record.subject,
    record.participants?.sender?.name,
    record.participants?.receiver?.name,
  ].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(q);
}

/**
 * @param {{ tab?: 'incoming'|'outgoing', search?: string, kpiFilter?: string|null, companyId?: string|number|null }} [filters]
 * @returns {Array<object>} list presentation models
 */
export function listOfficialRecords(filters = {}) {
  const { tab = 'outgoing', search = '', kpiFilter = null, companyId = null } = filters;

  return repositoryFindAll()
    .filter((record) => {
      if (!matchesTab(record, tab)) return false;
      if (companyId != null && companyId !== '' && companyId !== 'all') {
        if (String(record.companyId) !== String(companyId)) return false;
      }
      if (!matchesKpi(record, kpiFilter)) return false;
      return matchesSearch(record, search);
    })
    .map(toListPresentationModel);
}

/**
 * @param {string|number} id
 * @returns {object|null} detail presentation model
 */
export function getOfficialRecord(id) {
  const record = repositoryFindById(id);
  if (!record) return null;
  const thread = repositoryFindByThreadId(record.threadId)
    .filter((item) => String(item.id) !== String(record.id));
  return toDetailPresentationModel(record, { thread });
}

/**
 * Create a reply draft from an incoming record.
 * Swaps sender/receiver, copies threadId/referenceId.
 * @param {string|number} recordId
 * @returns {object|null} detail presentation model for EDIT drawer
 */
export function createReply(recordId) {
  const created = repositoryCreateReply(recordId);
  if (!created) return null;
  bumpStore();
  return getOfficialRecord(created.id);
}

/**
 * Begin a new record draft for CREATE drawer.
 * @param {'incoming'|'outgoing'|string} direction
 * @returns {object|null}
 */
export function createDraftRecord(direction) {
  const normalized = normalizeDirection(direction);
  if (!normalized) return null;
  const created = repositoryCreateDraft({ direction: normalized });
  if (!created) return null;
  bumpStore();
  return getOfficialRecord(created.id);
}

/**
 * Persist record changes from CREATE/EDIT drawer.
 * @param {string|number} id
 * @param {object} payload
 * @returns {object|null}
 */
export function saveOfficialRecord(id, payload = {}) {
  const existing = repositoryFindById(id);
  if (!existing) return null;
  if (existing.isLocked) return getOfficialRecord(id);

  const direction = normalizeDirection(payload.direction) || existing.direction;
  const saved = repositorySave({
    ...existing,
    ...payload,
    id,
    direction,
    body: payload.body != null ? ensureLetterHtml(payload.body) : existing.body,
    participants: payload.participants || existing.participants,
    status: payload.status || existing.status || defaultStatusForDirection(direction),
  });
  if (!saved) return null;
  bumpStore();
  return getOfficialRecord(saved.id);
}

/**
 * Mock DeepSeek polish — only rewrites letter body (HTML or plain).
 * Never touches subject / parties / registry fields.
 * @param {string} content
 * @returns {Promise<string>} polished HTML
 */
export async function polishLetterText(content) {
  const rawInput = String(content || '').trim();
  if (!rawInput) return '';

  await new Promise((resolve) => {
    setTimeout(resolve, 650);
  });

  const asHtml = isHtmlContent(rawInput);
  const plain = asHtml ? htmlToPlainText(rawInput) : rawInput;
  const cleaned = plain
    .replace(/\s+/g, ' ')
    .replace(/\s*([،؛.!؟])\s*/g, '$1 ')
    .trim();

  let polishedPlain;
  if (/^با سلام/.test(cleaned)) {
    polishedPlain = `${cleaned}${/[.؟!]$/.test(cleaned) ? '' : '.'}`;
  } else {
    polishedPlain = [
      'با سلام و احترام',
      '',
      cleaned,
      '',
      'خواهشمند است دستور فرمایید اقدام لازم مبذول گردد.',
    ].join('\n');
  }

  return plainTextToHtml(polishedPlain);
}

/**
 * Search Kanoon companies for letter recipient/sender (same catalog shape as Nabz CustomerCombobox).
 * @param {string} [query]
 */
export function searchOfficialRecordContacts(query = '') {
  return searchLetterContacts(query);
}

/**
 * Sign & issue outgoing letter: registry number + lock.
 * @param {string|number} id
 * @param {object} [payload] optional last-minute field updates before lock
 */
export function issueOfficialRecord(id, payload = {}) {
  const existing = repositoryFindById(id);
  if (!existing) return null;
  if (existing.direction !== RECORD_DIRECTION.OUTGOING) return null;

  const receiver = payload.participants?.receiver || existing.participants?.receiver;
  if (!receiver?.partyId || receiver.partyType !== 'CONTACT') {
    return null;
  }

  if (!existing.isLocked && Object.keys(payload).length) {
    repositorySave({
      ...existing,
      ...payload,
      id,
      body: payload.body != null ? ensureLetterHtml(payload.body) : existing.body,
      participants: payload.participants || existing.participants,
    });
  }

  const issued = repositoryIssueRecord(id, {
    issuedBy: payload.issuedBy || getLetterSignatory().name,
    issuerTitle: payload.issuerTitle || getLetterSignatory().title,
    recordDate: payload.recordDate,
  });
  if (!issued) return null;
  bumpStore();
  return getOfficialRecord(issued.id);
}

/**
 * Company-scoped list for CustomerProfile documents tab.
 * @param {string|number} companyId
 */
export function listOfficialRecordsByCompany(companyId) {
  return repositoryFindByCompanyId(companyId).map(toListPresentationModel);
}

export function computeOfficialRecordKpis() {
  const all = repositoryFindAll();
  const newIncoming = all.filter((r) => (
    r.direction === RECORD_DIRECTION.INCOMING && r.status === RECORD_STATUS.RECEIVED
  )).length;
  const pendingAction = all.filter((r) => (
    r.status === RECORD_STATUS.RECEIVED || r.status === RECORD_STATUS.DRAFT
  )).length;
  const today = getToday();
  const issuedToday = all.filter((r) => {
    if (r.direction !== RECORD_DIRECTION.OUTGOING || r.status !== RECORD_STATUS.ISSUED) return false;
    if (!today) return true;
    return r.recordDate === today;
  }).length;

  return [
    {
      id: 'new-incoming',
      label: 'نامه‌های جدید دریافتی',
      value: newIncoming.toLocaleString('fa-IR'),
      trend: 'فیلتر',
      trendDir: 'up',
      variant: 'accent',
    },
    {
      id: 'pending-action',
      label: 'منتظر اقدام من',
      value: pendingAction.toLocaleString('fa-IR'),
      trend: 'فیلتر',
      trendDir: 'up',
      variant: 'danger',
    },
    {
      id: 'issued-today',
      label: 'ارسالی امروز',
      value: issuedToday.toLocaleString('fa-IR'),
      trend: 'فیلتر',
      trendDir: 'up',
    },
  ];
}

export function useOfficialRecordList(filters = {}) {
  const version = useOfficialRecordStore((state) => state.version);
  const { tab, search, kpiFilter, companyId } = filters;
  return useMemo(
    () => listOfficialRecords({ tab, search, kpiFilter, companyId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, search, kpiFilter, companyId, version],
  );
}

export function useOfficialRecordKpis() {
  const version = useOfficialRecordStore((state) => state.version);
  return useMemo(
    () => computeOfficialRecordKpis(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
}

export function useCompanyOfficialRecords(companyId) {
  const version = useOfficialRecordStore((state) => state.version);
  return useMemo(
    () => listOfficialRecordsByCompany(companyId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyId, version],
  );
}

/** Test helpers — not for UI. */
export const __testing = {
  replaceAll: (records) => {
    repositoryReplaceAll(records);
    bumpStore();
  },
  resetToSeed: () => {
    repositoryResetToSeed();
    bumpStore();
  },
};
