/**
 * Correspondence PostgreSQL adapter — SQL only. No Zod / RBAC / HTTP.
 * Gahshomar Correspondence aggregate (DDL-23).
 */
import { query } from '../db/pool.js';
import { activeCorrespondenceWhere } from '../db/activeScope.js';

export function mapCorrespondenceRow(row) {
  return {
    id: row.id,
    direction: row.direction,
    typeKey: row.type_key,
    status: row.status,
    officialNumber: row.official_number,
    subject: row.subject,
    rawBody: row.raw_body,
    aiRewrittenBody: row.ai_rewritten_body,
    finalBody: row.final_body,
    recordDate: row.record_date,
    receivedDate: row.received_date,
    attentionName: row.attention_name,
    senderParty: row.sender_party && typeof row.sender_party === 'object' ? row.sender_party : {},
    receiverParty: row.receiver_party && typeof row.receiver_party === 'object' ? row.receiver_party : {},
    companyId: row.company_id,
    orderId: row.order_id,
    threadId: row.thread_id,
    referenceId: row.reference_id,
    assigneeUserId: row.assignee_user_id,
    assigneeName: row.assignee_name,
    tags: Array.isArray(row.tags) ? row.tags : [],
    issuedAt: row.issued_at,
    issuedBy: row.issued_by,
    issuerTitle: row.issuer_title,
    finalizedAt: row.finalized_at,
    finalizedBy: row.finalized_by,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
  };
}

export function mapAttachmentRow(row) {
  return {
    id: row.id,
    correspondenceId: row.correspondence_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    dataBase64: row.data_base64,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

/** Attachment list without the (potentially large) base64 payload — for list/metadata views. */
export function mapAttachmentMetaRow(row) {
  return {
    id: row.id,
    correspondenceId: row.correspondence_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

function runner(client) {
  return client ? client.query.bind(client) : query;
}

export async function list({
  direction,
  status,
  typeKey,
  companyId,
  orderId,
  search,
  createdBy,
  dateFrom,
  dateTo,
  limit = 50,
  offset = 0,
  includeArchived = false,
} = {}, client = null) {
  const run = runner(client);
  const clauses = [includeArchived ? 'TRUE' : activeCorrespondenceWhere()];
  const params = [];
  let i = 1;

  if (direction) {
    clauses.push(`direction = $${i}`);
    params.push(direction);
    i += 1;
  }
  if (status) {
    clauses.push(`status = $${i}`);
    params.push(status);
    i += 1;
  }
  if (typeKey) {
    clauses.push(`type_key = $${i}`);
    params.push(typeKey);
    i += 1;
  }
  if (companyId) {
    clauses.push(`company_id = $${i}`);
    params.push(String(companyId));
    i += 1;
  }
  if (orderId) {
    clauses.push(`order_id = $${i}`);
    params.push(String(orderId));
    i += 1;
  }
  if (createdBy) {
    clauses.push(`created_by = $${i}`);
    params.push(createdBy);
    i += 1;
  }
  if (dateFrom) {
    clauses.push(`record_date >= $${i}`);
    params.push(dateFrom);
    i += 1;
  }
  if (dateTo) {
    clauses.push(`record_date <= $${i}`);
    params.push(dateTo);
    i += 1;
  }
  if (search) {
    clauses.push(`(subject ILIKE $${i} OR official_number ILIKE $${i})`);
    params.push(`%${search}%`);
    i += 1;
  }

  const where = `WHERE ${clauses.join(' AND ')}`;
  params.push(Math.min(Number(limit) || 50, 200), Number(offset) || 0);

  const res = await run(
    `SELECT * FROM correspondence ${where}
     ORDER BY created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params,
  );
  return res.rows.map(mapCorrespondenceRow);
}

export async function findById(id, { includeArchived = false } = {}, client = null) {
  const run = runner(client);
  const activeClause = includeArchived ? '' : ` AND ${activeCorrespondenceWhere()}`;
  const res = await run(`SELECT * FROM correspondence WHERE id = $1${activeClause}`, [id]);
  return res.rows[0] ? mapCorrespondenceRow(res.rows[0]) : null;
}

export async function findByThreadId(threadId, { includeArchived = false } = {}, client = null) {
  const run = runner(client);
  const activeClause = includeArchived ? '' : ` AND ${activeCorrespondenceWhere()}`;
  const res = await run(
    `SELECT * FROM correspondence WHERE thread_id = $1${activeClause} ORDER BY created_at ASC`,
    [threadId],
  );
  return res.rows.map(mapCorrespondenceRow);
}

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO correspondence (
      id, direction, type_key, status, subject, raw_body, record_date, received_date,
      attention_name, sender_party, receiver_party, company_id, order_id,
      thread_id, reference_id, assignee_user_id, assignee_name, tags,
      created_by, updated_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14,$15,$16,$17,$18::jsonb,$19,$19
    ) RETURNING *`,
    [
      row.id,
      row.direction,
      row.typeKey || 'OFFICIAL',
      row.status || 'DRAFT',
      row.subject,
      row.rawBody || null,
      row.recordDate || null,
      row.receivedDate || null,
      row.attentionName || null,
      JSON.stringify(row.senderParty || {}),
      JSON.stringify(row.receiverParty || {}),
      row.companyId || null,
      row.orderId || null,
      row.threadId || row.id,
      row.referenceId || null,
      row.assigneeUserId || null,
      row.assigneeName || null,
      JSON.stringify(row.tags || []),
      row.actorUserId || null,
    ],
  );
  return mapCorrespondenceRow(res.rows[0]);
}

export async function update(id, data, actorUserId, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE correspondence SET
      type_key = COALESCE($2, type_key),
      subject = COALESCE($3, subject),
      raw_body = COALESCE($4, raw_body),
      ai_rewritten_body = COALESCE($5, ai_rewritten_body),
      record_date = COALESCE($6, record_date),
      received_date = COALESCE($7, received_date),
      attention_name = COALESCE($8, attention_name),
      sender_party = COALESCE($9::jsonb, sender_party),
      receiver_party = COALESCE($10::jsonb, receiver_party),
      company_id = COALESCE($11, company_id),
      order_id = COALESCE($12, order_id),
      assignee_user_id = COALESCE($13, assignee_user_id),
      assignee_name = COALESCE($14, assignee_name),
      tags = COALESCE($15::jsonb, tags),
      updated_by = $16,
      updated_at = NOW()
     WHERE id = $1 AND ${activeCorrespondenceWhere()} AND status = 'DRAFT'
     RETURNING *`,
    [
      id,
      data.typeKey ?? null,
      data.subject ?? null,
      data.rawBody ?? null,
      data.aiRewrittenBody ?? null,
      data.recordDate ?? null,
      data.receivedDate ?? null,
      data.attentionName ?? null,
      data.senderParty ? JSON.stringify(data.senderParty) : null,
      data.receiverParty ? JSON.stringify(data.receiverParty) : null,
      data.companyId ?? null,
      data.orderId ?? null,
      data.assigneeUserId ?? null,
      data.assigneeName ?? null,
      data.tags ? JSON.stringify(data.tags) : null,
      actorUserId,
    ],
  );
  return res.rows[0] ? mapCorrespondenceRow(res.rows[0]) : null;
}

/**
 * Assign the atomically-obtained official number and flip DRAFT -> FINAL.
 * Guarded by `status = 'DRAFT'` so a second concurrent finalize on the
 * same row is a no-op at the SQL level (defense in depth beyond the
 * counter-table transaction in the service layer).
 */
export async function finalize(id, { officialNumber, finalBody, actorUserId, issuedAt, issuedBy, issuerTitle }, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE correspondence SET
      status = 'FINAL',
      official_number = $2,
      final_body = $3,
      finalized_at = NOW(),
      finalized_by = $4,
      issued_at = COALESCE($5::timestamptz, NOW()),
      issued_by = COALESCE($6, issued_by),
      issuer_title = COALESCE($7, issuer_title),
      updated_by = $4,
      updated_at = NOW()
     WHERE id = $1 AND ${activeCorrespondenceWhere()} AND status = 'DRAFT'
     RETURNING *`,
    [id, officialNumber, finalBody, actorUserId, issuedAt || null, issuedBy || null, issuerTitle || null],
  );
  return res.rows[0] ? mapCorrespondenceRow(res.rows[0]) : null;
}

export async function archive(id, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE correspondence SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
     WHERE id = $1 AND ${activeCorrespondenceWhere()}`,
    [id, actorUserId],
  );
}

// --- Attachments (DDL-23b) --------------------------------------------

export async function listAttachments(correspondenceId, { withData = false } = {}, client = null) {
  const run = runner(client);
  const cols = withData ? '*' : 'id, correspondence_id, file_name, mime_type, size_bytes, created_at, created_by';
  const res = await run(
    `SELECT ${cols} FROM correspondence_attachments WHERE correspondence_id = $1 ORDER BY created_at ASC`,
    [correspondenceId],
  );
  return res.rows.map(withData ? mapAttachmentRow : mapAttachmentMetaRow);
}

export async function countAttachments(correspondenceId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT COUNT(*)::int AS n FROM correspondence_attachments WHERE correspondence_id = $1`,
    [correspondenceId],
  );
  return res.rows[0]?.n || 0;
}

export async function findAttachmentById(attachmentId, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM correspondence_attachments WHERE id = $1`, [attachmentId]);
  return res.rows[0] ? mapAttachmentRow(res.rows[0]) : null;
}

export async function addAttachment(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO correspondence_attachments (
      id, correspondence_id, file_name, mime_type, size_bytes, data_base64, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING id, correspondence_id, file_name, mime_type, size_bytes, created_at, created_by`,
    [
      row.id,
      row.correspondenceId,
      row.fileName,
      row.mimeType || null,
      row.sizeBytes || null,
      row.dataBase64,
      row.actorUserId || null,
    ],
  );
  return mapAttachmentMetaRow(res.rows[0]);
}

export async function removeAttachment(attachmentId, correspondenceId, client = null) {
  const run = runner(client);
  await run(
    `DELETE FROM correspondence_attachments WHERE id = $1 AND correspondence_id = $2`,
    [attachmentId, correspondenceId],
  );
}

export default {
  list,
  findById,
  findByThreadId,
  create,
  update,
  finalize,
  archive,
  listAttachments,
  countAttachments,
  findAttachmentById,
  addAttachment,
  removeAttachment,
};
