/**
 * Raw Lead PostgreSQL adapter — SQL only. No Zod / RBAC / HTTP.
 */
import { query } from '../db/pool.js';
import { activeLeadWhere } from '../db/activeScope.js';

export function mapLeadRow(row) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  return {
    id: row.id,
    companyName: row.company_name,
    personName: row.person_name,
    mobile: row.mobile,
    leadSource: row.lead_source,
    description: row.description,
    activityDomain: row.activity_domain,
    status: row.status,
    pipelineStageId: row.pipeline_stage_id || null,
    archiveReason: row.archive_reason || null,
    convertedCompanyId: row.converted_company_id,
    convertedAt: row.converted_at,
    convertedBy: row.converted_by,
    payload,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
  };
}

/**
 * @param {import('pg').PoolClient | null} client
 */
function runner(client) {
  return client ? client.query.bind(client) : query;
}

export async function list({
  q, status, leadSource, convertedCompanyId, createdBy, pipelineStageId,
  openOnly = false, limit = 50, offset = 0, includeArchived = false,
} = {}, client = null) {
  const run = runner(client);
  const clauses = [includeArchived ? 'TRUE' : activeLeadWhere()];
  const params = [];
  let i = 1;

  if (q) {
    clauses.push(
      `(company_name ILIKE $${i} OR COALESCE(person_name, '') ILIKE $${i} OR COALESCE(mobile, '') ILIKE $${i})`,
    );
    params.push(`%${q}%`);
    i += 1;
  }
  if (status) {
    clauses.push(`status = $${i}`);
    params.push(status);
    i += 1;
  }
  if (openOnly) {
    clauses.push(`status IN ('NEW', 'QUALIFYING')`);
  }
  if (leadSource) {
    clauses.push(`lead_source = $${i}`);
    params.push(leadSource);
    i += 1;
  }
  if (convertedCompanyId) {
    clauses.push(`converted_company_id = $${i}`);
    params.push(String(convertedCompanyId));
    i += 1;
  }
  if (createdBy) {
    clauses.push(`created_by = $${i}`);
    params.push(String(createdBy));
    i += 1;
  }
  if (pipelineStageId) {
    clauses.push(`pipeline_stage_id = $${i}`);
    params.push(String(pipelineStageId));
    i += 1;
  }

  const where = `WHERE ${clauses.join(' AND ')}`;
  params.push(Math.min(Number(limit) || 50, 200), Number(offset) || 0);

  const orderBy = convertedCompanyId
    ? 'ORDER BY COALESCE(converted_at, created_at) ASC, created_at ASC'
    : 'ORDER BY updated_at DESC';

  const res = await run(
    `SELECT * FROM raw_leads ${where}
     ${orderBy}
     LIMIT $${i} OFFSET $${i + 1}`,
    params,
  );
  return res.rows.map(mapLeadRow);
}

export async function findById(id, { includeArchived = false } = {}, client = null) {
  const run = runner(client);
  const activeClause = includeArchived ? '' : ` AND ${activeLeadWhere()}`;
  const res = await run(`SELECT * FROM raw_leads WHERE id = $1${activeClause}`, [id]);
  return res.rows[0] ? mapLeadRow(res.rows[0]) : null;
}

export async function create(row, client = null) {
  const run = runner(client);
  await run(
    `INSERT INTO raw_leads (
      id, company_name, person_name, mobile, lead_source, description, activity_domain,
      status, pipeline_stage_id, payload, created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$11)`,
    [
      row.id,
      row.companyName,
      row.personName || null,
      row.mobile || null,
      row.leadSource || null,
      row.description || null,
      row.activityDomain || null,
      row.status || 'NEW',
      row.pipelineStageId || null,
      JSON.stringify(row.payload || {}),
      row.actorUserId,
    ],
  );
}

export async function update(id, data, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE raw_leads SET
      company_name = COALESCE($2, company_name),
      person_name = COALESCE($3, person_name),
      mobile = COALESCE($4, mobile),
      lead_source = COALESCE($5, lead_source),
      description = COALESCE($6, description),
      activity_domain = COALESCE($7, activity_domain),
      payload = COALESCE($8::jsonb, payload),
      updated_by = $9,
      updated_at = NOW()
     WHERE id = $1 AND ${activeLeadWhere()}`,
    [
      id,
      data.companyName ?? null,
      data.personName ?? null,
      data.mobile ?? null,
      data.leadSource ?? null,
      data.description ?? null,
      data.activityDomain ?? null,
      data.payload ? JSON.stringify(data.payload) : null,
      actorUserId,
    ],
  );
}

export async function updateStatus(id, status, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE raw_leads SET status = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 AND ${activeLeadWhere()}`,
    [id, status, actorUserId],
  );
}

export async function archive(id, actorUserId, { reason = null } = {}, client = null) {
  const run = runner(client);
  await run(
    `UPDATE raw_leads SET
      deleted_at = NOW(),
      deleted_by = $2,
      archive_reason = COALESCE($3, archive_reason),
      updated_at = NOW()
     WHERE id = $1 AND ${activeLeadWhere()}`,
    [id, actorUserId, reason],
  );
}

export async function updatePipelineStage(id, pipelineStageId, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE raw_leads SET
      pipeline_stage_id = $2,
      updated_by = $3,
      updated_at = NOW()
     WHERE id = $1 AND ${activeLeadWhere()}`,
    [id, pipelineStageId, actorUserId],
  );
}

/**
 * Mark lead converted — must run inside conversion transaction.
 */
export async function markConverted(id, {
  companyId, actorUserId, status = 'CONVERTED',
} = {}, client = null) {
  const run = runner(client);
  await run(
    `UPDATE raw_leads SET
      status = $2,
      converted_company_id = $3,
      converted_at = NOW(),
      converted_by = $4,
      updated_by = $4,
      updated_at = NOW()
     WHERE id = $1 AND ${activeLeadWhere()}`,
    [id, status, companyId, actorUserId],
  );
}

/**
 * Company name / nationalId suggestions for Lead duplicate detection.
 * SQL lives here so Lead service does not own Company SQL ad-hoc elsewhere.
 */
export async function findPotentialCompanyMatches(q, { limit = 10 } = {}, client = null) {
  const run = runner(client);
  const term = String(q || '').trim();
  if (!term) return [];
  const res = await run(
    `SELECT id, name, national_id, entity_type, activity_domain, updated_at
     FROM companies
     WHERE deleted_at IS NULL
       AND (name ILIKE $1 OR COALESCE(national_id, '') ILIKE $1)
     ORDER BY updated_at DESC
     LIMIT $2`,
    [`%${term}%`, Math.min(Number(limit) || 10, 25)],
  );
  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    nationalId: row.national_id,
    entityType: row.entity_type,
    activityDomain: row.activity_domain,
    updatedAt: row.updated_at,
  }));
}

