/**
 * Product Relationship repository (Vitrin-owned, DDL-24). SQL only.
 */
import { query } from '../db/pool.js';

function mapRow(row) {
  return {
    id: row.id,
    sourceProductId: row.source_product_id,
    targetProductId: row.target_product_id,
    relationshipType: row.relationship_type,
    conversionNumerator: row.conversion_numerator === null ? null : Number(row.conversion_numerator),
    conversionDenominator: row.conversion_denominator === null ? null : Number(row.conversion_denominator),
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

function runner(client) {
  return client ? client.query.bind(client) : query;
}

export async function listForProduct(productId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT * FROM product_relationships
     WHERE (source_product_id = $1 OR target_product_id = $1) AND is_active = true
     ORDER BY created_at DESC`,
    [productId],
  );
  return res.rows.map(mapRow);
}

export async function findExisting(sourceProductId, targetProductId, relationshipType, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT * FROM product_relationships
     WHERE source_product_id = $1 AND target_product_id = $2 AND relationship_type = $3`,
    [sourceProductId, targetProductId, relationshipType],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO product_relationships (
       id, source_product_id, target_product_id, relationship_type,
       conversion_numerator, conversion_denominator, notes, is_active, created_by, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
     RETURNING *`,
    [
      row.id, row.sourceProductId, row.targetProductId, row.relationshipType,
      row.conversionNumerator ?? null, row.conversionDenominator ?? null, row.notes || null,
      row.isActive ?? true, row.actorUserId || null,
    ],
  );
  return mapRow(res.rows[0]);
}

export async function deactivate(id, actorUserId, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE product_relationships SET is_active = false, updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, actorUserId || null],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export default { listForProduct, findExisting, create, deactivate };
