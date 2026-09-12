/**
 * Product Type repository (Shirazeh-owned taxonomy leaf, DDL-24). SQL only.
 */
import { query } from '../../../db/pool.js';

function mapRow(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    nameLatin: row.name_latin || null,
    skuCode: row.sku_code,
    normalizedName: row.normalized_name,
    code: row.code,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    allowedBrandIds: row.allowed_brand_ids || [],
    defaultCountUnitId: row.default_count_unit_id || null,
    defaultSalesUnitId: row.default_sales_unit_id || null,
    defaultUnitWeight: row.default_unit_weight == null ? null : Number(row.default_unit_weight),
    customLengthAllowed: Boolean(row.custom_length_allowed),
    displayNameRule: row.display_name_rule || null,
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

export async function listSkuCodes(categoryId, client = null) {
  const run = runner(client);
  const res = await run(`SELECT id, sku_code FROM product_types WHERE category_id = $1`, [categoryId]);
  return res.rows.map((row) => ({ id: row.id, skuCode: row.sku_code }));
}

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO product_types (
       id, category_id, name, name_latin, sku_code, normalized_name, code, sort_order, is_active, allowed_brand_ids,
       default_count_unit_id, default_sales_unit_id, default_unit_weight, custom_length_allowed,
       created_by, updated_by
     )
     VALUES ($1, $2, $3, NULLIF($10, ''), $11, $4, $5, $6, $7, $8::jsonb,
             NULLIF($12, ''), NULLIF($13, ''), $14, COALESCE($15, false),
             $9, $9)
     RETURNING *`,
    [
      row.id, row.categoryId, row.name, row.normalizedName, row.code, row.sortOrder ?? 0, row.isActive ?? true,
      JSON.stringify(row.allowedBrandIds || []), row.actorUserId || null, row.nameLatin || '', row.skuCode,
      row.defaultCountUnitId || '', row.defaultSalesUnitId || '', row.defaultUnitWeight ?? null,
      row.customLengthAllowed ?? false,
    ],
  );
  return mapRow(res.rows[0]);
}

export async function update(id, patch, actorUserId, client = null) {
  const run = runner(client);
  const nameLatinProvided = Object.prototype.hasOwnProperty.call(patch, 'nameLatin');
  const skuCodeProvided = Object.prototype.hasOwnProperty.call(patch, 'skuCode');
  const params = [
    id, patch.name ?? null, patch.normalizedName ?? null, patch.sortOrder ?? null, patch.isActive ?? null,
    patch.allowedBrandIds ? JSON.stringify(patch.allowedBrandIds) : null, actorUserId || null,
    nameLatinProvided, nameLatinProvided ? String(patch.nameLatin ?? '') : '',
    skuCodeProvided, skuCodeProvided ? patch.skuCode : null,
  ];
  const extra = [];
  function setNullable(key, column) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) return;
    params.push(patch[key] ?? null);
    extra.push(`${column} = $${params.length}`);
  }
  setNullable('defaultCountUnitId', 'default_count_unit_id');
  setNullable('defaultSalesUnitId', 'default_sales_unit_id');
  setNullable('defaultUnitWeight', 'default_unit_weight');
  if (Object.prototype.hasOwnProperty.call(patch, 'customLengthAllowed') && patch.customLengthAllowed != null) {
    params.push(Boolean(patch.customLengthAllowed));
    extra.push(`custom_length_allowed = $${params.length}`);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'displayNameRule')) {
    params.push(patch.displayNameRule == null ? null : JSON.stringify(patch.displayNameRule));
    extra.push(`display_name_rule = $${params.length}::jsonb`);
  }
  const extraSql = extra.length ? `, ${extra.join(', ')}` : '';
  const res = await run(
    `UPDATE product_types SET
      name = COALESCE($2, name),
      normalized_name = COALESCE($3, normalized_name),
      sort_order = COALESCE($4, sort_order),
      is_active = COALESCE($5, is_active),
      allowed_brand_ids = COALESCE($6::jsonb, allowed_brand_ids),
      name_latin = CASE WHEN $8 THEN NULLIF(BTRIM($9), '') ELSE name_latin END,
      sku_code = CASE WHEN $10 THEN $11 ELSE sku_code END
      ${extraSql},
      updated_by = $7,
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    params,
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function listByAllowedBrand(brandId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT id, name, sku_code
     FROM product_types
     WHERE EXISTS (
       SELECT 1 FROM jsonb_array_elements_text(allowed_brand_ids) AS bid
       WHERE bid = $1
     )
     ORDER BY name ASC`,
    [brandId],
  );
  return res.rows.map((row) => ({ id: row.id, name: row.name, skuCode: row.sku_code }));
}

export async function listByUom(uomId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT id, name, sku_code
     FROM product_types
     WHERE default_count_unit_id = $1 OR default_sales_unit_id = $1
     ORDER BY name ASC`,
    [uomId],
  );
  return res.rows.map((row) => ({ id: row.id, name: row.name, skuCode: row.sku_code }));
}

export async function remove(id, client = null) {
  const run = runner(client);
  const res = await run(`DELETE FROM product_types WHERE id = $1 RETURNING id`, [id]);
  return res.rowCount > 0;
}

export default { list, findById, findByNormalizedName, listSkuCodes, listByUom, listByAllowedBrand, create, update, remove };
