/**
 * Product / SKU repository (Vitrin-owned, DDL-24). SQL only. No Zod/RBAC/HTTP.
 */
import { query } from '../../../db/pool.js';

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
    countUnitId: row.base_uom_id,
    salesUnitId: row.sales_uom_id,
    unitWeight: row.unit_weight == null ? null : Number(row.unit_weight),
    customLengthAllowed: Boolean(row.custom_length_allowed),
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
  const res = await run(
    `${BASE_SELECT} ${where}
     ORDER BY (
       SELECT pav.value_number
       FROM product_attribute_values pav
       JOIN attribute_definitions ad ON ad.id = pav.attribute_definition_id
       WHERE pav.product_id = p.id
         AND ad.code IN ('size', 'size_pipe')
         AND pav.value_number IS NOT NULL
       ORDER BY CASE ad.code WHEN 'size_pipe' THEN 0 ELSE 1 END
       LIMIT 1
     ) ASC NULLS LAST, p.generated_name ASC
     LIMIT ${limit}`,
    params,
  );
  return res.rows.map(mapProduct);
}

export async function listAttributeValues(productId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT pav.*, ad.code AS attribute_code, ad.name_fa AS attribute_name_fa, ad.data_type
     FROM product_attribute_values pav
     JOIN attribute_definitions ad ON ad.id = pav.attribute_definition_id
     WHERE pav.product_id = $1
     ORDER BY ad.code ASC`,
    [productId],
  );
  return res.rows.map(mapAttributeValue);
}

export async function listAttributeValuesForProducts(productIds, client = null) {
  if (!productIds?.length) return [];
  const run = runner(client);
  const res = await run(
    `SELECT pav.*, ad.code AS attribute_code, ad.name_fa AS attribute_name_fa, ad.data_type
     FROM product_attribute_values pav
     JOIN attribute_definitions ad ON ad.id = pav.attribute_definition_id
     WHERE pav.product_id = ANY($1::text[])
     ORDER BY pav.product_id ASC, ad.code ASC`,
    [productIds],
  );
  return res.rows.map(mapAttributeValue);
}

function mapAllowedAttributeValue(row) {
  return {
    productId: row.product_id,
    attributeDefinitionId: row.attribute_definition_id,
    value: row.value,
    attributeCode: row.attribute_code,
    attributeNameFa: row.attribute_name_fa,
  };
}

const ALLOWED_VALUE_SELECT = `
  SELECT paav.product_id, paav.attribute_definition_id, paav.value,
         ad.code AS attribute_code, ad.name_fa AS attribute_name_fa
  FROM product_allowed_attribute_values paav
  JOIN attribute_definitions ad ON ad.id = paav.attribute_definition_id
`;

export async function listAllowedAttributeValues(productId, client = null) {
  const run = runner(client);
  const res = await run(
    `${ALLOWED_VALUE_SELECT} WHERE paav.product_id = $1 ORDER BY ad.code ASC, paav.value ASC`,
    [productId],
  );
  return res.rows.map(mapAllowedAttributeValue);
}

export async function listAllowedAttributeValuesForProducts(productIds, client = null) {
  if (!productIds?.length) return [];
  const run = runner(client);
  const res = await run(
    `${ALLOWED_VALUE_SELECT} WHERE paav.product_id = ANY($1::text[]) ORDER BY paav.product_id ASC, ad.code ASC, paav.value ASC`,
    [productIds],
  );
  return res.rows.map(mapAllowedAttributeValue);
}

export async function replaceAllowedAttributeValues(productId, attributeDefinitionId, values, client = null) {
  const run = runner(client);
  await run(
    `DELETE FROM product_allowed_attribute_values
     WHERE product_id = $1 AND attribute_definition_id = $2`,
    [productId, attributeDefinitionId],
  );
  for (const value of values) {
    await run(
      `INSERT INTO product_allowed_attribute_values (product_id, attribute_definition_id, value)
       VALUES ($1, $2, $3)`,
      [productId, attributeDefinitionId, value],
    );
  }
}

export async function create(row, client) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO products (
       id, sku, product_type_id, brand_id, generated_name, display_name_override,
       canonical_identity_key, base_uom_id, sales_uom_id, purchase_uom_id,
       unit_weight, custom_length_allowed,
       weight_profile_type, weight_profile_coefficients, lifecycle_status, created_by, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$16)
     RETURNING *`,
    [
      row.id, row.sku, row.productTypeId, row.brandId || null, row.generatedName, row.displayNameOverride || null,
      row.canonicalIdentityKey, row.baseUomId || null, row.salesUomId || null, row.purchaseUomId || null,
      row.unitWeight ?? null, row.customLengthAllowed ?? false,
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
  unitWeight: 'unit_weight',
};
const NON_NULLABLE_COLUMNS = {
  weightProfileType: 'weight_profile_type',
  customLengthAllowed: 'custom_length_allowed',
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

export async function listByProductType(productTypeId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT id, sku, COALESCE(NULLIF(display_name_override, ''), generated_name) AS name, lifecycle_status
     FROM products WHERE product_type_id = $1 ORDER BY sku ASC`,
    [productTypeId],
  );
  return res.rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    lifecycleStatus: row.lifecycle_status,
  }));
}

export async function listByBrand(brandId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT id, sku, COALESCE(NULLIF(display_name_override, ''), generated_name) AS name
     FROM products WHERE brand_id = $1 ORDER BY sku ASC`,
    [brandId],
  );
  return res.rows.map((row) => ({ id: row.id, sku: row.sku, name: row.name }));
}

export async function listByUom(uomId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT DISTINCT id, sku, COALESCE(NULLIF(display_name_override, ''), generated_name) AS name
     FROM products
     WHERE base_uom_id = $1 OR sales_uom_id = $1 OR purchase_uom_id = $1
     ORDER BY sku ASC`,
    [uomId],
  );
  return res.rows.map((row) => ({ id: row.id, sku: row.sku, name: row.name }));
}

export async function listByAttributeDefinition(attributeDefinitionId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT DISTINCT p.id, p.sku, COALESCE(NULLIF(p.display_name_override, ''), p.generated_name) AS name
     FROM products p
     WHERE p.id IN (
       SELECT product_id FROM product_attribute_values WHERE attribute_definition_id = $1
       UNION
       SELECT product_id FROM product_allowed_attribute_values WHERE attribute_definition_id = $1
     )
     ORDER BY p.sku ASC`,
    [attributeDefinitionId],
  );
  return res.rows.map((row) => ({ id: row.id, sku: row.sku, name: row.name }));
}

export async function listByTypeAndAttributeDefinition(productTypeId, attributeDefinitionId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT DISTINCT p.id, p.sku, COALESCE(NULLIF(p.display_name_override, ''), p.generated_name) AS name
     FROM products p
     WHERE p.product_type_id = $1
       AND p.id IN (
         SELECT product_id FROM product_attribute_values WHERE attribute_definition_id = $2
         UNION
         SELECT product_id FROM product_allowed_attribute_values WHERE attribute_definition_id = $2
       )
     ORDER BY p.sku ASC`,
    [productTypeId, attributeDefinitionId],
  );
  return res.rows.map((row) => ({ id: row.id, sku: row.sku, name: row.name }));
}

export async function deleteSkuCounter(productTypeId, client = null) {
  const run = runner(client);
  await run(`DELETE FROM product_sku_counters WHERE product_type_id = $1`, [productTypeId]);
}

export async function remove(id, client = null) {
  const run = runner(client);
  const res = await run(`DELETE FROM products WHERE id = $1 RETURNING id`, [id]);
  return res.rowCount > 0;
}

export async function setGeneratedName(id, generatedName, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE products SET generated_name = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, generatedName],
  );
  return res.rows[0] ? mapProduct(res.rows[0]) : null;
}

export async function setCanonicalIdentityKey(id, canonicalIdentityKey, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE products SET canonical_identity_key = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, canonicalIdentityKey],
  );
  return res.rows[0] ? mapProduct(res.rows[0]) : null;
}

export async function listTextValuesForDefinition(attributeDefinitionId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT product_id, value_text
     FROM product_attribute_values
     WHERE attribute_definition_id = $1 AND value_text IS NOT NULL`,
    [attributeDefinitionId],
  );
  return res.rows.map((row) => ({ productId: row.product_id, valueText: row.value_text }));
}

export async function listAllowedValuesForDefinition(attributeDefinitionId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT product_id, value
     FROM product_allowed_attribute_values
     WHERE attribute_definition_id = $1`,
    [attributeDefinitionId],
  );
  return res.rows.map((row) => ({ productId: row.product_id, value: row.value }));
}

export async function deleteAttributeValuesMatching({ productTypeId, attributeDefinitionId, valueText }, client = null) {
  const run = runner(client);
  const res = await run(
    `DELETE FROM product_attribute_values pav
     USING products p
     WHERE pav.product_id = p.id
       AND p.product_type_id = $1
       AND pav.attribute_definition_id = $2
       AND pav.value_text = $3
     RETURNING pav.id`,
    [productTypeId, attributeDefinitionId, valueText],
  );
  return res.rowCount;
}

export default {
  findById, findBySku, findByCanonicalIdentityKey, search, listAttributeValues,
  listAllowedAttributeValues, listAllowedAttributeValuesForProducts, replaceAllowedAttributeValues,
  create, insertAttributeValue, update, setLifecycle, setGeneratedName, setCanonicalIdentityKey,
  listTextValuesForDefinition, listAllowedValuesForDefinition,
  deleteAttributeValuesMatching,
  listByProductType, listByAttributeDefinition, listByTypeAndAttributeDefinition, listByUom, listByBrand,
  deleteSkuCounter, remove,
};
