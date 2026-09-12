/**
 * Order PostgreSQL adapter — SQL only. No Zod / RBAC / HTTP.
 */
import { query } from '../db/pool.js';
import { activeOrderWhere } from '../db/activeScope.js';
import {
  formatJarianOrderCode,
  jalaliDayKey,
  jalaliPartsFromInstant,
} from '../domain/order/jarianOrderCode.js';

export function mapOrderRow(row) {
  return {
    id: row.id,
    code: row.code,
    companyId: row.company_id,
    title: row.title,
    stageId: row.stage_id,
    status: row.status,
    payload: row.payload,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * @param {import('pg').PoolClient | null} client
 */
function runner(client) {
  return client ? client.query.bind(client) : query;
}

/**
 * Canonical next order code (DDL-27): JR-{Y}{MM}{DD}{NN}, daily Jalali serial.
 * @param {import('pg').PoolClient | null} client
 * @param {{ year: number, month: number, day: number } | null} [jalaliParts]
 */
export async function nextOrderCode(client = null, jalaliParts = null) {
  const run = runner(client);
  const parts = jalaliParts || jalaliPartsFromInstant(new Date());
  const dayKey = jalaliDayKey(parts);

  for (let attempt = 0; attempt < 99; attempt += 1) {
    const counterRes = await run(
      `INSERT INTO order_code_daily_counters (jalali_date, next_seq)
       VALUES ($1, 2)
       ON CONFLICT (jalali_date)
       DO UPDATE SET next_seq = order_code_daily_counters.next_seq + 1, updated_at = NOW()
       RETURNING next_seq`,
      [dayKey],
    );
    const sequence = (counterRes.rows[0]?.next_seq || 1) - 1;
    const code = formatJarianOrderCode({ ...parts, sequence });
    const taken = await run(
      `SELECT 1 FROM orders WHERE code = $1 LIMIT 1`,
      [code],
    );
    if (!taken.rows.length) return code;
  }

  throw new Error('ORDER_CODE_DAY_EXHAUSTED');
}

export async function findMany({
  q, companyId, stageId, status, limit = 50, offset = 0, includeArchived = false,
} = {}, client = null) {
  const run = runner(client);
  const clauses = [includeArchived ? 'TRUE' : activeOrderWhere()];
  const params = [];
  let i = 1;

  if (q) {
    clauses.push(`(code ILIKE $${i} OR COALESCE(title, '') ILIKE $${i})`);
    params.push(`%${q}%`);
    i += 1;
  }
  if (companyId) {
    clauses.push(`company_id = $${i}`);
    params.push(companyId);
    i += 1;
  }
  if (stageId) {
    clauses.push(`stage_id = $${i}`);
    params.push(stageId);
    i += 1;
  }
  if (status) {
    clauses.push(`status = $${i}`);
    params.push(status);
    i += 1;
  }

  const where = `WHERE ${clauses.join(' AND ')}`;
  params.push(Math.min(Number(limit) || 50, 200), Number(offset) || 0);

  const res = await run(
    `SELECT * FROM orders ${where}
     ORDER BY updated_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params,
  );
  return res.rows.map(mapOrderRow);
}

export async function findByIdOrCode(idOrCode, { includeArchived = false } = {}, client = null) {
  const run = runner(client);
  const activeClause = includeArchived ? '' : ` AND ${activeOrderWhere()}`;
  const res = await run(
    `SELECT * FROM orders WHERE (id = $1 OR code = $1)${activeClause}`,
    [idOrCode],
  );
  return res.rows[0] ? mapOrderRow(res.rows[0]) : null;
}

/** Raw row including version for optimistic lock checks */
export async function findRawActive(idOrCode, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT * FROM orders WHERE (id = $1 OR code = $1) AND ${activeOrderWhere()}`,
    [idOrCode],
  );
  return res.rows[0] || null;
}

export async function companyExistsActive(companyId, client = null) {
  const run = runner(client);
  const company = await run(
    `SELECT id FROM companies WHERE id = $1 AND deleted_at IS NULL`,
    [companyId],
  );
  return Boolean(company.rows[0]);
}

export async function insert(row, client = null) {
  const run = runner(client);
  await run(
    `INSERT INTO orders (
      id, code, company_id, title, stage_id, status, payload, created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$8)`,
    [
      row.id,
      row.code,
      row.companyId || null,
      row.title || null,
      row.stageId,
      row.status,
      JSON.stringify(row.payload || {}),
      row.actorUserId,
    ],
  );
}

/**
 * Optimistic lock: UPDATE … WHERE id + version. Returns rows affected (0 = stale/missing).
 * On success, version becomes expectedVersion + 1.
 */
export async function update(id, data, actorUserId, expectedVersion, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE orders SET
      company_id = COALESCE($2, company_id),
      title = COALESCE($3, title),
      stage_id = COALESCE($4, stage_id),
      status = COALESCE($5, status),
      payload = COALESCE($6::jsonb, payload),
      version = version + 1,
      updated_by = $7,
      updated_at = NOW()
     WHERE id = $1 AND version = $8 AND ${activeOrderWhere()}`,
    [
      id,
      data.companyId === undefined ? null : data.companyId,
      data.title === undefined ? null : data.title,
      data.stageId ?? null,
      data.status ?? null,
      data.payload ? JSON.stringify(data.payload) : null,
      actorUserId,
      expectedVersion,
    ],
  );
  return res.rowCount ?? 0;
}

export async function softDelete(id, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE orders SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
     WHERE id = $1 AND ${activeOrderWhere()}`,
    [id, actorUserId],
  );
}

/**
 * Nabz has no product_id FK. Scan fat-document line items, including archived
 * orders (DDL-24n). Matches payload.items[].productId or snapshot sku.
 */
export async function findOrdersReferencingProduct({ productId, sku = null } = {}, client = null) {
  if (!productId && !sku) return [];
  const run = runner(client);
  const res = await run(
    `SELECT id, code
     FROM orders
     WHERE jsonb_typeof(COALESCE(payload->'items', '[]'::jsonb)) = 'array'
       AND EXISTS (
         SELECT 1
         FROM jsonb_array_elements(COALESCE(payload->'items', '[]'::jsonb)) AS item
         WHERE ($1::text IS NOT NULL AND item->>'productId' = $1)
            OR ($2::text IS NOT NULL AND $2 <> '' AND item->>'sku' = $2)
       )
     ORDER BY created_at DESC`,
    [productId || null, sku || null],
  );
  return res.rows.map((row) => ({ id: row.id, code: row.code, name: row.code }));
}
