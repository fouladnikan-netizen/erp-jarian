/**
 * Product Category repository (Shirazeh-owned taxonomy, DDL-24). SQL only.
 */
import { query } from '../db/pool.js';

function mapRow(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    nameLatin: row.name_latin || null,
    skuCode: row.sku_code,
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

export async function list({ groupId = null, includeInactive = true } = {}, client = null) {
  const run = runner(client);
  const clauses = [];
  const params = [];
  if (groupId) {
    params.push(groupId);
    clauses.push(`group_id = $${params.length}`);
  }
  if (!includeInactive) clauses.push('is_active = true');
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const res = await run(`SELECT * FROM product_categories ${where} ORDER BY sort_order ASC, name ASC`, params);
  return res.rows.map(mapRow);
}

export async function findById(id, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM product_categories WHERE id = $1`, [id]);
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function findByNormalizedName(groupId, normalizedName, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT * FROM product_categories WHERE group_id = $1 AND normalized_name = $2`,
    [groupId, normalizedName],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function listSkuCodes(groupId, client = null) {
  const run = runner(client);
  const res = await run(`SELECT id, sku_code FROM product_categories WHERE group_id = $1`, [groupId]);
  return res.rows.map((row) => ({ id: row.id, skuCode: row.sku_code }));
}

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO product_categories (id, group_id, name, name_latin, sku_code, normalized_name, code, sort_order, is_active, created_by, updated_by)
     VALUES ($1, $2, $3, NULLIF($9, ''), $10, $4, $5, $6, $7, $8, $8)
     RETURNING *`,
    [
      row.id, row.groupId, row.name, row.normalizedName, row.code, row.sortOrder ?? 0, row.isActive ?? true,
      row.actorUserId || null, row.nameLatin || '', row.skuCode,
    ],
  );
  return mapRow(res.rows[0]);
}

export async function update(id, patch, actorUserId, client = null) {
  const run = runner(client);
  const nameLatinProvided = Object.prototype.hasOwnProperty.call(patch, 'nameLatin');
  const skuCodeProvided = Object.prototype.hasOwnProperty.call(patch, 'skuCode');
  const res = await run(
    `UPDATE product_categories SET
      name = COALESCE($2, name),
      normalized_name = COALESCE($3, normalized_name),
      sort_order = COALESCE($4, sort_order),
      is_active = COALESCE($5, is_active),
      name_latin = CASE WHEN $7 THEN NULLIF(BTRIM($8), '') ELSE name_latin END,
      sku_code = CASE WHEN $9 THEN $10 ELSE sku_code END,
      updated_by = $6,
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      patch.name ?? null,
      patch.normalizedName ?? null,
      patch.sortOrder ?? null,
      patch.isActive ?? null,
      actorUserId || null,
      nameLatinProvided,
      nameLatinProvided ? String(patch.nameLatin ?? '') : '',
      skuCodeProvided,
      skuCodeProvided ? patch.skuCode : null,
    ],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function remove(id, client = null) {
  const run = runner(client);
  const res = await run(`DELETE FROM product_categories WHERE id = $1 RETURNING id`, [id]);
  return res.rowCount > 0;
}

export default { list, findById, findByNormalizedName, create, update, remove };
