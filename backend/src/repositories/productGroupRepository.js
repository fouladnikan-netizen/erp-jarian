/**
 * Product Group repository (Shirazeh-owned taxonomy root, DDL-24). SQL only.
 */
import { query } from '../db/pool.js';

function mapRow(row) {
  return {
    id: row.id,
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

export async function listSkuCodes(client = null) {
  const run = runner(client);
  const res = await run(`SELECT id, sku_code FROM product_groups`);
  return res.rows.map((row) => ({ id: row.id, skuCode: row.sku_code }));
}

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO product_groups (id, name, name_latin, sku_code, normalized_name, code, sort_order, is_active, created_by, updated_by)
     VALUES ($1, $2, NULLIF($8, ''), $9, $3, $4, $5, $6, $7, $7)
     RETURNING *`,
    [
      row.id, row.name, row.normalizedName, row.code, row.sortOrder ?? 0, row.isActive ?? true,
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
    `UPDATE product_groups SET
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
  const res = await run(`DELETE FROM product_groups WHERE id = $1 RETURNING id`, [id]);
  return res.rowCount > 0;
}

export default { list, findById, findByNormalizedName, create, update, remove };
