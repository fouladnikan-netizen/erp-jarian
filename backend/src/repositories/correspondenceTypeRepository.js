/**
 * Correspondence Type Registry PostgreSQL adapter — SQL only. No Zod / RBAC / HTTP.
 * DDL-23(d) — Shirazeh-driven canonical Correspondence type list (mirrors
 * activityTypeRepository.js exactly).
 */
import { query } from '../db/pool.js';

function mapRow(row) {
  return {
    key: row.key,
    labelFa: row.label_fa,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function runner(client) {
  return client ? client.query.bind(client) : query;
}

export async function list({ includeInactive = true } = {}, client = null) {
  const run = runner(client);
  const where = includeInactive ? '' : 'WHERE is_active = true';
  const res = await run(
    `SELECT * FROM correspondence_type_registry ${where} ORDER BY sort_order ASC, key ASC`,
  );
  return res.rows.map(mapRow);
}

export async function findByKey(key, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM correspondence_type_registry WHERE key = $1`, [key]);
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function listActiveKeys(client = null) {
  const rows = await list({ includeInactive: false }, client);
  return rows.map((r) => r.key);
}

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO correspondence_type_registry (key, label_fa, sort_order, is_active, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING *`,
    [row.key, row.labelFa, row.sortOrder ?? 0, row.isActive ?? true, row.actorUserId || null],
  );
  return mapRow(res.rows[0]);
}

export async function update(key, patch, actorUserId, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE correspondence_type_registry SET
      label_fa = COALESCE($2, label_fa),
      sort_order = COALESCE($3, sort_order),
      is_active = COALESCE($4, is_active),
      updated_by = $5,
      updated_at = NOW()
     WHERE key = $1
     RETURNING *`,
    [
      key,
      patch.labelFa ?? null,
      patch.sortOrder ?? null,
      patch.isActive ?? null,
      actorUserId || null,
    ],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export default { list, findByKey, listActiveKeys, create, update };
