/**
 * Product Type repository (Shirazeh-owned taxonomy leaf, DDL-24). SQL only.
 */
import { query } from '../db/pool.js';

function mapRow(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    normalizedName: row.normalized_name,
    code: row.code,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    allowedBrandIds: row.allowed_brand_ids || [],
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function runner(client) {
  return client ? client.query.bind(client) : query;
}

export async function list({ categoryId = null, includeInactive = true } = {}, client = null) {
  const run = runner(client);
  const clauses = [];
  const params = [];
  if (categoryId) {
    params.push(categoryId);
    clauses.push(`category_id = $${params.length}`);
  }
  if (!includeInactive) clauses.push('is_active = true');
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const res = await run(`SELECT * FROM product_types ${where} ORDER BY sort_order ASC, name ASC`, params);
  return res.rows.map(mapRow);
}

export async function findById(id, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM product_types WHERE id = $1`, [id]);
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function findByNormalizedName(categoryId, normalizedName, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT * FROM product_types WHERE category_id = $1 AND normalized_name = $2`,
    [categoryId, normalizedName],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO product_types (id, category_id, name, normalized_name, code, sort_order, is_active, allowed_brand_ids, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $9)
     RETURNING *`,
    [
      row.id, row.categoryId, row.name, row.normalizedName, row.code, row.sortOrder ?? 0, row.isActive ?? true,
      JSON.stringify(row.allowedBrandIds || []), row.actorUserId || null,
    ],
  );
  return mapRow(res.rows[0]);
}

export async function update(id, patch, actorUserId, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE product_types SET
      name = COALESCE($2, name),
      normalized_name = COALESCE($3, normalized_name),
      sort_order = COALESCE($4, sort_order),
      is_active = COALESCE($5, is_active),
      allowed_brand_ids = COALESCE($6::jsonb, allowed_brand_ids),
      updated_by = $7,
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id, patch.name ?? null, patch.normalizedName ?? null, patch.sortOrder ?? null, patch.isActive ?? null,
      patch.allowedBrandIds ? JSON.stringify(patch.allowedBrandIds) : null, actorUserId || null,
    ],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export default { list, findById, findByNormalizedName, create, update };
