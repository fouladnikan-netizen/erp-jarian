/**
 * Bulk Import batch bookkeeping repository (Vitrin-owned, DDL-24g). SQL only.
 */
import { query } from '../../../db/pool.js';

function mapRow(row) {
  return {
    id: row.id,
    mode: row.mode,
    totalRows: row.total_rows,
    acceptedRows: row.accepted_rows,
    rejectedRows: row.rejected_rows,
    rowResults: row.row_results,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

function runner(client) {
  return client ? client.query.bind(client) : query;
}

export async function create(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO product_bulk_import_batches (id, mode, total_rows, accepted_rows, rejected_rows, row_results, created_by)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
     RETURNING *`,
    [row.id, row.mode, row.totalRows, row.acceptedRows, row.rejectedRows, JSON.stringify(row.rowResults || []), row.actorUserId || null],
  );
  return mapRow(res.rows[0]);
}

export async function findById(id, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM product_bulk_import_batches WHERE id = $1`, [id]);
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function list({ limit = 20 } = {}, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM product_bulk_import_batches ORDER BY created_at DESC LIMIT $1`, [limit]);
  return res.rows.map(mapRow);
}

export default { create, findById, list };
