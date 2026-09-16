/**
 * Gahshomar Official Record Facade (DDL-23).
 * UI must communicate ONLY with this module — never the repository or the
 * store directly.
 *
 * Mock mode (`VITE_USE_MOCK_API=true`): legacy in-memory repository, sync.
 * API mode (default): PostgreSQL via CorrespondenceRepository, cached in
 * useOfficialRecordStore (SERVER_FIRST). Every mutating function below
 * returns a value in both modes so callers can uniformly `await` them.
 */

import { useEffect, useMemo } from 'react';
import { useMockApi } from '../../api/useMockApi';
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
  repositoryFindByOrderId,
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
import { getDefaultAssignee } from './services/orgPeople';
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

function apiRecords() {
  return useOfficialRecordStore.getState().records;
}

/**
 * @param {{ tab?: 'incoming'|'outgoing', search?: string, kpiFilter?: string|null, companyId?: string|number|null, orderId?: string|number|null }} [filters]
 * @returns {Array<object>} list presentation models
 */
export function listOfficialRecords(filters = {}) {
  const { tab = 'outgoing', search = '', kpiFilter = null, companyId = null, orderId = null } = filters;
  const source = useMockApi() ? repositoryFindAll() : apiRecords();

  return source
    .filter((record) => {
      if (!matchesTab(record, tab)) return false;
      if (companyId != null && companyId !== '' && companyId !== 'all') {
        if (String(record.companyId) !== String(companyId)) return false;
      }
      if (orderId != null && orderId !== '') {
        if (String(record.orderId) !== String(orderId)) return false;
      }
      if (!matchesKpi(record, kpiFilter)) return false;
      return matchesSearch(record, search);
    })
    .map(toListPresentationModel);
}

/** Hydrate the correspondence cache (API mode). No-op in mock mode. */
export async function fetchOfficialRecords(filters = {}) {
  if (useMockApi()) return listOfficialRecords(filters);
  return useOfficialRecordStore.getState().fetchAll(filters);
}

/**
 * @param {string|number} id
 * @returns {object|null} detail presentation model
 */
export function getOfficialRecord(id) {
  if (useMockApi()) {
    const record = repositoryFindById(id);
    if (!record) return null;
    const thread = repositoryFindByThreadId(record.threadId)
      .filter((item) => String(item.id) !== String(record.id));
    return toDetailPresentationModel(record, { thread });
  }

  const record = useOfficialRecordStore.getState().getRecord(id);
  if (!record) return null;
  return toDetailPresentationModel(record, { thread: [] });
}

/** Ensure the record is in cache (API mode), then return its detail presentation model. */
export async function fetchOfficialRecord(id) {
  if (useMockApi()) return getOfficialRecord(id);
  await useOfficialRecordStore.getState().fetchById(id);
  return getOfficialRecord(id);
}

/**
 * Create a reply draft from an incoming record.
 * Swaps sender/receiver, copies threadId/referenceId.
 * @param {string|number} recordId
 * @returns {Promise<object|null>|object|null} detail presentation model for EDIT drawer
 */
export function createReply(recordId) {
  if (useMockApi()) {
    const created = repositoryCreateReply(recordId);
    if (!created) return null;
    bumpStore();
    return getOfficialRecord(created.id);
  }

  const source = getOfficialRecord(recordId);
  if (!source || source.direction !== RECORD_DIRECTION.INCOMING) return Promise.resolve(null);

  return useOfficialRecordStore.getState().createRecordAsync({
    direction: RECORD_DIRECTION.OUTGOING,
    subject: `پاسخ: ${source.subject}`,
    body: '',
    recordDate: getToday() || source.recordDate,
    participants: {
      sender: { name: getLetterSignatory().company, partyType: 'ORG', role: 'SENDER' },
      receiver: { ...source.participants?.sender, role: 'RECEIVER' },
    },
    referenceId: source.referenceId || source.number,
    companyId: source.companyId,
    orderId: source.orderId,
    tags: ['پاسخ'],
  }).then((saved) => (saved ? getOfficialRecord(saved.id) : null));
}

/**
 * Begin a new record draft for CREATE drawer.
 * @param {'incoming'|'outgoing'|string} direction
 * @returns {Promise<object|null>|object|null}
 */
export function createDraftRecord(direction) {
  const normalized = normalizeDirection(direction);
  if (!normalized) return useMockApi() ? null : Promise.resolve(null);

  if (useMockApi()) {
    const draftPayload = { direction: normalized };
    if (normalized === RECORD_DIRECTION.INCOMING) {
      const assignee = getDefaultAssignee();
      if (assignee) {
        draftPayload.assigneeUserId = assignee.id;
        draftPayload.assigneeName = assignee.name;
      }
    }
    const created = repositoryCreateDraft(draftPayload);
    if (!created) return null;
    bumpStore();
    return getOfficialRecord(created.id);
  }

  const payload = { direction: normalized, subject: 'پیش‌نویس جدید' };
  if (normalized === RECORD_DIRECTION.INCOMING) {
    const assignee = getDefaultAssignee();
    if (assignee) {
      payload.assigneeUserId = assignee.id;
      payload.assigneeName = assignee.name;
    }
  }
  return useOfficialRecordStore.getState().createRecordAsync(payload)
    .then((saved) => (saved ? getOfficialRecord(saved.id) : null));
}

function base64FromDataUrl(dataUrl) {
  const idx = String(dataUrl || '').indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

async function uploadPendingAttachments(id, attachments) {
  const pending = (attachments || []).filter((a) => a?.dataUrl && !a.uploaded);
  if (!pending.length) return;
  const { CorrespondenceRepository } = await import('../../api/repositories/CorrespondenceRepository');
  for (const att of pending) {
    // eslint-disable-next-line no-await-in-loop
    await CorrespondenceRepository.addAttachment(id, {
      fileName: att.fileName,
      mimeType: att.mimeType,
      dataBase64: base64FromDataUrl(att.dataUrl),
    });
  }
}

/**
 * Persist record changes from CREATE/EDIT drawer.
 * @param {string|number} id
 * @param {object} payload
 * @returns {Promise<object|null>|object|null}
 */
export function saveOfficialRecord(id, payload = {}) {
  if (useMockApi()) {
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
    return getOfficialRecord(id);
  }

  const existing = useOfficialRecordStore.getState().getRecord(id);
  if (!existing) return Promise.resolve(null);
  if (existing.isLocked) return Promise.resolve(getOfficialRecord(id));

  const isIncoming = existing.direction === RECORD_DIRECTION.INCOMING;

  return (async () => {
    const patch = {
      subject: payload.subject,
      type: payload.type,
      attentionName: payload.attentionName,
      recordDate: payload.recordDate,
      receivedDate: payload.receivedDate,
      companyId: payload.companyId,
      orderId: payload.orderId,
      participants: payload.participants,
      assigneeUserId: payload.assigneeUserId,
      assigneeName: payload.assigneeName,
    };
    if (payload.body != null && !isIncoming) {
      patch.body = ensureLetterHtml(payload.body);
      patch.hasAiDraft = payload.hasAiDraft ?? Boolean(existing.aiRewrittenBody);
    }

    const saved = await useOfficialRecordStore.getState().updateRecordAsync(id, patch);
    if (!saved) return null;

    if (isIncoming && Array.isArray(payload.attachments) && payload.attachments.length) {
      await uploadPendingAttachments(id, payload.attachments);
      // IN correspondence has no separate "issue" step in the UI — first
      // real save (with attachment + required fields) IS the finalize
      // (product rule 3/13; mirrors legacy mock behavior of assigning the
      // registry number on first real persist). Incoming letters carry no
      // authored body (product rule 3), so a minimal final text is
      // synthesized here purely to satisfy the backend's non-empty
      // final-content invariant — it is not editorial content.
      const finalSubject = payload.subject || existing.subject || 'بدون موضوع';
      const finalized = await useOfficialRecordStore.getState().finalizeAsync(id, {
        finalBody: `نامه دریافتی — ${finalSubject}`,
      });
      if (finalized) return getOfficialRecord(id);
    }

    return getOfficialRecord(id);
  })();
}

/**
 * AI rewrite — editor only (product rules 5/6). Never finalizes or mutates
 * status. Returns `{ content, validation }`; caller (drawer) must let the
 * human review/accept before it becomes part of the draft body.
 * @param {string|number} id
 * @param {string} text
 */
export async function aiRewriteOfficialRecord(id, text) {
  if (useMockApi()) {
    const content = await polishLetterText(text);
    return { content, validation: { ok: true, violations: [] } };
  }
  return useOfficialRecordStore.getState().aiRewriteAsync(id, text);
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
 * Sign & issue outgoing letter: server-authoritative registry number (DDL-23a) + lock.
 * @param {string|number} id
 * @param {object} [payload] optional last-minute field updates before lock
 */
export function issueOfficialRecord(id, payload = {}) {
  if (useMockApi()) {
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

  const existing = useOfficialRecordStore.getState().getRecord(id);
  if (!existing) return Promise.resolve(null);
  if (existing.direction !== RECORD_DIRECTION.OUTGOING) return Promise.resolve(null);

  const receiver = payload.participants?.receiver || existing.participants?.receiver;
  if (!receiver?.partyId || receiver.partyType !== 'CONTACT') {
    return Promise.resolve(null);
  }

  return (async () => {
    if (Object.keys(payload).length) {
      await useOfficialRecordStore.getState().updateRecordAsync(id, {
        subject: payload.subject,
        type: payload.type,
        attentionName: payload.attentionName,
        recordDate: payload.recordDate,
        companyId: payload.companyId,
        orderId: payload.orderId,
        participants: payload.participants,
        ...(payload.body != null ? {
          body: ensureLetterHtml(payload.body),
          hasAiDraft: payload.hasAiDraft ?? Boolean(existing.aiRewrittenBody),
        } : {}),
      });
    }

    const finalized = await useOfficialRecordStore.getState().finalizeAsync(id, {
      finalBody: payload.body != null
        ? htmlToPlainText(ensureLetterHtml(payload.body))
        : undefined,
      issuedBy: payload.issuedBy || getLetterSignatory().name,
      issuerTitle: payload.issuerTitle || getLetterSignatory().title,
    });
    if (!finalized) return null;
    return getOfficialRecord(id);
  })();
}

/**
 * Company-scoped list for CustomerProfile documents tab (Kanoon projection,
 * product rule 14 — Kanoon never copies the record, only projects by companyId).
 * @param {string|number} companyId
 */
export function listOfficialRecordsByCompany(companyId) {
  if (useMockApi()) return repositoryFindByCompanyId(companyId).map(toListPresentationModel);
  return apiRecords()
    .filter((r) => String(r.companyId) === String(companyId))
    .map(toListPresentationModel);
}

/**
 * Order-scoped list for Nabz OrderProfile projection (product rule 15 —
 * Nabz never copies the record, only projects by orderId).
 * @param {string|number} orderId
 */
export function listOfficialRecordsByOrder(orderId) {
  if (useMockApi()) return repositoryFindByOrderId(orderId).map(toListPresentationModel);
  return apiRecords()
    .filter((r) => String(r.orderId) === String(orderId))
    .map(toListPresentationModel);
}

export function computeOfficialRecordKpis() {
  const all = useMockApi() ? repositoryFindAll() : apiRecords();
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

function useAutoFetch(deps = []) {
  useEffect(() => {
    if (!useMockApi()) {
      void fetchOfficialRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useOfficialRecordList(filters = {}) {
  const version = useOfficialRecordStore((state) => state.version);
  const { tab, search, kpiFilter, companyId, orderId } = filters;
  useAutoFetch([]);
  return useMemo(
    () => listOfficialRecords({ tab, search, kpiFilter, companyId, orderId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, search, kpiFilter, companyId, orderId, version],
  );
}

export function useOfficialRecordKpis() {
  const version = useOfficialRecordStore((state) => state.version);
  useAutoFetch([]);
  return useMemo(
    () => computeOfficialRecordKpis(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
}

export function useCompanyOfficialRecords(companyId) {
  const version = useOfficialRecordStore((state) => state.version);
  useAutoFetch([]);
  return useMemo(
    () => listOfficialRecordsByCompany(companyId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyId, version],
  );
}

/**
 * Cross-module read-time projections (Pooyesh Timeline, product rule 16)
 * only need to know "did the correspondence cache change" — they build
 * their own event list off `listOfficialRecordsByCompany`, so exposing the
 * raw version counter (rather than a record list) keeps them subscribed
 * without duplicating the query.
 */
export function useOfficialRecordsVersion() {
  const version = useOfficialRecordStore((state) => state.version);
  useAutoFetch([]);
  return version;
}

/** Nabz OrderProfile correspondence projection (product rule 15). */
export function useOrderOfficialRecords(orderId) {
  const version = useOfficialRecordStore((state) => state.version);
  useAutoFetch([]);
  return useMemo(
    () => listOfficialRecordsByOrder(orderId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderId, version],
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
