/**
 * Map API Correspondence (DDL-23) ↔ Gahshomar officialRecord raw-record shape
 * (`src/modules/gahshomar/models/officialRecord.js`). Keeping the mapping
 * here — rather than teaching the model file about HTTP field names — is
 * what lets `normalizeOfficialRecord` / `toListPresentationModel` /
 * `toDetailPresentationModel` stay identical for mock and API modes.
 */
import { RECORD_STATUS } from '../../modules/gahshomar/models/officialRecord';

/** Backend DRAFT/FINAL → legacy FE status vocabulary (badges/KPI unchanged). */
function statusFromApi(direction, backendStatus) {
  if (direction === 'INCOMING') {
    // Legacy mock semantics: an incoming letter is "RECEIVED" the moment it
    // exists — DRAFT/FINAL still governs edit/finalize eligibility via isLocked.
    return RECORD_STATUS.RECEIVED;
  }
  return backendStatus === 'FINAL' ? RECORD_STATUS.ISSUED : RECORD_STATUS.DRAFT;
}

export function correspondenceFromApi(api) {
  if (!api) return null;
  const isFinal = api.status === 'FINAL';
  return {
    id: api.id,
    direction: api.direction,
    type: api.typeKey || 'OFFICIAL',
    status: statusFromApi(api.direction, api.status),
    backendStatus: api.status,
    number: api.officialNumber || null,
    registryNumber: api.officialNumber || null,
    recordDate: api.recordDate || null,
    receivedDate: api.receivedDate || null,
    subject: api.subject,
    body: isFinal
      ? (api.finalBody || api.aiRewrittenBody || api.rawBody || '')
      : (api.aiRewrittenBody || api.rawBody || ''),
    rawBody: api.rawBody ?? null,
    aiRewrittenBody: api.aiRewrittenBody ?? null,
    finalBody: api.finalBody ?? null,
    attentionName: api.attentionName || null,
    participants: {
      sender: api.senderParty || {},
      receiver: api.receiverParty || {},
    },
    attachments: Array.isArray(api.attachments) ? api.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType || undefined,
      sizeBytes: a.sizeBytes,
    })) : [],
    assigneeUserId: api.assigneeUserId || null,
    assigneeName: api.assigneeName || null,
    threadId: api.threadId || api.id,
    referenceId: api.referenceId || null,
    companyId: api.companyId || null,
    orderId: api.orderId || null,
    tags: Array.isArray(api.tags) ? api.tags : [],
    issuedAt: api.issuedAt || null,
    issuedBy: api.issuedBy || null,
    issuerTitle: api.issuerTitle || null,
    isLocked: isFinal,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

/** FE draft payload (facade `saveOfficialRecord`/create input) → API create/update body. */
export function correspondenceToApi(input = {}) {
  const body = {};
  if (input.direction !== undefined) body.direction = input.direction;
  if (input.type !== undefined) body.typeKey = input.type;
  if (input.subject !== undefined) body.subject = input.subject;
  // DDL-23c: once AI has produced a draft, further human edits land in
  // aiRewrittenBody (the "current working draft"), never back into rawBody —
  // that field must stay frozen as the original for the critical-value check.
  if (input.body !== undefined) {
    if (input.hasAiDraft) body.aiRewrittenBody = input.body;
    else body.rawBody = input.body;
  }
  if (input.recordDate !== undefined) body.recordDate = input.recordDate;
  if (input.receivedDate !== undefined) body.receivedDate = input.receivedDate;
  if (input.attentionName !== undefined) body.attentionName = input.attentionName;
  if (input.participants?.sender !== undefined) body.senderParty = input.participants.sender;
  if (input.participants?.receiver !== undefined) body.receiverParty = input.participants.receiver;
  if (input.companyId !== undefined) body.companyId = input.companyId != null ? String(input.companyId) : null;
  if (input.orderId !== undefined) body.orderId = input.orderId != null ? String(input.orderId) : null;
  if (input.referenceId !== undefined) body.referenceId = input.referenceId;
  if (input.assigneeUserId !== undefined) body.assigneeUserId = input.assigneeUserId;
  if (input.assigneeName !== undefined) body.assigneeName = input.assigneeName;
  if (input.tags !== undefined) body.tags = input.tags;
  return body;
}

export function attachmentFromApi(api) {
  if (!api) return null;
  return {
    id: api.id,
    fileName: api.fileName,
    mimeType: api.mimeType || undefined,
    sizeBytes: api.sizeBytes,
    dataUrl: api.dataBase64 ? `data:${api.mimeType || 'application/octet-stream'};base64,${api.dataBase64}` : undefined,
  };
}

export default { correspondenceFromApi, correspondenceToApi, attachmentFromApi };
