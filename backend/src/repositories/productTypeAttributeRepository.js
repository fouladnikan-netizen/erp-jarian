/**
 * Product Type <-> Attribute Definition schema binding (Shirazeh-owned, DDL-24).
 * SQL only. This is the "Attribute Schema" a Product Type defines/inherits.
 */
import { query } from '../db/pool.js';

function mapRow(row) {
  return {
    id: row.id,
    productTypeId: row.product_type_id,
    attributeDefinitionId: row.attribute_definition_id,
    isRequired: row.is_required,
    sortOrder: row.sort_order,
    isIdentityRelevant: row.is_identity_relevant,
    isDisplayRelevant: row.is_display_relevant,
    attributeRole: row.attribute_role,
    overrideDefaultValue: row.override_default_value,
    overrideMin: row.override_min === null ? null : Number(row.override_min),
    overrideMax: row.override_max === null ? null : Number(row.override_max),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function runner(client) {
  return client ? client.query.bind(client) : query;
}

export async function listByProductType(productTypeId, { includeInactive = true } = {}, client = null) {
  const run = runner(client);
  const where = includeInactive
    ? 'WHERE product_type_id = $1'
    : 'WHERE product_type_id = $1 AND is_active = true';
  const res = await run(`SELECT * FROM product_type_attributes ${where} ORDER BY sort_order ASC`, [productTypeId]);
  return res.rows.map(mapRow);
}

export async function findById(id, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM product_type_attributes WHERE id = $1`, [id]);
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function findBinding(productTypeId, attributeDefinitionId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT * FROM product_type_attributes WHERE product_type_id = $1 AND attribute_definition_id = $2`,
    [productTypeId, attributeDefinitionId],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO product_type_attributes (
       id, product_type_id, attribute_definition_id, is_required, sort_order,
       is_identity_relevant, is_display_relevant, attribute_role,
       override_default_value, override_min, override_max, is_active, created_by, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
     RETURNING *`,
    [
      row.id, row.productTypeId, row.attributeDefinitionId, row.isRequired ?? false, row.sortOrder ?? 0,
      row.isIdentityRelevant ?? false, row.isDisplayRelevant ?? false, row.attributeRole || 'MASTER_ONLY',
      row.overrideDefaultValue ?? null, row.overrideMin ?? null, row.overrideMax ?? null,
      row.isActive ?? true, row.actorUserId || null,
    ],
  );
  return mapRow(res.rows[0]);
}

export async function update(id, patch, actorUserId, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE product_type_attributes SET
      is_required = COALESCE($2, is_required),
      sort_order = COALESCE($3, sort_order),
      is_identity_relevant = COALESCE($4, is_identity_relevant),
      is_display_relevant = COALESCE($5, is_display_relevant),
      attribute_role = COALESCE($6, attribute_role),
      override_default_value = COALESCE($7, override_default_value),
      override_min = COALESCE($8, override_min),
      override_max = COALESCE($9, override_max),
      is_active = COALESCE($10, is_active),
      updated_by = $11,
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id, patch.isRequired ?? null, patch.sortOrder ?? null, patch.isIdentityRelevant ?? null,
      patch.isDisplayRelevant ?? null, patch.attributeRole ?? null, patch.overrideDefaultValue ?? null,
      patch.overrideMin ?? null, patch.overrideMax ?? null, patch.isActive ?? null, actorUserId || null,
    ],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export default { listByProductType, findById, findBinding, create, update };
