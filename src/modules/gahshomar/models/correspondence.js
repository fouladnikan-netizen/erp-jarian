/**
 * Gahshomar Correspondence domain model (DDL-12).
 * Official secretariat letters + internal memos — never soft CRM activities.
 */

export const CORRESPONDENCE_DIRECTION = Object.freeze({
  INCOMING: 'INCOMING',
  OUTGOING: 'OUTGOING',
});

export const CORRESPONDENCE_TYPE = Object.freeze({
  OFFICIAL: 'OFFICIAL',
  INTERNAL: 'INTERNAL',
});

export const CORRESPONDENCE_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  REGISTERED: 'REGISTERED',
  ACTION_NEEDED: 'ACTION_NEEDED',
  SENT: 'SENT',
  ARCHIVED: 'ARCHIVED',
});

export const CORRESPONDENCE_PRIORITY = Object.freeze({
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
});

export const DIRECTION_LABELS = Object.freeze({
  INCOMING: 'دریافت کردیم',
  OUTGOING: 'ارسال کردیم',
});

export const TYPE_LABELS = Object.freeze({
  OFFICIAL: 'رسمی',
  INTERNAL: 'داخلی',
});

export const STATUS_LABELS = Object.freeze({
  DRAFT: 'پیش‌نویس',
  REGISTERED: 'ثبت‌شده',
  ACTION_NEEDED: 'منتظر اقدام',
  SENT: 'ارسال‌شده',
  ARCHIVED: 'بایگانی',
});

export const PRIORITY_LABELS = Object.freeze({
  LOW: 'کم',
  NORMAL: 'عادی',
  HIGH: 'بالا',
  URGENT: 'فوری',
});

/** Demo actor until Auth SSOT wires into secretariat */
export const DEMO_CURRENT_USER_ID = 'emp-a';

export const DEMO_USERS = Object.freeze([
  { id: 'emp-a', name: 'کاربر الف' },
  { id: 'emp-b', name: 'کاربر ب' },
  { id: 'emp-c', name: 'کاربر ج' },
]);

const DIRECTION_SET = new Set(Object.values(CORRESPONDENCE_DIRECTION));
const TYPE_SET = new Set(Object.values(CORRESPONDENCE_TYPE));
const STATUS_SET = new Set(Object.values(CORRESPONDENCE_STATUS));
const PRIORITY_SET = new Set(Object.values(CORRESPONDENCE_PRIORITY));

function createLocalId() {
  return `corr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeDirection(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (DIRECTION_SET.has(raw)) return raw;
  if (raw === 'IN' || raw === 'INBOUND') return CORRESPONDENCE_DIRECTION.INCOMING;
  if (raw === 'OUT' || raw === 'OUTBOUND') return CORRESPONDENCE_DIRECTION.OUTGOING;
  return null;
}

export function normalizeType(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (TYPE_SET.has(raw)) return raw;
  return CORRESPONDENCE_TYPE.OFFICIAL;
}

export function normalizeStatus(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (STATUS_SET.has(raw)) return raw;
  return CORRESPONDENCE_STATUS.DRAFT;
}

export function normalizePriority(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (PRIORITY_SET.has(raw)) return raw;
  return CORRESPONDENCE_PRIORITY.NORMAL;
}

export function normalizeAttachments(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const fileName = String(item.fileName || item.name || '').trim();
      if (!fileName) return null;
      return {
        id: item.id != null ? String(item.id) : `att-${index}`,
        fileName,
        mimeType: item.mimeType ? String(item.mimeType) : undefined,
        size: typeof item.size === 'number' ? item.size : null,
      };
    })
    .filter(Boolean);
}

function normalizeReceiverUserIds(value) {
  if (Array.isArray(value)) {
    return value.map((id) => String(id)).filter(Boolean);
  }
  if (value != null && value !== '') return [String(value)];
  return [];
}

/**
 * Normalize / create a Correspondence entity snapshot.
 * companyId is optional (relations section) — subject + direction required.
 */
export function normalizeCorrespondence(input = {}, options = {}) {
  const direction = normalizeDirection(input.direction);
  if (!direction) return null;

  const subject = String(input.subject || '').trim();
  if (!subject) return null;

  const type = normalizeType(input.type);
  const relatedEntity = input.relatedEntity && typeof input.relatedEntity === 'object'
    ? {
      type: input.relatedEntity.type != null ? String(input.relatedEntity.type) : null,
      id: input.relatedEntity.id != null ? input.relatedEntity.id : null,
      name: input.relatedEntity.name != null ? String(input.relatedEntity.name) : null,
    }
    : null;

  const senderUserId = input.senderUserId != null && input.senderUserId !== ''
    ? String(input.senderUserId)
    : null;
  const receiverUserIds = normalizeReceiverUserIds(input.receiverUserIds);

  const senderName = String(
    input.senderName
    || input.sender
    || DEMO_USERS.find((u) => u.id === senderUserId)?.name
    || '',
  ).trim() || null;

  const receiverName = String(
    input.receiverName
    || input.receiver
    || receiverUserIds
      .map((id) => DEMO_USERS.find((u) => u.id === id)?.name)
      .filter(Boolean)
      .join('، ')
    || '',
  ).trim() || null;

  const counterpartyName = String(
    input.counterpartyName
    || (direction === CORRESPONDENCE_DIRECTION.INCOMING ? senderName : receiverName)
    || relatedEntity?.name
    || '',
  ).trim() || null;

  const companyId = input.companyId != null && input.companyId !== ''
    ? input.companyId
    : null;

  return {
    id: input.id != null && input.id !== '' ? String(input.id) : (options.requireId ? null : createLocalId()),
    direction,
    type,
    status: normalizeStatus(input.status),
    subject,
    category: String(input.category || '').trim() || null,
    priority: normalizePriority(input.priority),
    letterNumber: String(input.letterNumber || input.indicatorNumber || '').trim() || null,
    externalNumber: String(input.externalNumber || '').trim() || null,
    letterDate: String(input.letterDate || input.date || '').trim() || null,
    receivedDate: String(input.receivedDate || input.letterDate || input.date || '').trim() || null,
    body: String(input.body || '').trim() || null,
    senderUserId,
    receiverUserIds,
    senderName,
    receiverName,
    companyId,
    contactPersonId: input.contactPersonId != null && input.contactPersonId !== ''
      ? input.contactPersonId
      : null,
    relatedEntity,
    relatedOrderCode: input.relatedOrderCode != null && input.relatedOrderCode !== ''
      ? String(input.relatedOrderCode)
      : (relatedEntity?.type === 'order' ? relatedEntity.id : null),
    counterpartyName,
    attachments: normalizeAttachments(input.attachments),
    statusHistory: Array.isArray(input.statusHistory) ? input.statusHistory : [],
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
}

/**
 * Whether a record belongs on the Incoming primary tab.
 * Internal memos appear for receivers without duplicating the entity.
 */
export function isIncomingViewRecord(record, viewerUserId = DEMO_CURRENT_USER_ID) {
  if (!record) return false;
  if (record.type === CORRESPONDENCE_TYPE.INTERNAL) {
    // Org-wide secretariat: internal memo appears in Incoming without duplicating storage.
    if (viewerUserId == null) return true;
    return (record.receiverUserIds || []).map(String).includes(String(viewerUserId));
  }
  return record.direction === CORRESPONDENCE_DIRECTION.INCOMING;
}

export function isOutgoingViewRecord(record, viewerUserId = DEMO_CURRENT_USER_ID) {
  if (!record) return false;
  if (record.type === CORRESPONDENCE_TYPE.INTERNAL) {
    if (viewerUserId == null) return true;
    return String(record.senderUserId) === String(viewerUserId);
  }
  return record.direction === CORRESPONDENCE_DIRECTION.OUTGOING;
}
