/**
 * Attribute Definition repository (Shirazeh-owned, DDL-24). SQL only.
 */
import { query } from '../db/pool.js';

function mapRow(row) {
  return {
    id: row.id,
    code: row.code,
    skuCode: row.sku_code,
    nameFa: row.name_fa,
    description: row.description,
    dataType: row.data_type,
    uomId: row.uom_id,
    allowedValues: row.allowed_values,
    defaultValue: row.default_value,
    minValue: row.min_value === null ? null : Number(row.min_value),
    maxValue: row.max_value === null ? null : Number(row.max_value),
    precision: row.precision,
    isSearchable: row.is_searchable,
    isFilterable: row.is_filterable,
    isReportable: row.is_reportable,
    isSortable: row.is_sortable,
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
  const res = await run(`SELECT * FROM attribute_definitions ${where} ORDER BY name_fa ASC`);
  return res.rows.map(mapRow);
}

export async function findById(id, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM attribute_definitions WHERE id = $1`, [id]);
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function findByIds(ids, client = null) {
  if (!ids?.length) return [];
  const run = runner(client);
  const res = await run(`SELECT * FROM attribute_definitions WHERE id = ANY($1::text[])`, [ids]);
  return res.rows.map(mapRow);
}

export async function findByCode(code, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM attribute_definitions WHERE code = $1`, [code]);
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function listSkuCodes(client = null) {
  const run = runner(client);
  const res = await run(`SELECT id, sku_code FROM attribute_definitions`);
  return res.rows.map((row) => ({ id: row.id, skuCode: row.sku_code }));
}

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO attribute_definitions (
       id, code, sku_code, name_fa, description, data_type, uom_id, allowed_values, default_value,
       min_value, max_value, precision, is_searchable, is_filterable, is_reportable, is_sortable,
       is_active, created_by, updated_by
     ) VALUES ($1,$2,$18,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)
     RETURNING *`,
    [
      row.id, row.code, row.nameFa, row.description || null, row.dataType, row.uomId || null,
      row.allowedValues ? JSON.stringify(row.allowedValues) : null, row.defaultValue ?? null,
      row.minValue ?? null, row.maxValue ?? null, row.precision ?? null,
      row.isSearchable ?? true, row.isFilterable ?? true, row.isReportable ?? true, row.isSortable ?? false,
      row.isActive ?? true, row.actorUserId || null, row.skuCode,
    ],
  );
  return mapRow(res.rows[0]);
}

export async function update(id, patch, actorUserId, client = null) {
  const run = runner(client);
  const has = (key) => Object.prototype.hasOwnProperty.call(patch, key);
  const res = await run(
    `UPDATE attribute_definitions SET
      code = CASE WHEN $2 THEN $3 ELSE code END,
      data_type = CASE WHEN $4 THEN $5 ELSE data_type END,
      name_fa = COALESCE($6, name_fa),
      description = COALESCE($7, description),
      uom_id = CASE WHEN $23 THEN $8 ELSE uom_id END,
      allowed_values = CASE WHEN $9 THEN $10::jsonb ELSE allowed_values END,
      default_value = CASE WHEN $24 THEN $11 ELSE default_value END,
      min_value = COALESCE($12, min_value),
      max_value = COALESCE($13, max_value),
      precision = COALESCE($14, precision),
      is_searchable = COALESCE($15, is_searchable),
      is_filterable = COALESCE($16, is_filterable),
      is_reportable = COALESCE($17, is_reportable),
      is_sortable = COALESCE($18, is_sortable),
      is_active = COALESCE($19, is_active),
      sku_code = CASE WHEN $20 THEN $21 ELSE sku_code END,
      updated_by = $22,
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      has('code'), has('code') ? patch.code : null,
      has('dataType'), has('dataType') ? patch.dataType : null,
      patch.nameFa ?? null, patch.description ?? null,
      has('uomId') ? (patch.uomId ?? null) : null,
      has('allowedValues'), has('allowedValues')
        ? (patch.allowedValues == null ? null : JSON.stringify(patch.allowedValues))
        : null,
      has('defaultValue') ? (patch.defaultValue || null) : null,
      patch.minValue ?? null, patch.maxValue ?? null, patch.precision ?? null,
      patch.isSearchable ?? null, patch.isFilterable ?? null, patch.isReportable ?? null, patch.isSortable ?? null,
      patch.isActive ?? null,
      has('skuCode'), has('skuCode') ? patch.skuCode : null,
      actorUserId || null,
      has('uomId'),
      has('defaultValue'),
    ],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function listByUom(uomId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT id, name_fa, code FROM attribute_definitions WHERE uom_id = $1 ORDER BY name_fa ASC`,
    [uomId],
  );
  return res.rows.map((row) => ({ id: row.id, name: row.name_fa, code: row.code }));
}

export async function remove(id, client = null) {
  const run = runner(client);
  const res = await run(`DELETE FROM attribute_definitions WHERE id = $1 RETURNING id`, [id]);
  return res.rowCount > 0;
}

export default { list, findById, findByIds, findByCode, listByUom, create, update, remove };
