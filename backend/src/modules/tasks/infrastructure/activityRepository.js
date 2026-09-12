/**
 * Activity PostgreSQL adapter — SQL only. No Zod / RBAC / HTTP.
 * DDL-15 Pooyesh soft-CRM aggregate.
 */
import { query } from '../../../db/pool.js';
import { activeActivityWhere } from '../../../db/activeScope.js';

export function mapActivityRow(row) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    activityType: row.activity_type,
    title: row.title,
    description: row.description,
    status: row.status,
    occurredAt: row.occurred_at,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    assignedTo: row.assigned_to,
    payload,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
  };
}

function runner(client) {
  return client ? client.query.bind(client) : query;
}

export async function list({
  subjectType,
  subjectId,
  status,
  limit = 50,
  offset = 0,
  includeArchived = false,
} = {}, client = null) {
  const run = runner(client);
  const clauses = [includeArchived ? 'TRUE' : activeActivityWhere()];
  const params = [];
  let i = 1;

  if (subjectType) {
    clauses.push(`subject_type = $${i}`);
    params.push(subjectType);
    i += 1;
  }
  if (subjectId) {
    clauses.push(`subject_id = $${i}`);
    params.push(String(subjectId));
    i += 1;
  }
  if (status) {
    clauses.push(`status = $${i}`);
    params.push(status);
    i += 1;
  }

  const where = `WHERE ${clauses.join(' AND ')}`;
  params.push(Math.min(Number(limit) || 50, 200), Number(offset) || 0);

  const res = await run(
    `SELECT * FROM activities ${where}
     ORDER BY occurred_at DESC, created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params,
  );
  return res.rows.map(mapActivityRow);
}

export async function listBySubject(subjectType, subjectId, opts = {}, client = null) {
  return list({
    ...opts,
    subjectType,
    subjectId,
  }, client);
}

export async function findById(id, { includeArchived = false } = {}, client = null) {
  const run = runner(client);
  const activeClause = includeArchived ? '' : ` AND ${activeActivityWhere()}`;
  const res = await run(`SELECT * FROM activities WHERE id = $1${activeClause}`, [id]);
  return res.rows[0] ? mapActivityRow(res.rows[0]) : null;
}

export async function create(row, client = null) {
  const run = runner(client);
  await run(
    `INSERT INTO activities (
      id, subject_type, subject_id, activity_type, title, description,
      status, occurred_at, due_at, assigned_to, payload, created_by, updated_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,
      COALESCE($8::timestamptz, NOW()),
      $9::timestamptz,
      $10,
      $11::jsonb,
      $12,$12
    )`,
    [
      row.id,
      row.subjectType,
      String(row.subjectId),
      row.activityType || 'note',
      row.title || null,
      row.description || null,
      row.status || 'OPEN',
      row.occurredAt || null,
      row.dueAt || null,
      row.assignedTo || null,
      JSON.stringify(row.payload || {}),
      row.actorUserId,
    ],
  );
}

export async function update(id, data, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE activities SET
      activity_type = COALESCE($2, activity_type),
      title = COALESCE($3, title),
      description = COALESCE($4, description),
      occurred_at = COALESCE($5::timestamptz, occurred_at),
      due_at = COALESCE($6::timestamptz, due_at),
      assigned_to = COALESCE($7, assigned_to),
      payload = COALESCE($8::jsonb, payload),
      updated_by = $9,
      updated_at = NOW()
     WHERE id = $1 AND ${activeActivityWhere()}`,
    [
      id,
      data.activityType ?? null,
      data.title ?? null,
      data.description ?? null,
      data.occurredAt ?? null,
      data.dueAt === undefined ? null : data.dueAt,
      data.assignedTo ?? null,
      data.payload ? JSON.stringify(data.payload) : null,
      actorUserId,
    ],
  );
}

export async function complete(id, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE activities SET
      status = 'COMPLETED',
      completed_at = NOW(),
      updated_by = $2,
      updated_at = NOW()
     WHERE id = $1 AND ${activeActivityWhere()}`,
    [id, actorUserId],
  );
}

export async function archive(id, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE activities SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
     WHERE id = $1 AND ${activeActivityWhere()}`,
    [id, actorUserId],
  );
}
