/**
 * Official Record Repository (MVP).
 * Owns mock data and converts entities → presentation models.
 * React components must NOT import this module directly.
 */

import { getTodayJalali } from '../../nabz/dateUtils';
import {
  ORG_SELF,
  RECORD_DIRECTION,
  RECORD_STATUS,
  RECORD_TYPE,
  STATUS_LABELS,
  TYPE_LABELS,
  defaultStatusForDirection,
  normalizeOfficialRecord,
} from '../models/officialRecord';
import { buildRegistryNumber, formatRegistryNumberFa } from '../services/letterRegistryNumber';

/** @type {Array<object>} */
let records = seedRecords();

function seedRecords() {
  const today = getTodayJalali() || '1404/01/20';
  const raw = [
    {
      id: 'rec-in-001',
      direction: RECORD_DIRECTION.INCOMING,
      type: RECORD_TYPE.OFFICIAL,
      status: RECORD_STATUS.RECEIVED,
      number: '۴۰۴/IN/۱۲۳',
      registryNumber: '۴۰۴/IN/۱۲۳',
      receivedDate: '1404/01/18',
      recordDate: '1404/01/18',
      subject: 'درخواست استعلام قیمت ورق',
      body: 'با سلام، خواهشمند است قیمت ورق ST37 را اعلام فرمایید.',
      participants: {
        sender: { name: 'صنایع فولاد پارس', companyId: 1, partyType: 'CONTACT', partyId: '1', role: 'SENDER' },
        receiver: { name: ORG_SELF.name, userId: ORG_SELF.userId, partyType: 'ORG', role: 'RECEIVER' },
      },
      attachments: [{ id: 'att-1', fileName: 'estelam.pdf' }],
      assigneeUserId: 'user-current',
      assigneeName: 'علی رضایی',
      threadId: 'thread-001',
      referenceId: 'EXT-۸۸۱',
      companyId: 1,
      tags: ['استعلام'],
    },
    {
      id: 'rec-in-002',
      direction: RECORD_DIRECTION.INCOMING,
      type: RECORD_TYPE.OFFICIAL,
      status: RECORD_STATUS.RECEIVED,
      number: '۴۰۴/IN/۱۲۸',
      registryNumber: '۴۰۴/IN/۱۲۸',
      receivedDate: '1404/01/16',
      recordDate: '1404/01/16',
      subject: 'اعلامیه قرارداد سالانه',
      body: 'پیوست قرارداد سال ۱۴۰۴ جهت بررسی و امضا.',
      participants: {
        sender: { name: 'صنایع فلزی کرمان', companyId: 2, partyType: 'CONTACT', partyId: 'rp-2-1', role: 'SENDER' },
        receiver: { name: ORG_SELF.name, userId: ORG_SELF.userId, partyType: 'ORG', role: 'RECEIVER' },
      },
      attachments: [{ id: 'att-2', fileName: 'contract-notice.pdf' }],
      assigneeUserId: 'user-sara',
      assigneeName: 'سارا موسوی',
      threadId: 'thread-002',
      referenceId: 'K-۴۴۲',
      companyId: 2,
      tags: ['قرارداد', 'فوری'],
    },
    {
      id: 'rec-out-001',
      direction: RECORD_DIRECTION.OUTGOING,
      type: RECORD_TYPE.OFFICIAL,
      status: RECORD_STATUS.DRAFT,
      number: null,
      recordDate: today,
      subject: 'پاسخ به استعلام قیمت',
      body: 'پیش‌نویس پاسخ استعلام — در انتظار تکمیل.',
      participants: {
        sender: { name: ORG_SELF.name, userId: ORG_SELF.userId, partyType: 'ORG', role: 'SENDER' },
        receiver: {
          name: 'فولاد پارس',
          companyId: 1,
          companyName: 'فولاد پارس',
          position: 'صنایع فولادی',
          mobile: null,
          partyType: 'CONTACT',
          partyId: '1',
          role: 'RECEIVER',
        },
      },
      attachments: [],
      threadId: 'thread-001',
      referenceId: 'EXT-۸۸۱',
      companyId: 1,
      tags: ['پاسخ'],
    },
    {
      id: 'rec-out-002',
      direction: RECORD_DIRECTION.OUTGOING,
      type: RECORD_TYPE.OFFICIAL,
      status: RECORD_STATUS.ISSUED,
      number: '۴۰۴/OUT/۰۰۱',
      registryNumber: '۴۰۴/OUT/۰۰۱',
      recordDate: today,
      subject: 'نامه رسمی همکاری',
      body: 'نامه ارسال‌شده جهت همکاری مشترک.',
      participants: {
        sender: { name: ORG_SELF.name, userId: ORG_SELF.userId, partyType: 'ORG', role: 'SENDER' },
        receiver: {
          name: 'صنایع فلزی کرمان',
          companyId: 2,
          companyName: 'صنایع فلزی کرمان',
          position: 'صنایع فلزی',
          mobile: null,
          partyType: 'CONTACT',
          partyId: '2',
          role: 'RECEIVER',
        },
      },
      attachments: [{ id: 'att-3', fileName: 'letter-scan.pdf' }],
      threadId: 'thread-003',
      referenceId: 'JR-۵۰۱',
      companyId: 3,
      tags: ['رسمی'],
      issuedAt: new Date().toISOString(),
      issuedBy: ORG_SELF.name,
      isLocked: true,
    },
  ];

  return raw.map((item) => normalizeOfficialRecord(item, { requireId: true })).filter(Boolean);
}

function snapshot() {
  return records.map((item) => ({ ...item }));
}

function sortByDateDesc(a, b) {
  const left = String(a.receivedDate || a.recordDate || a.createdAt || '');
  const right = String(b.receivedDate || b.recordDate || b.createdAt || '');
  return right.localeCompare(left, 'fa');
}

function resolveDisplayParty(record) {
  if (!record) return '—';
  const party = record.direction === RECORD_DIRECTION.INCOMING
    ? record.participants?.sender
    : record.participants?.receiver;
  if (!party) return '—';
  if (party.companyName && party.name && party.companyName !== party.name) {
    return `${party.name} — ${party.companyName}`;
  }
  return party.name || party.companyName || '—';
}

/**
 * List row presentation model.
 * @param {object} record
 */
export function toListPresentationModel(record) {
  const attachments = Array.isArray(record.attachments) ? record.attachments : [];
  const registryNumber = formatRegistryNumberFa(record.registryNumber || record.number || '') || null;
  return {
    id: record.id,
    number: registryNumber,
    registryNumber,
    date: record.direction === RECORD_DIRECTION.INCOMING
      ? (record.receivedDate || record.recordDate)
      : record.recordDate,
    displayParty: resolveDisplayParty(record),
    subject: record.subject,
    displayType: TYPE_LABELS[record.type] || record.type,
    displayStatus: STATUS_LABELS[record.status] || record.status,
    hasAttachments: attachments.length > 0,
    direction: record.direction,
    status: record.status,
    companyId: record.companyId,
    isLocked: Boolean(record.isLocked),
  };
}

/**
 * Detail / drawer presentation model.
 * @param {object} record
 * @param {{ thread?: Array<object> }} [options]
 */
export function toDetailPresentationModel(record, options = {}) {
  const attachments = Array.isArray(record.attachments) ? record.attachments : [];
  const thread = Array.isArray(options.thread) ? options.thread : [];

  return {
    ...toListPresentationModel(record),
    body: record.body,
    recordDate: record.recordDate,
    receivedDate: record.receivedDate,
    attentionName: record.attentionName || null,
    assigneeUserId: record.assigneeUserId || null,
    assigneeName: record.assigneeName || null,
    participants: {
      sender: record.participants?.sender || { name: null },
      receiver: record.participants?.receiver || { name: null },
    },
    attachments,
    threadId: record.threadId,
    referenceId: record.referenceId,
    companyId: record.companyId,
    tags: record.tags || [],
    issuedAt: record.issuedAt,
    issuedBy: record.issuedBy,
    issuerTitle: record.issuerTitle || null,
    threadPreview: thread.map((item) => ({
      id: item.id,
      number: item.registryNumber || item.number,
      subject: item.subject,
      displayStatus: STATUS_LABELS[item.status] || item.status,
      direction: item.direction,
    })),
    canReply: record.direction === RECORD_DIRECTION.INCOMING
      && record.status !== RECORD_STATUS.ARCHIVED,
    canIssue: !record.isLocked
      && record.direction === RECORD_DIRECTION.OUTGOING,
    canPrint: Boolean(record.isLocked || record.registryNumber || record.number),
  };
}

export function repositoryFindAll() {
  return snapshot().sort(sortByDateDesc);
}

export function repositoryFindById(id) {
  if (id == null || id === '') return null;
  return snapshot().find((item) => String(item.id) === String(id)) || null;
}

export function repositoryFindByThreadId(threadId) {
  if (!threadId) return [];
  return snapshot()
    .filter((item) => String(item.threadId) === String(threadId))
    .sort(sortByDateDesc);
}

export function repositoryFindByCompanyId(companyId) {
  if (companyId == null || companyId === '') return [];
  return snapshot()
    .filter((item) => String(item.companyId) === String(companyId))
    .sort(sortByDateDesc);
}

export function repositorySave(record) {
  const existing = record?.id != null
    ? records.find((item) => String(item.id) === String(record.id))
    : null;
  if (existing?.isLocked) {
    // Locked letters are immutable except through issue path (already locked).
    return repositoryFindById(existing.id);
  }

  const next = normalizeOfficialRecord(record, { requireId: true });
  if (!next?.id) return null;

  // Incoming letters receive registry number on first real persist (۴۰۵/IN/۱۲۵).
  // Skip placeholder drafts created by createDraftRecord.
  const isPlaceholderSubject = !next.subject
    || next.subject === 'پیش‌نویس جدید'
    || next.subject === 'بدون موضوع';
  if (
    next.direction === RECORD_DIRECTION.INCOMING
    && !next.registryNumber
    && !next.number
    && !isPlaceholderSubject
  ) {
    const dateKey = next.receivedDate || next.recordDate || getTodayJalali() || '';
    const registryNumber = buildRegistryNumber(RECORD_DIRECTION.INCOMING, dateKey, records);
    next.number = registryNumber;
    next.registryNumber = registryNumber;
  }

  const index = records.findIndex((item) => String(item.id) === String(next.id));
  if (index === -1) {
    records = [next, ...records];
  } else {
    const merged = { ...records[index], ...next, updatedAt: new Date().toISOString() };
    records = records.slice();
    records[index] = merged;
  }
  return repositoryFindById(next.id);
}

/**
 * Issue an outgoing letter: assign registry number (۴۰۵/OUT/۱۲۵) and lock.
 * @param {string|number} id
 * @param {{ issuedBy?: string, issuedAt?: string, recordDate?: string }} [meta]
 */
export function repositoryIssueRecord(id, meta = {}) {
  const existing = repositoryFindById(id);
  if (!existing) return null;
  if (existing.direction !== RECORD_DIRECTION.OUTGOING) return null;
  if (existing.isLocked) return existing;

  const jalaliToday = getTodayJalali() || existing.recordDate || '';
  const dateKey = meta.recordDate || existing.recordDate || jalaliToday;
  const registryNumber = buildRegistryNumber(RECORD_DIRECTION.OUTGOING, dateKey, records);

  const issued = {
    ...existing,
    status: RECORD_STATUS.ISSUED,
    number: registryNumber,
    registryNumber,
    recordDate: dateKey,
    issuedAt: meta.issuedAt || new Date().toISOString(),
    issuedBy: meta.issuedBy || ORG_SELF.name,
    issuerTitle: meta.issuerTitle || existing.issuerTitle || null,
    isLocked: true,
    updatedAt: new Date().toISOString(),
  };

  const index = records.findIndex((item) => String(item.id) === String(id));
  if (index === -1) return null;
  records = records.slice();
  records[index] = issued;
  return repositoryFindById(id);
}

export function repositoryCreateDraft(payload = {}) {
  const direction = payload.direction || RECORD_DIRECTION.OUTGOING;
  const today = getTodayJalali() || null;
  const record = normalizeOfficialRecord({
    ...payload,
    id: undefined,
    direction,
    type: RECORD_TYPE.OFFICIAL,
    status: payload.status || defaultStatusForDirection(direction),
    subject: payload.subject || 'پیش‌نویس جدید',
    recordDate: payload.recordDate || today,
    receivedDate: direction === RECORD_DIRECTION.INCOMING
      ? (payload.receivedDate || today)
      : payload.receivedDate,
    attentionName: payload.attentionName || null,
    body: payload.body || null,
    assigneeUserId: payload.assigneeUserId || null,
    assigneeName: payload.assigneeName || null,
    attachments: payload.attachments || [],
    participants: payload.participants || {
      sender: direction === RECORD_DIRECTION.INCOMING
        ? { name: null, partyType: 'CONTACT', role: 'SENDER' }
        : { name: ORG_SELF.name, userId: ORG_SELF.userId, partyType: 'ORG', role: 'SENDER' },
      receiver: direction === RECORD_DIRECTION.OUTGOING
        ? { name: null, partyType: 'CONTACT', role: 'RECEIVER' }
        : { name: ORG_SELF.name, userId: ORG_SELF.userId, partyType: 'ORG', role: 'RECEIVER' },
    },
  });
  if (!record) return null;
  return repositorySave(record);
}

export function repositoryCreateReply(sourceId) {
  const source = repositoryFindById(sourceId);
  if (!source || source.direction !== RECORD_DIRECTION.INCOMING) return null;

  const reply = normalizeOfficialRecord({
    direction: RECORD_DIRECTION.OUTGOING,
    type: RECORD_TYPE.OFFICIAL,
    status: RECORD_STATUS.DRAFT,
    subject: `پاسخ: ${source.subject}`,
    body: '',
    recordDate: getTodayJalali() || source.recordDate,
    participants: {
      sender: { name: ORG_SELF.name, userId: ORG_SELF.userId, partyType: 'ORG', role: 'SENDER' },
      receiver: {
        ...source.participants.sender,
        role: 'RECEIVER',
        partyType: source.participants.sender?.partyType || 'CONTACT',
      },
    },
    threadId: source.threadId,
    referenceId: source.referenceId || source.number,
    companyId: source.companyId,
    tags: ['پاسخ'],
  });
  if (!reply) return null;
  return repositorySave(reply);
}

/** Test-only reset. */
export function repositoryReplaceAll(nextRecords = []) {
  records = Array.isArray(nextRecords)
    ? nextRecords.map((item) => normalizeOfficialRecord(item, { requireId: true })).filter(Boolean)
    : [];
}

export function repositoryResetToSeed() {
  records = seedRecords();
}
