import { z } from 'zod';
import { query } from '../db/pool.js';
import { newEntityId, writeAudit } from '../lib/ids.js';

const createSchema = z.object({
  name: z.string().trim().min(1),
  entityType: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']).default('CUSTOMER'),
  nationalId: z.string().trim().optional().nullable(),
  province: z.string().trim().optional().nullable(),
  activityDomain: z.string().trim().optional().nullable(),
  lifecycleStage: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  assigneeName: z.string().trim().optional().nullable(),
  assigneeRole: z.string().trim().optional().nullable(),
  payload: z.record(z.string(), z.any()).optional(),
});

const updateSchema = createSchema.partial();

function mapCompany(row) {
  return {
    id: row.id,
    name: row.name,
    entityType: row.entity_type,
    nationalId: row.national_id,
    province: row.province,
    activityDomain: row.activity_domain,
    lifecycleStage: row.lifecycle_stage,
    phone: row.phone,
    assignee: row.assignee_name
      ? { name: row.assignee_name, role: row.assignee_role }
      : null,
    payload: row.payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCompanies({ q, entityType, limit = 50, offset = 0 } = {}) {
  const clauses = [];
  const params = [];
  let i = 1;

  if (q) {
    clauses.push(`(name ILIKE $${i} OR COALESCE(national_id, '') ILIKE $${i})`);
    params.push(`%${q}%`);
    i += 1;
  }
  if (entityType) {
    clauses.push(`(entity_type = $${i} OR entity_type = 'BOTH')`);
    params.push(entityType);
    i += 1;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(Math.min(Number(limit) || 50, 200), Number(offset) || 0);

  const res = await query(
    `SELECT * FROM companies ${where}
     ORDER BY updated_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params,
  );
  return res.rows.map(mapCompany);
}

export async function getCompany(id) {
  const res = await query(`SELECT * FROM companies WHERE id = $1`, [id]);
  if (!res.rows[0]) {
    const err = new Error('شرکت یافت نشد.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const persons = await query(
    `SELECT id, full_name, mobile, role_title, payload
     FROM contact_persons WHERE company_id = $1 ORDER BY full_name`,
    [id],
  );

  return {
    ...mapCompany(res.rows[0]),
    persons: persons.rows.map((p) => ({
      id: p.id,
      fullName: p.full_name,
      mobile: p.mobile,
      roleTitle: p.role_title,
      payload: p.payload,
    })),
  };
}

export async function createCompany(body, actorUserId) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const err = new Error('داده‌های شرکت نامعتبر است.');
    err.status = 400;
    err.code = 'VALIDATION';
    err.details = parsed.error.flatten();
    throw err;
  }

  const data = parsed.data;
  const id = newEntityId('co');
  await query(
    `INSERT INTO companies (
      id, name, entity_type, national_id, province, activity_domain,
      lifecycle_stage, phone, assignee_name, assignee_role, payload, created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$12)`,
    [
      id,
      data.name,
      data.entityType,
      data.nationalId || null,
      data.province || null,
      data.activityDomain || null,
      data.lifecycleStage || null,
      data.phone || null,
      data.assigneeName || null,
      data.assigneeRole || null,
      JSON.stringify(data.payload || {}),
      actorUserId,
    ],
  );

  await writeAudit({
    actorUserId,
    action: 'company.create',
    entityType: 'company',
    entityId: id,
    detail: { name: data.name },
  });

  return getCompany(id);
}

export async function updateCompany(id, body, actorUserId) {
  const existing = await query(`SELECT id FROM companies WHERE id = $1`, [id]);
  if (!existing.rows[0]) {
    const err = new Error('شرکت یافت نشد.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    const err = new Error('داده‌های شرکت نامعتبر است.');
    err.status = 400;
    err.code = 'VALIDATION';
    err.details = parsed.error.flatten();
    throw err;
  }

  const data = parsed.data;
  await query(
    `UPDATE companies SET
      name = COALESCE($2, name),
      entity_type = COALESCE($3, entity_type),
      national_id = COALESCE($4, national_id),
      province = COALESCE($5, province),
      activity_domain = COALESCE($6, activity_domain),
      lifecycle_stage = COALESCE($7, lifecycle_stage),
      phone = COALESCE($8, phone),
      assignee_name = COALESCE($9, assignee_name),
      assignee_role = COALESCE($10, assignee_role),
      payload = COALESCE($11::jsonb, payload),
      updated_by = $12,
      updated_at = NOW()
     WHERE id = $1`,
    [
      id,
      data.name ?? null,
      data.entityType ?? null,
      data.nationalId ?? null,
      data.province ?? null,
      data.activityDomain ?? null,
      data.lifecycleStage ?? null,
      data.phone ?? null,
      data.assigneeName ?? null,
      data.assigneeRole ?? null,
      data.payload ? JSON.stringify(data.payload) : null,
      actorUserId,
    ],
  );

  await writeAudit({
    actorUserId,
    action: 'company.update',
    entityType: 'company',
    entityId: id,
  });

  return getCompany(id);
}
