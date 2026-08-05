/**
 * Gahshomar Official Record domain model (MVP).
 * UI consumes presentation models from the facade — never raw enums directly.
 */

export const RECORD_DIRECTION = Object.freeze({
  INCOMING: 'INCOMING',
  OUTGOING: 'OUTGOING',
  INTERNAL: 'INTERNAL',
});

export const RECORD_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  RECEIVED: 'RECEIVED',
  ARCHIVED: 'ARCHIVED',
});

export const RECORD_TYPE = Object.freeze({
  OFFICIAL: 'OFFICIAL',
});

/** Explicit drawer state machine — no scattered booleans. */
export const DRAWER_MODE = Object.freeze({
  VIEW: 'VIEW',
  CREATE: 'CREATE',
  EDIT: 'EDIT',
});

export const STATUS_LABELS = Object.freeze({
  DRAFT: 'پیش‌نویس',
  ISSUED: 'صادر شده',
  RECEIVED: 'دریافت شده',
  ARCHIVED: 'بایگانی',
});

export const TYPE_LABELS = Object.freeze({
  OFFICIAL: 'رسمی',
});

export const DIRECTION_LABELS = Object.freeze({
  INCOMING: 'دریافتی',
  OUTGOING: 'ارسالی',
  INTERNAL: 'داخلی',
});

/** Demo org identity until Auth SSOT. */
export const ORG_SELF = Object.freeze({
  name: 'پترو فولاد نیکان',
  userId: 'org-self',
});

const DIRECTION_SET = new Set(Object.values(RECORD_DIRECTION));
const STATUS_SET = new Set(Object.values(RECORD_STATUS));
const TYPE_SET = new Set(Object.values(RECORD_TYPE));

function createLocalId() {
  return `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeDirection(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (DIRECTION_SET.has(raw)) return raw;
  if (raw === 'IN' || raw === 'INBOUND' || raw === 'INCOMING') return RECORD_DIRECTION.INCOMING;
  if (raw === 'OUT' || raw === 'OUTBOUND' || raw === 'OUTGOING') return RECORD_DIRECTION.OUTGOING;
  if (raw === 'INT' || raw === 'INTERNAL') return RECORD_DIRECTION.INTERNAL;
  return null;
}

export function normalizeStatus(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (STATUS_SET.has(raw)) return raw;
  return RECORD_STATUS.DRAFT;
}

export function normalizeType(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (TYPE_SET.has(raw)) return raw;
  return RECORD_TYPE.OFFICIAL;
}

export const PARTY_TYPE = Object.freeze({
  CONTACT: 'CONTACT',
  ORG: 'ORG',
});

export const PARTICIPANT_ROLE = Object.freeze({
  SENDER: 'SENDER',
  RECEIVER: 'RECEIVER',
});

/**
 * Normalize RecordParticipant — CONTACT receivers must carry partyId.
 * @param {object} input
 * @param {'SENDER'|'RECEIVER'} [fallbackRole]
 */
export function normalizeParticipant(input = {}, fallbackRole = null) {
  if (!input || typeof input !== 'object') {
    return {
      partyType: null,
      role: fallbackRole,
      partyId: null,
      name: null,
      userId: null,
      companyId: null,
      companyName: null,
      position: null,
      mobile: null,
    };
  }

  const partyType = String(input.partyType || '').trim().toUpperCase() || null;
  const role = String(input.role || fallbackRole || '').trim().toUpperCase() || fallbackRole;
  const partyId = input.partyId != null && input.partyId !== ''
    ? String(input.partyId)
    : null;

  return {
    partyType: partyType === PARTY_TYPE.CONTACT || partyType === PARTY_TYPE.ORG
      ? partyType
      : (partyId ? PARTY_TYPE.CONTACT : null),
    role: role === PARTICIPANT_ROLE.SENDER || role === PARTICIPANT_ROLE.RECEIVER
      ? role
      : fallbackRole,
    partyId,
    name: String(input.name || input.fullName || '').trim() || null,
    userId: input.userId != null && input.userId !== '' ? String(input.userId) : null,
    companyId: input.companyId != null && input.companyId !== '' ? input.companyId : null,
    companyName: String(input.companyName || '').trim() || null,
    position: String(input.position || input.jobPosition || '').trim() || null,
    mobile: String(input.mobile || '').trim() || null,
  };
}

function normalizeAttachments(list) {
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
        dataUrl: item.dataUrl ? String(item.dataUrl) : undefined,
        size: Number.isFinite(Number(item.size)) ? Number(item.size) : undefined,
      };
    })
    .filter(Boolean);
}

function normalizeAssignee(input = {}) {
  const userId = input.assigneeUserId != null && input.assigneeUserId !== ''
    ? String(input.assigneeUserId)
    : (input.assignee?.userId != null && input.assignee?.userId !== ''
      ? String(input.assignee.userId)
      : null);
  const name = String(
    input.assigneeName
    || input.assignee?.name
    || '',
  ).trim() || null;
  if (!userId && !name) {
    return { assigneeUserId: null, assigneeName: null };
  }
  return { assigneeUserId: userId, assigneeName: name };
}

/**
 * Normalize a raw OfficialRecord entity.
 * @param {object} input
 * @param {{ requireId?: boolean }} [options]
 */
export function normalizeOfficialRecord(input = {}, options = {}) {
  const direction = normalizeDirection(input.direction);
  if (!direction) return null;

  const subject = String(input.subject || '').trim();
  if (!subject && options.requireId) return null;
  if (!subject && !options.requireId && !input.id) return null;

  const participants = {
    sender: normalizeParticipant(
      input.participants?.sender || input.sender,
      PARTICIPANT_ROLE.SENDER,
    ),
    receiver: normalizeParticipant(
      input.participants?.receiver || input.receiver,
      PARTICIPANT_ROLE.RECEIVER,
    ),
  };

  if (!participants.sender.name && input.senderName) {
    participants.sender.name = String(input.senderName).trim();
  }
  if (!participants.receiver.name && input.receiverName) {
    participants.receiver.name = String(input.receiverName).trim();
  }

  const attachments = normalizeAttachments(input.attachments);
  const { assigneeUserId, assigneeName } = normalizeAssignee(input);
  const threadId = input.threadId != null && input.threadId !== ''
    ? String(input.threadId)
    : (input.id ? String(input.id) : createLocalId());

  return {
    id: input.id != null && input.id !== '' ? String(input.id) : (options.requireId ? null : createLocalId()),
    direction,
    type: normalizeType(input.type),
    status: normalizeStatus(input.status),
    number: String(input.number || input.letterNumber || input.registryNumber || '').trim() || null,
    registryNumber: String(input.registryNumber || input.number || input.letterNumber || '').trim() || null,
    recordDate: String(input.recordDate || input.letterDate || '').trim() || null,
    receivedDate: String(input.receivedDate || input.recordDate || input.letterDate || '').trim() || null,
    subject: subject || 'بدون موضوع',
    body: String(input.body || '').trim() || null,
    /** Free-text attention / signer person on the letter (not a Kanoon contact person). */
    attentionName: String(input.attentionName || input.personName || input.signerName || '').trim() || null,
    participants,
    attachments,
    assigneeUserId,
    assigneeName,
    threadId,
    referenceId: input.referenceId != null && input.referenceId !== ''
      ? String(input.referenceId)
      : null,
    companyId: input.companyId != null && input.companyId !== '' ? input.companyId : null,
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
    issuedAt: input.issuedAt || null,
    issuedBy: input.issuedBy != null && input.issuedBy !== '' ? String(input.issuedBy) : null,
    issuerTitle: input.issuerTitle != null && input.issuerTitle !== ''
      ? String(input.issuerTitle).trim()
      : null,
    isLocked: Boolean(input.isLocked),
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
}

export function defaultStatusForDirection(direction) {
  return direction === RECORD_DIRECTION.INCOMING
    ? RECORD_STATUS.RECEIVED
    : RECORD_STATUS.DRAFT;
}
