/**
 * Attribute Definition repository (Shirazeh-owned, DDL-24). SQL only.
 */
import { query } from '../db/pool.js';

function mapRow(row) {
  return {
    id: row.id,
    code: row.code,
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

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO attribute_definitions (
       id, code, name_fa, description, data_type, uom_id, allowed_values, default_value,
       min_value, max_value, precision, is_searchable, is_filterable, is_reportable, is_sortable,
       is_active, created_by, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)
     RETURNING *`,
    [
      row.id, row.code, row.nameFa, row.description || null, row.dataType, row.uomId || null,
      row.allowedValues ? JSON.stringify(row.allowedValues) : null, row.defaultValue ?? null,
      row.minValue ?? null, row.maxValue ?? null, row.precision ?? null,
      row.isSearchable ?? true, row.isFilterable ?? true, row.isReportable ?? true, row.isSortable ?? false,
      row.isActive ?? true, row.actorUserId || null,
    ],
  );
  return mapRow(res.rows[0]);
}

export async function update(id, patch, actorUserId, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE attribute_definitions SET
      name_fa = COALESCE($2, name_fa),
      description = COALESCE($3, description),
      uom_id = COALESCE($4, uom_id),
      allowed_values = COALESCE($5::jsonb, allowed_values),
      default_value = COALESCE($6, default_value),
      min_value = COALESCE($7, min_value),
      max_value = COALESCE($8, max_value),
      precision = COALESCE($9, precision),
      is_searchable = COALESCE($10, is_searchable),
      is_filterable = COALESCE($11, is_filterable),
      is_reportable = COALESCE($12, is_reportable),
      is_sortable = COALESCE($13, is_sortable),
      is_active = COALESCE($14, is_active),
      updated_by = $15,
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id, patch.nameFa ?? null, patch.description ?? null, patch.uomId ?? null,
      patch.allowedValues ? JSON.stringify(patch.allowedValues) : null, patch.defaultValue ?? null,
      patch.minValue ?? null, patch.maxValue ?? null, patch.precision ?? null,
      patch.isSearchable ?? null, patch.isFilterable ?? null, patch.isReportable ?? null, patch.isSortable ?? null,
      patch.isActive ?? null, actorUserId || null,
    ],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export default { list, findById, findByIds, findByCode, create, update };
