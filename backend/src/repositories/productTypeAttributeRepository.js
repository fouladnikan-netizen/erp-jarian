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
    valueScope: row.value_scope || (row.attribute_role === 'TRANSACTION_ONLY' ? 'TRANSACTION' : 'PRODUCT'),
    overrideDefaultValue: row.override_default_value,
    overrideMin: row.override_min === null ? null : Number(row.override_min),
    overrideMax: row.override_max === null ? null : Number(row.override_max),
    overrideAllowedValues: Array.isArray(row.override_allowed_values) ? row.override_allowed_values : null,
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
       is_identity_relevant, is_display_relevant, attribute_role, value_scope,
       override_default_value, override_min, override_max, override_allowed_values,
       is_active, created_by, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$15)
     RETURNING *`,
    [
      row.id, row.productTypeId, row.attributeDefinitionId, row.isRequired ?? false, row.sortOrder ?? 0,
      row.isIdentityRelevant ?? false, row.isDisplayRelevant ?? false,
      row.attributeRole || 'MASTER_ONLY', row.valueScope || 'PRODUCT',
      row.overrideDefaultValue ?? null, row.overrideMin ?? null, row.overrideMax ?? null,
      row.overrideAllowedValues == null ? null : JSON.stringify(row.overrideAllowedValues),
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
      value_scope = COALESCE($7, value_scope),
      override_default_value = CASE WHEN $8::boolean THEN $9 ELSE override_default_value END,
      override_min = CASE WHEN $10::boolean THEN $11 ELSE override_min END,
      override_max = CASE WHEN $12::boolean THEN $13 ELSE override_max END,
      override_allowed_values = CASE WHEN $14::boolean THEN $15::jsonb ELSE override_allowed_values END,
      is_active = COALESCE($16, is_active),
      updated_by = $17,
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      patch.isRequired ?? null,
      patch.sortOrder ?? null,
      patch.isIdentityRelevant ?? null,
      patch.isDisplayRelevant ?? null,
      patch.attributeRole ?? null,
      patch.valueScope ?? null,
      Object.prototype.hasOwnProperty.call(patch, 'overrideDefaultValue'),
      patch.overrideDefaultValue ?? null,
      Object.prototype.hasOwnProperty.call(patch, 'overrideMin'),
      patch.overrideMin ?? null,
      Object.prototype.hasOwnProperty.call(patch, 'overrideMax'),
      patch.overrideMax ?? null,
      Object.prototype.hasOwnProperty.call(patch, 'overrideAllowedValues'),
      patch.overrideAllowedValues == null ? null : JSON.stringify(patch.overrideAllowedValues),
      patch.isActive ?? null,
      actorUserId || null,
    ],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function listByAttributeDefinition(attributeDefinitionId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT * FROM product_type_attributes WHERE attribute_definition_id = $1 ORDER BY sort_order ASC`,
    [attributeDefinitionId],
  );
  return res.rows.map(mapRow);
}

export async function listTypesByAttributeDefinition(attributeDefinitionId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT pt.id, pt.name, pt.sku_code
     FROM product_type_attributes pta
     JOIN product_types pt ON pt.id = pta.product_type_id
     WHERE pta.attribute_definition_id = $1
     ORDER BY pt.name ASC`,
    [attributeDefinitionId],
  );
  return res.rows.map((row) => ({ id: row.id, name: row.name, skuCode: row.sku_code }));
}

export async function deleteByProductType(productTypeId, client = null) {
  const run = runner(client);
  await run(`DELETE FROM product_type_attributes WHERE product_type_id = $1`, [productTypeId]);
}

export async function remove(id, client = null) {
  const run = runner(client);
  const res = await run(`DELETE FROM product_type_attributes WHERE id = $1 RETURNING *`, [id]);
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function removeInactiveByAttributeDefinition(attributeDefinitionId, client = null) {
  const run = runner(client);
  await run(
    `DELETE FROM product_type_attributes WHERE attribute_definition_id = $1 AND is_active = false`,
    [attributeDefinitionId],
  );
}

export default {
  listByProductType, findById, findBinding, create, update,
  listByAttributeDefinition, listTypesByAttributeDefinition, deleteByProductType, remove,
  removeInactiveByAttributeDefinition,
};
