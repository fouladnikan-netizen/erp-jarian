/**
 * Task PostgreSQL adapter — SQL only (DDL-16). No Zod / RBAC / HTTP.
 */
import { query } from '../db/pool.js';
import { activeTaskWhere } from '../db/activeScope.js';

export function mapTaskRow(row) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    sourceActivityId: row.source_activity_id,
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
  assignedTo,
  status,
  limit = 50,
  offset = 0,
  includeArchived = false,
} = {}, client = null) {
  const run = runner(client);
  const clauses = [includeArchived ? 'TRUE' : activeTaskWhere()];
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
  if (assignedTo) {
    clauses.push(`assigned_to = $${i}`);
    params.push(String(assignedTo));
    i += 1;
  }
  if (status) {
    clauses.push(`status = $${i}`);
    params.push(status);
    i += 1;
  }

  params.push(Math.min(Number(limit) || 50, 200), Number(offset) || 0);
  const res = await run(
    `SELECT * FROM tasks WHERE ${clauses.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params,
  );
  return res.rows.map(mapTaskRow);
}

export async function listBySubject(subjectType, subjectId, opts = {}, client = null) {
  return list({ ...opts, subjectType, subjectId }, client);
}

export async function findById(id, { includeArchived = false } = {}, client = null) {
  const run = runner(client);
  const activeClause = includeArchived ? '' : ` AND ${activeTaskWhere()}`;
  const res = await run(`SELECT * FROM tasks WHERE id = $1${activeClause}`, [id]);
  return res.rows[0] ? mapTaskRow(res.rows[0]) : null;
}

/** Gap 2 — follow-up → Task linkage lookup (idempotency anchor). */
export async function findBySourceActivityId(sourceActivityId, { includeArchived = false } = {}, client = null) {
  if (!sourceActivityId) return null;
  const run = runner(client);
  const activeClause = includeArchived ? '' : ` AND ${activeTaskWhere()}`;
  const res = await run(
    `SELECT * FROM tasks WHERE source_activity_id = $1${activeClause} ORDER BY created_at ASC LIMIT 1`,
    [sourceActivityId],
  );
  return res.rows[0] ? mapTaskRow(res.rows[0]) : null;
}

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO tasks (
      id, subject_type, subject_id, title, description, status, priority,
      assigned_to, due_at, source_activity_id, payload, created_by, updated_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz,$10,$11::jsonb,$12,$12
    )
    RETURNING *`,
    [
      row.id,
      row.subjectType,
      String(row.subjectId),
      row.title,
      row.description || null,
      row.status || 'OPEN',
      row.priority || 'normal',
      row.assignedTo || null,
      row.dueAt || null,
      row.sourceActivityId || null,
      JSON.stringify(row.payload || {}),
      row.actorUserId,
    ],
  );
  return mapTaskRow(res.rows[0]);
}

export async function update(id, data, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE tasks SET
      title = COALESCE($2, title),
      description = COALESCE($3, description),
      priority = COALESCE($4, priority),
      assigned_to = COALESCE($5, assigned_to),
      due_at = COALESCE($6::timestamptz, due_at),
      payload = COALESCE($7::jsonb, payload),
      updated_by = $8,
      updated_at = NOW()
     WHERE id = $1 AND ${activeTaskWhere()}`,
    [
      id,
      data.title ?? null,
      data.description ?? null,
      data.priority ?? null,
      data.assignedTo ?? null,
      data.dueAt ?? null,
      data.payload ? JSON.stringify(data.payload) : null,
      actorUserId,
    ],
  );
}

export async function changeStatus(id, status, actorUserId, {
  completedAt = undefined,
} = {}, client = null) {
  const run = runner(client);
  await run(
    `UPDATE tasks SET
      status = $2,
      completed_at = CASE
        WHEN $2 = 'COMPLETED' THEN COALESCE($3::timestamptz, NOW())
        ELSE completed_at
      END,
      updated_by = $4,
      updated_at = NOW()
     WHERE id = $1 AND ${activeTaskWhere()}`,
    [id, status, completedAt || null, actorUserId],
  );
}

export async function complete(id, actorUserId, client = null) {
  return changeStatus(id, 'COMPLETED', actorUserId, { completedAt: new Date().toISOString() }, client);
}

export async function archive(id, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE tasks SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
     WHERE id = $1 AND ${activeTaskWhere()}`,
    [id, actorUserId],
  );
}

export async function findUserById(userId, client = null) {
  if (!userId) return null;
  const run = runner(client);
  const res = await run(
    `SELECT id, username, display_name, is_active FROM users WHERE id = $1`,
    [userId],
  );
  return res.rows[0] || null;
}
