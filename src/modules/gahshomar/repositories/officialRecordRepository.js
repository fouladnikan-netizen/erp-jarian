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
      number: '۱۴۰۴/۱۲۳',
      receivedDate: '1404/01/18',
      recordDate: '1404/01/18',
      subject: 'درخواست استعلام قیمت ورق',
      body: 'با سلام، خواهشمند است قیمت ورق ST37 را اعلام فرمایید.',
      participants: {
        sender: { name: 'صنایع فولاد پارس', companyId: 1 },
        receiver: { name: ORG_SELF.name, userId: ORG_SELF.userId },
      },
      attachments: [{ id: 'att-1', fileName: 'estelam.pdf' }],
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
      number: '۱۴۰۴/۱۲۸',
      receivedDate: '1404/01/16',
      recordDate: '1404/01/16',
      subject: 'اعلامیه قرارداد سالانه',
      body: 'پیوست قرارداد سال ۱۴۰۴ جهت بررسی و امضا.',
      participants: {
        sender: { name: 'صنایع فلزی کرمان', companyId: 2 },
        receiver: { name: ORG_SELF.name, userId: ORG_SELF.userId },
      },
      attachments: [{ id: 'att-2', fileName: 'contract-notice.pdf' }],
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
        sender: { name: ORG_SELF.name, userId: ORG_SELF.userId },
        receiver: { name: 'صنایع فولاد پارس', companyId: 1 },
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
      number: '۱۴۰۴/۵۰۱',
      recordDate: today,
      subject: 'نامه رسمی همکاری',
      body: 'نامه صادره جهت همکاری مشترک.',
      participants: {
        sender: { name: ORG_SELF.name, userId: ORG_SELF.userId },
        receiver: { name: 'شرکت ماشین‌سازی تبریز', companyId: 3 },
      },
      attachments: [{ id: 'att-3', fileName: 'letter-scan.pdf' }],
      threadId: 'thread-003',
      referenceId: 'JR-۵۰۱',
      companyId: 3,
      tags: ['رسمی'],
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
  if (record.direction === RECORD_DIRECTION.INCOMING) {
    return record.participants?.sender?.name || '—';
  }
  return record.participants?.receiver?.name || '—';
}

/**
 * List row presentation model.
 * @param {object} record
 */
export function toListPresentationModel(record) {
  const attachments = Array.isArray(record.attachments) ? record.attachments : [];
  return {
    id: record.id,
    number: record.number,
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
    participants: {
      sender: record.participants?.sender || { name: null },
      receiver: record.participants?.receiver || { name: null },
    },
    attachments,
    threadId: record.threadId,
    referenceId: record.referenceId,
    companyId: record.companyId,
    tags: record.tags || [],
    threadPreview: thread.map((item) => ({
      id: item.id,
      number: item.number,
      subject: item.subject,
      displayStatus: STATUS_LABELS[item.status] || item.status,
      direction: item.direction,
    })),
    canReply: record.direction === RECORD_DIRECTION.INCOMING
      && record.status !== RECORD_STATUS.ARCHIVED,
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
  const next = normalizeOfficialRecord(record, { requireId: true });
  if (!next?.id) return null;

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

export function repositoryCreateDraft(payload = {}) {
  const direction = payload.direction || RECORD_DIRECTION.OUTGOING;
  const record = normalizeOfficialRecord({
    ...payload,
    id: undefined,
    direction,
    type: RECORD_TYPE.OFFICIAL,
    status: payload.status || defaultStatusForDirection(direction),
    subject: payload.subject || 'پیش‌نویس جدید',
    participants: payload.participants || {
      sender: direction === RECORD_DIRECTION.INCOMING
        ? { name: null }
        : { name: ORG_SELF.name, userId: ORG_SELF.userId },
      receiver: direction === RECORD_DIRECTION.OUTGOING
        ? { name: null }
        : { name: ORG_SELF.name, userId: ORG_SELF.userId },
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
      sender: { name: ORG_SELF.name, userId: ORG_SELF.userId },
      receiver: { ...source.participants.sender },
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
