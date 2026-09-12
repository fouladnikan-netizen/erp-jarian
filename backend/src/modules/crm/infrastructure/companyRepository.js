/**
 * Company PostgreSQL adapter — SQL only. No Zod / RBAC / HTTP.
 */
import { query } from '../../../db/pool.js';
import { activeCompanyWhere } from '../../../db/activeScope.js';

export function mapCompanyRow(row) {
  return {
    id: row.id,
    name: row.name,
    entityType: row.entity_type,
    nationalId: row.national_id,
    province: row.province,
    activityDomain: row.activity_domain,
    lifecycleStage: row.lifecycle_stage,
    engagementStatus: row.engagement_status || row.payload?.engagementStatus || 'normal',
    phone: row.phone,
    assignee: row.assignee_name
      ? { name: row.assignee_name, role: row.assignee_role }
      : null,
    payload: row.payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPersonRow(p) {
  return {
    id: p.id,
    fullName: p.full_name,
    mobile: p.mobile,
    roleTitle: p.role_title,
    payload: p.payload,
  };
}

/**
 * @param {import('pg').PoolClient | null} client
 */
function runner(client) {
  return client ? client.query.bind(client) : query;
}

export async function findMany({
  q, entityType, limit = 50, offset = 0, includeArchived = false,
} = {}, client = null) {
  const run = runner(client);
  const clauses = [includeArchived ? 'TRUE' : activeCompanyWhere()];
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

  const where = `WHERE ${clauses.join(' AND ')}`;
  params.push(Math.min(Number(limit) || 50, 200), Number(offset) || 0);

  const res = await run(
    `SELECT * FROM companies ${where}
     ORDER BY updated_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params,
  );
  return res.rows.map(mapCompanyRow);
}

export async function findById(id, { includeArchived = false } = {}, client = null) {
  const run = runner(client);
  const activeClause = includeArchived ? '' : ` AND ${activeCompanyWhere()}`;
  const res = await run(`SELECT * FROM companies WHERE id = $1${activeClause}`, [id]);
  return res.rows[0] ? mapCompanyRow(res.rows[0]) : null;
}

export async function findPersonsByCompanyId(companyId, client = null) {
  const run = runner(client);
  const persons = await run(
    `SELECT id, full_name, mobile, role_title, payload
     FROM contact_persons WHERE company_id = $1 ORDER BY full_name`,
    [companyId],
  );
  return persons.rows.map(mapPersonRow);
}

export async function existsActive(id, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT id FROM companies WHERE id = $1 AND ${activeCompanyWhere()}`,
    [id],
  );
  return Boolean(res.rows[0]);
}

export async function findByNationalId(nationalId, client = null) {
  const run = runner(client);
  const cleaned = String(nationalId || '').replace(/\D/g, '');
  if (!cleaned) return null;
  const res = await run(
    `SELECT * FROM companies
     WHERE national_id = $1 AND ${activeCompanyWhere()}
     LIMIT 1`,
    [cleaned],
  );
  return res.rows[0] ? mapCompanyRow(res.rows[0]) : null;
}

/** Row lock for conversion / concurrent create by nationalId (DDL-25/26). */
export async function findByNationalIdForUpdate(nationalId, client = null) {
  const run = runner(client);
  const cleaned = String(nationalId || '').replace(/\D/g, '');
  if (!cleaned) return null;
  const res = await run(
    `SELECT * FROM companies
     WHERE national_id = $1 AND ${activeCompanyWhere()}
     FOR UPDATE LIMIT 1`,
    [cleaned],
  );
  return res.rows[0] ? mapCompanyRow(res.rows[0]) : null;
}

/** Name search for Lead → Company duplicate detection foundation */
export async function findPotentialMatchesForLead(q, { limit = 10 } = {}, client = null) {
  const run = runner(client);
  const term = String(q || '').trim();
  if (!term) return [];
  const res = await run(
    `SELECT * FROM companies
     WHERE ${activeCompanyWhere()}
       AND (name ILIKE $1 OR COALESCE(national_id, '') ILIKE $1)
     ORDER BY updated_at DESC
     LIMIT $2`,
    [`%${term}%`, Math.min(Number(limit) || 10, 25)],
  );
  return res.rows.map(mapCompanyRow);
}

export async function insertPerson(row, client = null) {
  throw new Error(
    'LEGACY_CONTACT_PERSONS_WRITE_DISABLED (DDL-26): use canonical Contact + CompanyContactRelationship',
  );
}

/**
 * Find Linka-sourced person by provider national code (idempotent upsert key).
 */
export async function findPersonByProviderNationalCode(companyId, nationalCode, client = null) {
  const run = runner(client);
  const code = String(nationalCode || '').replace(/\D/g, '');
  if (!code) return null;
  const res = await run(
    `SELECT id, full_name, mobile, role_title, payload
     FROM contact_persons
     WHERE company_id = $1
       AND (
         payload->>'providerNationalCode' = $2
         OR payload->'linkaIdentity'->>'nationalCode' = $2
       )
     LIMIT 1`,
    [companyId, code],
  );
  return res.rows[0] ? mapPersonRow(res.rows[0]) : null;
}

export async function updatePerson(id, data, client = null) {
  throw new Error(
    'LEGACY_CONTACT_PERSONS_WRITE_DISABLED (DDL-26): use canonical Contact + CompanyContactRelationship',
  );
}

export async function insert(row, client = null) {
  const run = runner(client);
  await run(
    `INSERT INTO companies (
      id, name, entity_type, national_id, province, activity_domain,
      lifecycle_stage, engagement_status, phone, assignee_name, assignee_role,
      payload, created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$13)`,
    [
      row.id,
      row.name,
      row.entityType,
      row.nationalId || null,
      row.province || null,
      row.activityDomain || null,
      row.lifecycleStage || null,
      row.engagementStatus || 'normal',
      row.phone || null,
      row.assigneeName || null,
      row.assigneeRole || null,
      JSON.stringify(row.payload || {}),
      row.actorUserId,
    ],
  );
}

export async function update(id, data, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE companies SET
      name = COALESCE($2, name),
      entity_type = COALESCE($3, entity_type),
      national_id = COALESCE($4, national_id),
      province = COALESCE($5, province),
      activity_domain = COALESCE($6, activity_domain),
      lifecycle_stage = COALESCE($7, lifecycle_stage),
      engagement_status = COALESCE($8, engagement_status),
      phone = COALESCE($9, phone),
      assignee_name = COALESCE($10, assignee_name),
      assignee_role = COALESCE($11, assignee_role),
      payload = COALESCE($12::jsonb, payload),
      updated_by = $13,
      updated_at = NOW()
     WHERE id = $1 AND ${activeCompanyWhere()}`,
    [
      id,
      data.name ?? null,
      data.entityType ?? null,
      data.nationalId ?? null,
      data.province ?? null,
      data.activityDomain ?? null,
      data.lifecycleStage ?? null,
      data.engagementStatus ?? null,
      data.phone ?? null,
      data.assigneeName ?? null,
      data.assigneeRole ?? null,
      data.payload ? JSON.stringify(data.payload) : null,
      actorUserId,
    ],
  );
}

export async function softDelete(id, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE companies SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
     WHERE id = $1 AND ${activeCompanyWhere()}`,
    [id, actorUserId],
  );
}
