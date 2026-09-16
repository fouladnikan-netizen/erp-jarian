/**
 * Brand Registry repository (Shirazeh-owned, DDL-24). SQL only.
 */
import { query } from '../../../db/pool.js';

function mapRow(row) {
  return {
    id: row.id,
    brandName: row.brand_name,
    legalName: row.legal_name,
    nameLatin: row.name_latin || null,
    skuCode: row.sku_code,
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

export async function listSkuCodes(client = null) {
  const run = runner(client);
  const res = await run(`SELECT id, sku_code FROM brands WHERE sku_code IS NOT NULL`);
  return res.rows.map((row) => ({ id: row.id, skuCode: row.sku_code }));
}

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO brands (id, brand_name, legal_name, name_latin, sku_code, normalized_name, is_active, created_by, updated_by)
     VALUES ($1, $2, $3, NULLIF($7, ''), $8, $4, $5, $6, $6)
     RETURNING *`,
    [
      row.id, row.brandName, row.legalName || null, row.normalizedName, row.isActive ?? true,
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
    `UPDATE brands SET
      brand_name = COALESCE($2, brand_name),
      legal_name = COALESCE($3, legal_name),
      is_active = COALESCE($4, is_active),
      name_latin = CASE WHEN $6 THEN NULLIF(BTRIM($7), '') ELSE name_latin END,
      sku_code = CASE WHEN $8 THEN $9 ELSE sku_code END,
      updated_by = $5,
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id, patch.brandName ?? null, patch.legalName ?? null, patch.isActive ?? null, actorUserId || null,
      nameLatinProvided, nameLatinProvided ? String(patch.nameLatin ?? '') : '',
      skuCodeProvided, skuCodeProvided ? patch.skuCode : null,
    ],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function remove(id, client = null) {
  const run = runner(client);
  const res = await run(`DELETE FROM brands WHERE id = $1 RETURNING id`, [id]);
  return res.rowCount > 0;
}

export default { list, findById, findByNormalizedName, listSkuCodes, create, update, remove };
