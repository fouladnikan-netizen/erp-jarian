/**
 * CompanyContactRelationship PostgreSQL adapter — DDL-26.
 */
import { query } from '../db/pool.js';

function runner(client) {
  return client ? client.query.bind(client) : query;
}

const activeWhere = 'ended_at IS NULL';

export function mapRelationshipRow(row) {
  return {
    id: row.id,
    companyId: row.company_id,
    contactId: row.contact_id,
    roleTitle: row.role_title,
    isPrimary: row.is_primary,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    payload: row.payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findActiveByCompany(companyId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT r.*, c.full_name, c.mobile, c.email, c.mobile_normalized, c.full_name_normalized
     FROM company_contact_relationships r
     JOIN contacts c ON c.id = r.contact_id AND c.deleted_at IS NULL
     WHERE r.company_id = $1 AND r.${activeWhere}
     ORDER BY r.is_primary DESC, c.full_name`,
    [companyId],
  );
  return res.rows.map((row) => ({
    ...mapRelationshipRow(row),
    contact: {
      id: row.contact_id,
      fullName: row.full_name,
      mobile: row.mobile,
      email: row.email,
      mobileNormalized: row.mobile_normalized,
      fullNameNormalized: row.full_name_normalized,
    },
  }));
}

export async function findActiveByContact(contactId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT * FROM company_contact_relationships
     WHERE contact_id = $1 AND ${activeWhere}`,
    [contactId],
  );
  return res.rows.map(mapRelationshipRow);
}

export async function findActiveLink(companyId, contactId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT * FROM company_contact_relationships
     WHERE company_id = $1 AND contact_id = $2 AND ${activeWhere}
     LIMIT 1`,
    [companyId, contactId],
  );
  return res.rows[0] ? mapRelationshipRow(res.rows[0]) : null;
}

export async function findById(id, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT * FROM company_contact_relationships WHERE id = $1 LIMIT 1`,
    [id],
  );
  return res.rows[0] ? mapRelationshipRow(res.rows[0]) : null;
}

export async function update(id, data, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE company_contact_relationships SET
      role_title = COALESCE($2, role_title),
      updated_by = $3, updated_at = NOW()
     WHERE id = $1 AND ${activeWhere}`,
    [id, data.roleTitle ?? null, actorUserId],
  );
}

export async function insert(row, client = null) {
  const run = runner(client);
  if (row.isPrimary) {
    await run(
      `UPDATE company_contact_relationships SET is_primary = FALSE, updated_at = NOW()
       WHERE company_id = $1 AND ${activeWhere} AND is_primary = TRUE`,
      [row.companyId],
    );
  }
  await run(
    `INSERT INTO company_contact_relationships (
      id, company_id, contact_id, role_title, is_primary, payload, created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$7)`,
    [
      row.id,
      row.companyId,
      row.contactId,
      row.roleTitle || null,
      Boolean(row.isPrimary),
      JSON.stringify(row.payload || {}),
      row.actorUserId,
    ],
  );
}

export async function endRelationship(id, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE company_contact_relationships SET
      ended_at = NOW(), is_primary = FALSE, updated_by = $2, updated_at = NOW()
     WHERE id = $1 AND ${activeWhere}`,
    [id, actorUserId],
  );
}

export async function setPrimary(id, companyId, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE company_contact_relationships SET is_primary = FALSE, updated_at = NOW()
     WHERE company_id = $1 AND ${activeWhere}`,
    [companyId],
  );
  await run(
    `UPDATE company_contact_relationships SET
      is_primary = TRUE, updated_by = $2, updated_at = NOW()
     WHERE id = $1 AND ${activeWhere}`,
    [id, actorUserId],
  );
}

export default {
  mapRelationshipRow,
  findActiveByCompany,
  findActiveByContact,
  findActiveLink,
  findById,
  insert,
  update,
  endRelationship,
  setPrimary,
};
