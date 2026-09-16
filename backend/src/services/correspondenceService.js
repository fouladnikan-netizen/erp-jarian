/**
 * Correspondence use-cases (DDL-23) — Gahshomar aggregate.
 * Zod, subject/reference integrity, draft/final lifecycle, server-side
 * numbering, attachment enforcement, AI rewrite + critical-value safety net.
 * SQL only via correspondenceRepository.
 */
import { z } from 'zod';
import { withTransaction } from '../db/pool.js';
import { appError, fromZodError } from '../lib/errors.js';
import { newEntityId, writeAudit } from '../lib/ids.js';
import * as correspondenceRepo from '../repositories/correspondenceRepository.js';
import * as companyRepo from '../repositories/companyRepository.js';
import * as orderRepo from '../repositories/orderRepository.js';
import * as correspondenceTypeService from './correspondenceTypeService.js';
import * as organizationIdentityRepo from '../repositories/organizationIdentityRepository.js';
import { rewriteCorrespondenceText } from './correspondenceAiService.js';
import { checkCriticalValuePreservation } from '../domain/correspondence/criticalValuePreservation.js';
import { registryDirectionCode, toRegistryYearShort, formatOfficialNumber } from '../domain/correspondence/registryNumber.js';

export const DIRECTIONS = Object.freeze({
  INCOMING: 'INCOMING',
  OUTGOING: 'OUTGOING',
  INTERNAL: 'INTERNAL',
});

const directionSchema = z.enum(['INCOMING', 'OUTGOING', 'INTERNAL']);

const partySchema = z.record(z.string(), z.any()).optional();

const createSchema = z.object({
  direction: directionSchema,
  typeKey: z.string().trim().min(1).optional().default('OFFICIAL'),
  subject: z.string().trim().min(1),
  rawBody: z.string().optional().nullable(),
  recordDate: z.string().trim().optional().nullable(),
  receivedDate: z.string().trim().optional().nullable(),
  attentionName: z.string().trim().optional().nullable(),
  senderParty: partySchema,
  receiverParty: partySchema,
  companyId: z.union([z.string(), z.number()]).transform((v) => String(v)).optional().nullable(),
  orderId: z.union([z.string(), z.number()]).transform((v) => String(v)).optional().nullable(),
  threadId: z.string().trim().optional().nullable(),
  referenceId: z.string().trim().optional().nullable(),
  assigneeUserId: z.string().trim().optional().nullable(),
  assigneeName: z.string().trim().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

const updateSchema = z.object({
  typeKey: z.string().trim().min(1).optional(),
  subject: z.string().trim().min(1).optional(),
  rawBody: z.string().optional().nullable(),
  // Editable only once AI rewrite has produced a draft (product rule 10):
  // further human edits to the AI-suggested text land here, never back into
  // rawBody, so the original stays audit-stable.
  aiRewrittenBody: z.string().optional().nullable(),
  recordDate: z.string().trim().optional().nullable(),
  receivedDate: z.string().trim().optional().nullable(),
  attentionName: z.string().trim().optional().nullable(),
  senderParty: partySchema,
  receiverParty: partySchema,
  companyId: z.union([z.string(), z.number()]).transform((v) => String(v)).optional().nullable(),
  orderId: z.union([z.string(), z.number()]).transform((v) => String(v)).optional().nullable(),
  assigneeUserId: z.string().trim().optional().nullable(),
  assigneeName: z.string().trim().optional().nullable(),
  tags: z.array(z.string()).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'empty patch' });

const finalizeSchema = z.object({
  finalBody: z.string().trim().optional().nullable(),
  issuedBy: z.string().trim().optional().nullable(),
  issuerTitle: z.string().trim().optional().nullable(),
});

const aiRewriteSchema = z.object({
  text: z.string().trim().optional(),
});

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15MB — base64-in-Postgres, keep conservative.

function letterOrganizationSnapshotFromIdentity(identity) {
  if (!identity) return null;
  const tradeName = String(identity.tradeName || '').trim();
  const phone = String(identity.phone || '').trim();
  if (!tradeName && !phone) return null;
  return { tradeName, phone };
}

const attachmentSchema = z.object({
  fileName: z.string().trim().min(1),
  mimeType: z.string().trim().optional().nullable(),
  dataBase64: z.string().min(1),
});

/**
 * Application-level reference integrity (mirrors activityService's
 * assertSubjectReference posture — no polymorphic FK, no DB FK per the
 * entity card's migrationSafety note). Optional fields: only validated
 * when provided.
 */
async function assertOptionalReferences({ companyId, orderId }) {
  if (companyId) {
    const company = await companyRepo.findById(companyId);
    if (!company) {
      throw appError('INVALID_ENTITY_REFERENCE', 'مرجع شرکت نامعتبر یا آرشیو شده است.', 400, { companyId });
    }
  }
  if (orderId) {
    const order = await orderRepo.findByIdOrCode(orderId);
    if (!order) {
      throw appError('INVALID_ENTITY_REFERENCE', 'مرجع سفارش نامعتبر یا آرشیو شده است.', 400, { orderId });
    }
  }
}

async function attachAttachmentMeta(record) {
  const attachments = await correspondenceRepo.listAttachments(record.id, { withData: false });
  return { ...record, attachments };
}

export async function listCorrespondence(filters = {}) {
  if (filters.direction && !directionSchema.safeParse(filters.direction).success) {
    throw appError('INVALID_ENTITY_REFERENCE', 'جهت مکاتبه نامعتبر است.', 400);
  }
  return correspondenceRepo.list(filters);
}

export async function getCorrespondence(id) {
  const row = await correspondenceRepo.findById(id);
  if (!row) throw appError('CORRESPONDENCE_NOT_FOUND', 'مکاتبه یافت نشد.', 404);
  return attachAttachmentMeta(row);
}

export async function listCorrespondenceByCompany(companyId, opts = {}) {
  return correspondenceRepo.list({ ...opts, companyId });
}

export async function listCorrespondenceByOrder(orderId, opts = {}) {
  return correspondenceRepo.list({ ...opts, orderId });
}

export async function createCorrespondence(body, actorUserId) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های مکاتبه نامعتبر است.');
  const data = parsed.data;

  await correspondenceTypeService.assertActiveCorrespondenceType(data.typeKey);
  await assertOptionalReferences(data);

  const id = newEntityId('corr');

  const created = await withTransaction(async (client) => {
    const row = await correspondenceRepo.create({ ...data, id, actorUserId }, client);
    await writeAudit({
      actorUserId,
      action: 'correspondence.create',
      entityType: 'correspondence',
      entityId: id,
      detail: { correspondenceId: id, direction: data.direction, subject: data.subject, actorId: actorUserId },
    }, client);
    return row;
  });

  return attachAttachmentMeta(created);
}

export async function updateCorrespondence(id, body, actorUserId) {
  const existing = await correspondenceRepo.findById(id);
  if (!existing) throw appError('CORRESPONDENCE_NOT_FOUND', 'مکاتبه یافت نشد.', 404);
  if (existing.status !== 'DRAFT') {
    throw appError('CORRESPONDENCE_NOT_DRAFT', 'مکاتبه نهایی‌شده قابل ویرایش نیست.', 409, { id, status: existing.status });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های مکاتبه نامعتبر است.');
  const patch = parsed.data;

  if (patch.typeKey && patch.typeKey !== existing.typeKey) {
    await correspondenceTypeService.assertActiveCorrespondenceType(patch.typeKey);
  }
  await assertOptionalReferences(patch);

  const updated = await withTransaction(async (client) => {
    const row = await correspondenceRepo.update(id, patch, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'correspondence.update',
      entityType: 'correspondence',
      entityId: id,
      detail: { correspondenceId: id, actorId: actorUserId },
    }, client);
    return row;
  });

  if (!updated) throw appError('CORRESPONDENCE_NOT_FOUND', 'مکاتبه یافت نشد.', 404);
  return attachAttachmentMeta(updated);
}

/**
 * AI rewrite — editor only (product rule 5/6). Never mutates status or
 * writes final_body; persists ai_rewritten_body for continuity across
 * reloads and runs the P0 critical-value-preservation check against the
 * source text, returning the violation report so the UI can warn before
 * the user accepts. Does NOT block here — the hard block is at FINALIZE.
 */
export async function aiRewriteCorrespondence(id, body, actorUserId) {
  const existing = await correspondenceRepo.findById(id);
  if (!existing) throw appError('CORRESPONDENCE_NOT_FOUND', 'مکاتبه یافت نشد.', 404);
  if (existing.status !== 'DRAFT') {
    throw appError('CORRESPONDENCE_NOT_DRAFT', 'بازنویسی هوش مصنوعی فقط برای پیش‌نویس مجاز است.', 409);
  }

  const parsed = aiRewriteSchema.safeParse(body || {});
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های بازنویسی نامعتبر است.');

  const sourceText = (parsed.data.text || existing.rawBody || '').trim();
  if (!sourceText) {
    throw appError('VALIDATION', 'متن خام برای بازنویسی هوش مصنوعی وجود ندارد.', 400);
  }

  let content;
  try {
    content = await rewriteCorrespondenceText(sourceText);
  } catch (err) {
    const status = err.code === 'AI_TIMEOUT' ? 504 : 502;
    throw appError(err.code || 'AI_UNAVAILABLE', err.message || 'سرویس هوش مصنوعی در دسترس نیست.', status);
  }

  const validation = checkCriticalValuePreservation(sourceText, content);

  await withTransaction(async (client) => {
    await correspondenceRepo.update(id, {
      rawBody: existing.rawBody ? null : sourceText, // keep first-ever raw body immutable; COALESCE no-ops if already set
      aiRewrittenBody: content,
    }, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'correspondence.ai_rewrite',
      entityType: 'correspondence',
      entityId: id,
      detail: { correspondenceId: id, ok: validation.ok, violationKinds: validation.violations.map((v) => v.kind), actorId: actorUserId },
    }, client);
  });

  return { content, validation };
}

/**
 * FINALIZE — server-authoritative numbering (DDL-23a), hard attachment gate
 * for IN (product rule 3/13), hard critical-value gate (product rule 6, P0).
 */
export async function finalizeCorrespondence(id, body, actorUserId) {
  const existing = await correspondenceRepo.findById(id);
  if (!existing) throw appError('CORRESPONDENCE_NOT_FOUND', 'مکاتبه یافت نشد.', 404);
  if (existing.status !== 'DRAFT') {
    throw appError('CORRESPONDENCE_ALREADY_FINAL', 'این مکاتبه قبلاً نهایی شده است.', 409, { id });
  }

  const parsed = finalizeSchema.safeParse(body || {});
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های نهایی‌سازی نامعتبر است.');

  const finalBody = (parsed.data.finalBody || existing.aiRewrittenBody || existing.rawBody || '').trim();
  if (!finalBody) {
    throw appError('VALIDATION', 'متن نهایی نامه الزامی است.', 400);
  }

  if (existing.direction === DIRECTIONS.INCOMING) {
    const attachmentCount = await correspondenceRepo.countAttachments(id);
    if (attachmentCount < 1) {
      throw appError(
        'ATTACHMENT_REQUIRED',
        'نامه وارده بدون پیوست سند اصلی قابل نهایی‌سازی نیست.',
        422,
        { id },
      );
    }
  }

  if (existing.rawBody) {
    const validation = checkCriticalValuePreservation(existing.rawBody, finalBody);
    if (!validation.ok) {
      throw appError(
        'CRITICAL_VALUE_VIOLATION',
        'مقادیر حیاتی (مبلغ/تاریخ/درصد/شماره سفارش و...) در متن نهایی نسبت به متن اصلی تغییر کرده یا حذف شده است. لطفاً پیش از نهایی‌سازی اصلاح کنید.',
        422,
        { violations: validation.violations },
      );
    }
  }

  const dateKey = existing.recordDate || existing.receivedDate || new Date().toISOString().slice(0, 10);
  const yearShort = toRegistryYearShort(dateKey);
  const code = registryDirectionCode(existing.direction);

  const finalized = await withTransaction(async (client) => {
    // Atomic INSERT..ON CONFLICT..RETURNING counter (DDL-23a) — safe under
    // concurrent finalize calls because Postgres takes a row lock on the
    // conflicting row for the duration of the transaction; a second
    // concurrent finalize for the same (year, direction) blocks here until
    // the first commits, then reads the already-incremented value.
    const counterRes = await client.query(
      `INSERT INTO correspondence_number_counters (year_short, direction_code, next_seq)
       VALUES ($1, $2, 2)
       ON CONFLICT (year_short, direction_code)
       DO UPDATE SET next_seq = correspondence_number_counters.next_seq + 1, updated_at = NOW()
       RETURNING next_seq`,
      [yearShort, code],
    );
    const seq = counterRes.rows[0].next_seq - 1;
    const officialNumber = formatOfficialNumber(yearShort, code, seq);
    const identity = await organizationIdentityRepo.get();
    const organizationSnapshot = letterOrganizationSnapshotFromIdentity(identity);

    const row = await correspondenceRepo.finalize(id, {
      officialNumber,
      finalBody,
      actorUserId,
      issuedAt: new Date().toISOString(),
      issuedBy: parsed.data.issuedBy || null,
      issuerTitle: parsed.data.issuerTitle || null,
      organizationSnapshot,
    }, client);

    if (!row) {
      // Lost the race to another finalize call between our findById check
      // and this UPDATE (status no longer DRAFT) — the allocated number is
      // simply unused (acceptable gap, same posture as a DB sequence).
      throw appError('CORRESPONDENCE_ALREADY_FINAL', 'این مکاتبه هم‌زمان توسط عملیات دیگری نهایی شد.', 409, { id });
    }

    await writeAudit({
      actorUserId,
      action: 'correspondence.finalize',
      entityType: 'correspondence',
      entityId: id,
      detail: { correspondenceId: id, officialNumber, direction: existing.direction, actorId: actorUserId },
    }, client);

    return row;
  });

  return attachAttachmentMeta(finalized);
}

export async function archiveCorrespondence(id, actorUserId) {
  const existing = await correspondenceRepo.findById(id);
  if (!existing) throw appError('CORRESPONDENCE_NOT_FOUND', 'مکاتبه یافت نشد.', 404);

  await withTransaction(async (client) => {
    await correspondenceRepo.archive(id, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'correspondence.archive',
      entityType: 'correspondence',
      entityId: id,
      detail: { correspondenceId: id, actorId: actorUserId },
    }, client);
  });

  return { id, archived: true };
}

// --- Attachments --------------------------------------------------------

export async function listAttachments(id) {
  await getCorrespondenceOrThrow(id);
  return correspondenceRepo.listAttachments(id, { withData: false });
}

export async function getAttachment(id, attachmentId) {
  await getCorrespondenceOrThrow(id);
  const attachment = await correspondenceRepo.findAttachmentById(attachmentId);
  if (!attachment || String(attachment.correspondenceId) !== String(id)) {
    throw appError('ATTACHMENT_NOT_FOUND', 'پیوست یافت نشد.', 404);
  }
  return attachment;
}

async function getCorrespondenceOrThrow(id) {
  const row = await correspondenceRepo.findById(id);
  if (!row) throw appError('CORRESPONDENCE_NOT_FOUND', 'مکاتبه یافت نشد.', 404);
  return row;
}

export async function addAttachment(id, body, actorUserId) {
  const existing = await getCorrespondenceOrThrow(id);
  if (existing.status !== 'DRAFT') {
    throw appError('CORRESPONDENCE_NOT_DRAFT', 'افزودن پیوست فقط برای پیش‌نویس مجاز است.', 409);
  }

  const parsed = attachmentSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های پیوست نامعتبر است.');

  const approxBytes = Math.floor((parsed.data.dataBase64.length * 3) / 4);
  if (approxBytes > MAX_ATTACHMENT_BYTES) {
    throw appError('ATTACHMENT_TOO_LARGE', 'حجم پیوست بیش از حد مجاز است.', 413, { maxBytes: MAX_ATTACHMENT_BYTES });
  }

  const attachmentId = newEntityId('attch');
  const created = await withTransaction(async (client) => {
    const row = await correspondenceRepo.addAttachment({
      id: attachmentId,
      correspondenceId: id,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType || null,
      sizeBytes: approxBytes,
      dataBase64: parsed.data.dataBase64,
      actorUserId,
    }, client);
    await writeAudit({
      actorUserId,
      action: 'correspondence.attachment_add',
      entityType: 'correspondence',
      entityId: id,
      detail: { correspondenceId: id, attachmentId, fileName: parsed.data.fileName, actorId: actorUserId },
    }, client);
    return row;
  });

  return created;
}

export async function removeAttachment(id, attachmentId, actorUserId) {
  const existing = await getCorrespondenceOrThrow(id);
  if (existing.status !== 'DRAFT') {
    throw appError('CORRESPONDENCE_NOT_DRAFT', 'حذف پیوست فقط برای پیش‌نویس مجاز است.', 409);
  }
  await withTransaction(async (client) => {
    await correspondenceRepo.removeAttachment(attachmentId, id, client);
    await writeAudit({
      actorUserId,
      action: 'correspondence.attachment_remove',
      entityType: 'correspondence',
      entityId: id,
      detail: { correspondenceId: id, attachmentId, actorId: actorUserId },
    }, client);
  });
  return { id: attachmentId, removed: true };
}

export default {
  DIRECTIONS,
  listCorrespondence,
  getCorrespondence,
  listCorrespondenceByCompany,
  listCorrespondenceByOrder,
  createCorrespondence,
  updateCorrespondence,
  aiRewriteCorrespondence,
  finalizeCorrespondence,
  archiveCorrespondence,
  listAttachments,
  getAttachment,
  addAttachment,
  removeAttachment,
};
