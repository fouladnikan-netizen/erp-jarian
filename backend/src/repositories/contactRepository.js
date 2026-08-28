/**
 * Contact PostgreSQL adapter — DDL-26 canonical Contact (Kanoon-owned).
 */
import { query } from '../db/pool.js';

function runner(client) {
  return client ? client.query.bind(client) : query;
}

const activeWhere = 'deleted_at IS NULL';

export function mapContactRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    mobile: row.mobile,
    mobileNormalized: row.mobile_normalized,
    email: row.email,
    emailNormalized: row.email_normalized,
    fullNameNormalized: row.full_name_normalized,
    payload: row.payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findById(id, client = null) {
  const run = runner(client);
  const res = await run(`SELECT * FROM contacts WHERE id = $1 AND ${activeWhere}`, [id]);
  return res.rows[0] ? mapContactRow(res.rows[0]) : null;
}

export async function findByMobileNormalized(mobileNormalized, client = null) {
  const run = runner(client);
  if (!mobileNormalized) return null;
  const res = await run(
    `SELECT * FROM contacts WHERE mobile_normalized = $1 AND ${activeWhere} LIMIT 1`,
    [mobileNormalized],
  );
  return res.rows[0] ? mapContactRow(res.rows[0]) : null;
}

export async function findByMobileNormalizedForUpdate(mobileNormalized, client = null) {
  const run = runner(client);
  if (!mobileNormalized) return null;
  const res = await run(
    `SELECT * FROM contacts WHERE mobile_normalized = $1 AND ${activeWhere}
     FOR UPDATE LIMIT 1`,
    [mobileNormalized],
  );
  return res.rows[0] ? mapContactRow(res.rows[0]) : null;
}

export async function searchByName(q, { limit = 10 } = {}, client = null) {
  const run = runner(client);
  const term = String(q || '').trim().toLowerCase();
  if (!term) return [];
  const res = await run(
    `SELECT * FROM contacts
     WHERE ${activeWhere} AND full_name_normalized ILIKE $1
     ORDER BY updated_at DESC LIMIT $2`,
    [`%${term}%`, Math.min(Number(limit) || 10, 25)],
  );
  return res.rows.map(mapContactRow);
}

export async function findByProviderNationalCode(providerNationalCode, client = null) {
  const run = runner(client);
  const code = String(providerNationalCode || '').replace(/\D/g, '');
  if (!code) return null;
  const res = await run(
    `SELECT * FROM contacts WHERE ${activeWhere}
     AND payload->>'providerNationalCode' = $1
     LIMIT 1`,
    [code],
  );
  return res.rows[0] ? mapContactRow(res.rows[0]) : null;
}

export async function insert(row, client = null) {
  const run = runner(client);
  await run(
    `INSERT INTO contacts (
      id, full_name, mobile, mobile_normalized, email, email_normalized,
      full_name_normalized, payload, created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$9)`,
    [
      row.id,
      row.fullName,
      row.mobile || null,
      row.mobileNormalized || null,
      row.email || null,
      row.emailNormalized || null,
      row.fullNameNormalized,
      JSON.stringify(row.payload || {}),
      row.actorUserId,
    ],
  );
}

export async function update(id, data, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE contacts SET
      full_name = COALESCE($2, full_name),
      mobile = COALESCE($3, mobile),
      mobile_normalized = COALESCE($4, mobile_normalized),
      email = COALESCE($5, email),
      email_normalized = COALESCE($6, email_normalized),
      full_name_normalized = COALESCE($7, full_name_normalized),
      payload = COALESCE($8::jsonb, payload),
      updated_by = $9,
      updated_at = NOW()
     WHERE id = $1 AND ${activeWhere}`,
    [
      id,
      data.fullName ?? null,
      data.mobile !== undefined ? data.mobile : null,
      data.mobileNormalized !== undefined ? data.mobileNormalized : null,
      data.email !== undefined ? data.email : null,
      data.emailNormalized !== undefined ? data.emailNormalized : null,
      data.fullNameNormalized ?? null,
      data.payload ? JSON.stringify(data.payload) : null,
      actorUserId,
    ],
  );
}

export default {
  mapContactRow,
  findById,
  findByMobileNormalized,
  findByMobileNormalizedForUpdate,
  findByProviderNationalCode,
  searchByName,
  insert,
  update,
};
