/**
 * Product Group repository (Shirazeh-owned taxonomy root, DDL-24). SQL only.
 */
import { query } from '../db/pool.js';

function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    code: row.code,
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
  const res = await run(`SELECT * FROM product_groups ${where} ORDER BY sort_order ASC, name ASC`);
  return res.rows.map(mapRow);
}

export async function findById(id, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM product_groups WHERE id = $1`, [id]);
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function findByNormalizedName(normalizedName, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM product_groups WHERE normalized_name = $1`, [normalizedName]);
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO product_groups (id, name, normalized_name, code, sort_order, is_active, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING *`,
    [row.id, row.name, row.normalizedName, row.code, row.sortOrder ?? 0, row.isActive ?? true, row.actorUserId || null],
  );
  return mapRow(res.rows[0]);
}

export async function update(id, patch, actorUserId, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE product_groups SET
      name = COALESCE($2, name),
      normalized_name = COALESCE($3, normalized_name),
      sort_order = COALESCE($4, sort_order),
      is_active = COALESCE($5, is_active),
      updated_by = $6,
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, patch.name ?? null, patch.normalizedName ?? null, patch.sortOrder ?? null, patch.isActive ?? null, actorUserId || null],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export default { list, findById, findByNormalizedName, create, update };
