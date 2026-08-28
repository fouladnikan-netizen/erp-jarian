/**
 * Product / SKU repository (Vitrin-owned, DDL-24). SQL only. No Zod/RBAC/HTTP.
 */
import { query } from '../db/pool.js';

function mapProduct(row) {
  return {
    id: row.id,
    sku: row.sku,
    productTypeId: row.product_type_id,
    brandId: row.brand_id,
    generatedName: row.generated_name,
    displayNameOverride: row.display_name_override,
    canonicalIdentityKey: row.canonical_identity_key,
    baseUomId: row.base_uom_id,
    salesUomId: row.sales_uom_id,
    purchaseUomId: row.purchase_uom_id,
    weightProfileType: row.weight_profile_type,
    weightProfileCoefficients: row.weight_profile_coefficients,
    lifecycleStatus: row.lifecycle_status,
    dataQualityFlags: row.data_quality_flags,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    deactivatedAt: row.deactivated_at,
    deactivatedBy: row.deactivated_by,
    // joined convenience fields (present only when selected via listWithTaxonomy)
    productTypeName: row.product_type_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    groupId: row.group_id,
    groupName: row.group_name,
    brandName: row.brand_name,
  };
}

function mapAttributeValue(row) {
  return {
    id: row.id,
    productId: row.product_id,
    attributeDefinitionId: row.attribute_definition_id,
    valueText: row.value_text,
    valueNumber: row.value_number === null ? null : Number(row.value_number),
    valueBoolean: row.value_boolean,
    normalizedValue: row.normalized_value,
    // joined
    attributeCode: row.attribute_code,
    attributeNameFa: row.attribute_name_fa,
    dataType: row.data_type,
  };
}

function runner(client) {
  return client ? client.query.bind(client) : query;
}

const BASE_SELECT = `
  SELECT p.*, pt.name AS product_type_name,
         pc.id AS category_id, pc.name AS category_name,
         pg.id AS group_id, pg.name AS group_name,
         b.brand_name AS brand_name
  FROM products p
  JOIN product_types pt ON pt.id = p.product_type_id
  JOIN product_categories pc ON pc.id = pt.category_id
  JOIN product_groups pg ON pg.id = pc.group_id
  LEFT JOIN brands b ON b.id = p.brand_id
`;

export async function findById(id, client = null) {
  const run = runner(client);
  const res = await run(`${BASE_SELECT} WHERE p.id = $1`, [id]);
  return res.rows[0] ? mapProduct(res.rows[0]) : null;
}

export async function findBySku(sku, client = null) {
  const run = runner(client);
  const res = await run(`${BASE_SELECT} WHERE p.sku = $1`, [sku]);
  return res.rows[0] ? mapProduct(res.rows[0]) : null;
}

export async function findByCanonicalIdentityKey(key, client = null) {
  const run = runner(client);
  const res = await run(`${BASE_SELECT} WHERE p.canonical_identity_key = $1`, [key]);
  return res.rows[0] ? mapProduct(res.rows[0]) : null;
}

/**
 * Structured search — never a simple name LIKE. Supports SKU, generated
 * name, group/category/productType, lifecycle, brand, and combined filters.
 * Attribute-value filters are applied via a subquery join.
 */
export async function search(filters = {}, client = null) {
  const run = runner(client);
  const clauses = [];
  const params = [];

  if (filters.sku) {
    params.push(`%${filters.sku}%`);
    clauses.push(`p.sku ILIKE $${params.length}`);
  }
  if (filters.text) {
    params.push(`%${filters.text}%`);
    clauses.push(`(p.generated_name ILIKE $${params.length} OR p.display_name_override ILIKE $${params.length})`);
  }
  if (filters.groupId) {
    params.push(filters.groupId);
    clauses.push(`pg.id = $${params.length}`);
  }
  if (filters.categoryId) {
    params.push(filters.categoryId);
    clauses.push(`pc.id = $${params.length}`);
  }
  if (filters.productTypeId) {
    params.push(filters.productTypeId);
    clauses.push(`pt.id = $${params.length}`);
  }
  if (filters.brandId) {
    params.push(filters.brandId);
    clauses.push(`p.brand_id = $${params.length}`);
  }
  if (filters.lifecycleStatus) {
    params.push(filters.lifecycleStatus);
    clauses.push(`p.lifecycle_status = $${params.length}`);
  } else if (!filters.includeInactive) {
    clauses.push(`p.lifecycle_status = 'ACTIVE'`);
  }

  if (Array.isArray(filters.attributeFilters) && filters.attributeFilters.length) {
    for (const af of filters.attributeFilters) {
      params.push(af.attributeDefinitionId);
      const attrIdx = params.length;
      params.push(af.normalizedValue);
      const valIdx = params.length;
      clauses.push(
        `EXISTS (SELECT 1 FROM product_attribute_values pav WHERE pav.product_id = p.id
          AND pav.attribute_definition_id = $${attrIdx} AND pav.normalized_value = $${valIdx})`,
      );
    }
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = Math.min(Number(filters.limit) || 100, 500);
  const res = await run(`${BASE_SELECT} ${where} ORDER BY p.created_at DESC LIMIT ${limit}`, params);
  return res.rows.map(mapProduct);
}

export async function listAttributeValues(productId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT pav.*, ad.code AS attribute_code, ad.name_fa AS attribute_name_fa, ad.data_type
     FROM product_attribute_values pav
     JOIN attribute_definitions ad ON ad.id = pav.attribute_definition_id
     WHERE pav.product_id = $1`,
    [productId],
  );
  return res.rows.map(mapAttributeValue);
}

export async function create(row, client) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO products (
       id, sku, product_type_id, brand_id, generated_name, display_name_override,
       canonical_identity_key, base_uom_id, sales_uom_id, purchase_uom_id,
       weight_profile_type, weight_profile_coefficients, lifecycle_status, created_by, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$14)
     RETURNING *`,
    [
      row.id, row.sku, row.productTypeId, row.brandId || null, row.generatedName, row.displayNameOverride || null,
      row.canonicalIdentityKey, row.baseUomId || null, row.salesUomId || null, row.purchaseUomId || null,
      row.weightProfileType || 'MANUAL_ACTUAL', JSON.stringify(row.weightProfileCoefficients || {}),
      row.lifecycleStatus || 'ACTIVE', row.actorUserId || null,
    ],
  );
  return mapProduct(res.rows[0]);
}

export async function insertAttributeValue(row, client) {
  const run = runner(client);
  await run(
    `INSERT INTO product_attribute_values (id, product_id, attribute_definition_id, value_text, value_number, value_boolean, normalized_value)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
       value_text = EXCLUDED.value_text, value_number = EXCLUDED.value_number,
       value_boolean = EXCLUDED.value_boolean, normalized_value = EXCLUDED.normalized_value,
       updated_at = NOW()`,
    [row.id, row.productId, row.attributeDefinitionId, row.valueText, row.valueNumber, row.valueBoolean, row.normalizedValue],
  );
}

// Columns whose schema (productService.updateSchema) allows an EXPLICIT null
// (e.g. un-assign Brand, revert a display-name override) vs. simply "not
// provided in this patch". COALESCE cannot distinguish those two cases (null
// param would silently keep the old value), so the SET clause is built only
// from keys actually present on `patch` — same has-own-property convention
// used by the callers below (productService.updateProduct only forwards keys
// that were present in the parsed request body).
const NULLABLE_COLUMNS = {
  brandId: 'brand_id',
  displayNameOverride: 'display_name_override',
  baseUomId: 'base_uom_id',
  salesUomId: 'sales_uom_id',
  purchaseUomId: 'purchase_uom_id',
};
const NON_NULLABLE_COLUMNS = {
  weightProfileType: 'weight_profile_type',
};

export async function update(id, patch, actorUserId, client = null) {
  const run = runner(client);
  const sets = [];
  const params = [id];

  for (const [key, column] of Object.entries(NULLABLE_COLUMNS)) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      params.push(patch[key] ?? null);
      sets.push(`${column} = $${params.length}`);
    }
  }
  for (const [key, column] of Object.entries(NON_NULLABLE_COLUMNS)) {
    if (Object.prototype.hasOwnProperty.call(patch, key) && patch[key] !== null && patch[key] !== undefined) {
      params.push(patch[key]);
      sets.push(`${column} = $${params.length}`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'weightProfileCoefficients') && patch.weightProfileCoefficients !== undefined) {
    params.push(JSON.stringify(patch.weightProfileCoefficients ?? {}));
    sets.push(`weight_profile_coefficients = $${params.length}::jsonb`);
  }

  params.push(actorUserId || null);
  sets.push(`updated_by = $${params.length}`);
  sets.push(`updated_at = NOW()`);

  const res = await run(
    `UPDATE products SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return res.rows[0] ? mapProduct(res.rows[0]) : null;
}

export async function setLifecycle(id, status, actorUserId, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE products SET
      lifecycle_status = $2,
      deactivated_at = CASE WHEN $2 = 'INACTIVE' THEN NOW() ELSE NULL END,
      deactivated_by = CASE WHEN $2 = 'INACTIVE' THEN $3 ELSE NULL END,
      updated_by = $3,
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status, actorUserId || null],
  );
  return res.rows[0] ? mapProduct(res.rows[0]) : null;
}

export default {
  findById, findBySku, findByCanonicalIdentityKey, search, listAttributeValues,
  create, insertAttributeValue, update, setLifecycle,
};
