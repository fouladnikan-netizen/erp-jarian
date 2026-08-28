/**
 * UOM Registry repository (Shirazeh-owned, DDL-24). SQL only.
 */
import { query } from '../db/pool.js';

function mapUom(row) {
  return {
    id: row.id,
    code: row.code,
    nameFa: row.name_fa,
    category: row.category,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapConversion(row) {
  return {
    id: row.id,
    fromUomId: row.from_uom_id,
    toUomId: row.to_uom_id,
    numerator: Number(row.numerator),
    denominator: Number(row.denominator),
    isExact: row.is_exact,
    notes: row.notes,
    isActive: row.is_active,
  };
}

function runner(client) {
  return client ? client.query.bind(client) : query;
}

export async function list({ includeInactive = true } = {}, client = null) {
  const run = runner(client);
  const where = includeInactive ? '' : 'WHERE is_active = true';
  const res = await run(`SELECT * FROM uom_registry ${where} ORDER BY category ASC, code ASC`);
  return res.rows.map(mapUom);
}

export async function findById(id, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM uom_registry WHERE id = $1`, [id]);
  return res.rows[0] ? mapUom(res.rows[0]) : null;
}

export async function findByCode(code, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM uom_registry WHERE code = $1`, [code]);
  return res.rows[0] ? mapUom(res.rows[0]) : null;
}

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO uom_registry (id, code, name_fa, category, is_active, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING *`,
    [row.id, row.code, row.nameFa, row.category || 'GENERIC', row.isActive ?? true, row.actorUserId || null],
  );
  return mapUom(res.rows[0]);
}

export async function update(id, patch, actorUserId, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE uom_registry SET
      name_fa = COALESCE($2, name_fa),
      category = COALESCE($3, category),
      is_active = COALESCE($4, is_active),
      updated_by = $5,
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, patch.nameFa ?? null, patch.category ?? null, patch.isActive ?? null, actorUserId || null],
  );
  return res.rows[0] ? mapUom(res.rows[0]) : null;
}

export async function listConversions({ fromUomId = null } = {}, client = null) {
  const run = runner(client);
  const clauses = [];
  const params = [];
  if (fromUomId) {
    params.push(fromUomId);
    clauses.push(`from_uom_id = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const res = await run(`SELECT * FROM uom_conversions ${where} ORDER BY created_at ASC`, params);
  return res.rows.map(mapConversion);
}

export async function findConversion(fromUomId, toUomId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT * FROM uom_conversions WHERE from_uom_id = $1 AND to_uom_id = $2 AND is_active = true`,
    [fromUomId, toUomId],
  );
  return res.rows[0] ? mapConversion(res.rows[0]) : null;
}

export async function createConversion(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO uom_conversions (id, from_uom_id, to_uom_id, numerator, denominator, is_exact, notes, is_active, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
     RETURNING *`,
    [
      row.id, row.fromUomId, row.toUomId, row.numerator, row.denominator ?? 1, row.isExact ?? true,
      row.notes || null, row.isActive ?? true, row.actorUserId || null,
    ],
  );
  return mapConversion(res.rows[0]);
}

export default { list, findById, findByCode, create, update, listConversions, findConversion, createConversion };
