/**
 * Brand Registry repository (Shirazeh-owned, DDL-24). SQL only.
 */
import { query } from '../db/pool.js';

function mapRow(row) {
  return {
    id: row.id,
    brandName: row.brand_name,
    legalName: row.legal_name,
    normalizedName: row.normalized_name,
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
  const res = await run(`SELECT * FROM brands ${where} ORDER BY brand_name ASC`);
  return res.rows.map(mapRow);
}

export async function findById(id, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM brands WHERE id = $1`, [id]);
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function findByNormalizedName(normalizedName, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM brands WHERE normalized_name = $1`, [normalizedName]);
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO brands (id, brand_name, legal_name, normalized_name, is_active, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING *`,
    [row.id, row.brandName, row.legalName || null, row.normalizedName, row.isActive ?? true, row.actorUserId || null],
  );
  return mapRow(res.rows[0]);
}

export async function update(id, patch, actorUserId, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE brands SET
      brand_name = COALESCE($2, brand_name),
      legal_name = COALESCE($3, legal_name),
      is_active = COALESCE($4, is_active),
      updated_by = $5,
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, patch.brandName ?? null, patch.legalName ?? null, patch.isActive ?? null, actorUserId || null],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export default { list, findById, findByNormalizedName, create, update };
