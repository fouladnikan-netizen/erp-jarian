import { z } from 'zod';
import { query } from '../db/pool.js';
import { newEntityId, writeAudit } from '../lib/ids.js';

const createSchema = z.object({
  code: z.string().trim().min(1).optional(),
  companyId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().optional().nullable(),
  stageId: z.string().trim().default('inquiry'),
  status: z.string().trim().default('open'),
  payload: z.record(z.string(), z.any()).optional(),
});

const updateSchema = z.object({
  companyId: z.string().trim().optional().nullable(),
  title: z.string().trim().optional().nullable(),
  stageId: z.string().trim().optional(),
  status: z.string().trim().optional(),
  payload: z.record(z.string(), z.any()).optional(),
  version: z.number().int().positive().optional(),
});

function mapOrder(row) {
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

async function nextOrderCode() {
  const res = await query(
    `SELECT COUNT(*)::int AS n FROM orders WHERE code LIKE 'JR-%'`,
  );
  const n = (res.rows[0]?.n || 0) + 1;
  return `JR-${String(n).padStart(6, '0')}`;
}

export async function listOrders({ q, companyId, stageId, status, limit = 50, offset = 0 } = {}) {
  const clauses = [];
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

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(Math.min(Number(limit) || 50, 200), Number(offset) || 0);

  const res = await query(
    `SELECT * FROM orders ${where}
     ORDER BY updated_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params,
  );
  return res.rows.map(mapOrder);
}

export async function getOrder(id) {
  const res = await query(`SELECT * FROM orders WHERE id = $1 OR code = $1`, [id]);
  if (!res.rows[0]) {
    const err = new Error('سفارش یافت نشد.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return mapOrder(res.rows[0]);
}

export async function createOrder(body, actorUserId) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const err = new Error('داده‌های سفارش نامعتبر است.');
    err.status = 400;
    err.code = 'VALIDATION';
    err.details = parsed.error.flatten();
    throw err;
  }

  const data = parsed.data;
  if (data.companyId) {
    const company = await query(`SELECT id FROM companies WHERE id = $1`, [data.companyId]);
    if (!company.rows[0]) {
      const err = new Error('شرکت سفارش یافت نشد.');
      err.status = 400;
      err.code = 'INVALID_COMPANY';
      throw err;
    }
  }

  const id = newEntityId('ord');
  const code = data.code || (await nextOrderCode());

  await query(
    `INSERT INTO orders (
      id, code, company_id, title, stage_id, status, payload, created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$8)`,
    [
      id,
      code,
      data.companyId || null,
      data.title || null,
      data.stageId,
      data.status,
      JSON.stringify(data.payload || {}),
      actorUserId,
    ],
  );

  await writeAudit({
    actorUserId,
    action: 'order.create',
    entityType: 'order',
    entityId: id,
    detail: { code },
  });

  return getOrder(id);
}

export async function updateOrder(id, body, actorUserId) {
  const current = await query(`SELECT * FROM orders WHERE id = $1 OR code = $1`, [id]);
  const row = current.rows[0];
  if (!row) {
    const err = new Error('سفارش یافت نشد.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    const err = new Error('داده‌های سفارش نامعتبر است.');
    err.status = 400;
    err.code = 'VALIDATION';
    err.details = parsed.error.flatten();
    throw err;
  }

  const data = parsed.data;
  if (data.version != null && data.version !== row.version) {
    const err = new Error('نسخه سفارش تغییر کرده است. دوباره بارگذاری کنید.');
    err.status = 409;
    err.code = 'VERSION_CONFLICT';
    throw err;
  }

  await query(
    `UPDATE orders SET
      company_id = COALESCE($2, company_id),
      title = COALESCE($3, title),
      stage_id = COALESCE($4, stage_id),
      status = COALESCE($5, status),
      payload = COALESCE($6::jsonb, payload),
      version = version + 1,
      updated_by = $7,
      updated_at = NOW()
     WHERE id = $1`,
    [
      row.id,
      data.companyId === undefined ? null : data.companyId,
      data.title === undefined ? null : data.title,
      data.stageId ?? null,
      data.status ?? null,
      data.payload ? JSON.stringify(data.payload) : null,
      actorUserId,
    ],
  );

  await writeAudit({
    actorUserId,
    action: 'order.update',
    entityType: 'order',
    entityId: row.id,
    detail: { stageId: data.stageId, status: data.status },
  });

  return getOrder(row.id);
}
