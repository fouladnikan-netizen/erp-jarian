/**
 * Persona PostgreSQL adapter — SQL only. No Zod / RBAC / HTTP.
 * DDL-42/44: Definitions data. Role links are catalog-only and do not grant permissions.
 */
import { query } from '../db/pool.js';

export const GENERATED_PERSONA_LOCK_KEY1 = 8358;
export const GENERATED_PERSONA_LOCK_KEY2 = 1;

function mapRole(row) {
  return {
    code: row.role_code,
    labelFa: row.role_label_fa || row.role_code,
    isActive: row.role_is_active !== false,
  };
}

function mapRow(row, roles = []) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    domain: row.domain || '',
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    roles,
  };
}

function runner(client) {
  return client ? client.query.bind(client) : query;
}

const PERSONA_SELECT = `
  SELECT
    p.id,
    p.code,
    p.name,
    p.domain,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM personas p
`;

export async function listRoleLinks(personaCodes, client = null) {
  const run = runner(client);
  const codes = (personaCodes || []).filter(Boolean);
  if (!codes.length) return new Map();
  const res = await run(
    `SELECT
       l.persona_code,
       l.role_code,
       r.label_fa AS role_label_fa,
       r.is_active AS role_is_active
     FROM persona_role_links l
     INNER JOIN roles r ON r.code = l.role_code
     WHERE l.persona_code = ANY($1::text[])
     ORDER BY r.label_fa`,
    [codes],
  );
  const map = new Map();
  for (const row of res.rows) {
    const list = map.get(row.persona_code) || [];
    list.push(mapRole(row));
    map.set(row.persona_code, list);
  }
  return map;
}

async function withRoles(rows, client = null) {
  const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const map = await listRoleLinks(list.map((row) => row.code), client);
  return list.map((row) => mapRow(row, map.get(row.code) || []));
}

export async function list({ includeInactive = true } = {}, client = null) {
  const run = runner(client);
  const where = includeInactive ? '' : 'WHERE p.is_active = true';
  const res = await run(`${PERSONA_SELECT} ${where} ORDER BY p.code ASC`);
  return withRoles(res.rows, client);
}

export async function findByCode(code, client = null) {
  const run = runner(client);
  const res = await run(`${PERSONA_SELECT} WHERE p.code = $1`, [code]);
  const [row] = await withRoles(res.rows, client);
  return row || null;
}

export async function findById(id, client = null) {
  const run = runner(client);
  const res = await run(`${PERSONA_SELECT} WHERE p.id = $1`, [id]);
  const [row] = await withRoles(res.rows, client);
  return row || null;
}

export async function findByRoleCode(roleCode, client = null) {
  const run = runner(client);
  if (!roleCode) return null;
  const res = await run(
    `${PERSONA_SELECT}
     INNER JOIN persona_role_links l ON l.persona_code = p.code
     WHERE l.role_code = $1`,
    [roleCode],
  );
  const [row] = await withRoles(res.rows, client);
  return row || null;
}

export async function listAllLinks(client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT
       l.role_code,
       l.persona_code,
       p.name AS persona_name,
       r.label_fa AS role_label_fa,
       r.is_active AS role_is_active
     FROM persona_role_links l
     INNER JOIN personas p ON p.code = l.persona_code
     INNER JOIN roles r ON r.code = l.role_code`,
  );
  return res.rows;
}

export async function acquireGeneratedCodeLock(client) {
  await client.query(
    `SELECT pg_advisory_xact_lock($1, $2)`,
    [GENERATED_PERSONA_LOCK_KEY1, GENERATED_PERSONA_LOCK_KEY2],
  );
}

export async function allocateNextGeneratedCode(client) {
  const res = await client.query(
    `SELECT COALESCE(MAX(CAST(substring(code FROM 9) AS BIGINT)), 0) AS max_n
     FROM personas
     WHERE code ~ '^persona_[0-9]+$'`,
  );
  const max = Number(res.rows[0]?.max_n) || 0;
  return `persona_${max + 1}`;
}

export async function create(row, client = null) {
  const run = runner(client);
  await run(
    `INSERT INTO personas (id, code, name, domain, is_active)
     VALUES ($1, $2, $3, $4, $5)`,
    [row.id, row.code, row.name, row.domain ?? '', row.isActive !== false],
  );
  return findByCode(row.code, client);
}

export async function update(code, patch, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE personas SET
      name = COALESCE($2, name),
      domain = COALESCE($3, domain),
      is_active = COALESCE($4, is_active),
      updated_at = NOW()
     WHERE code = $1
     RETURNING id`,
    [code, patch.name ?? null, patch.domain ?? null, patch.isActive ?? null],
  );
  if (!res.rows[0]) return null;
  return findByCode(code, client);
}

export async function insertRoleLink({ personaCode, roleCode }, client = null) {
  const run = runner(client);
  await run(
    `INSERT INTO persona_role_links (role_code, persona_code) VALUES ($1, $2)`,
    [roleCode, personaCode],
  );
}

export async function deleteRoleLink({ personaCode, roleCode }, client = null) {
  const run = runner(client);
  const res = await run(
    `DELETE FROM persona_role_links
      WHERE persona_code = $1 AND role_code = $2
      RETURNING role_code`,
    [personaCode, roleCode],
  );
  return res.rowCount > 0;
}

export default {
  list,
  findByCode,
  findById,
  findByRoleCode,
  listAllLinks,
  acquireGeneratedCodeLock,
  allocateNextGeneratedCode,
  create,
  update,
  insertRoleLink,
  deleteRoleLink,
};
