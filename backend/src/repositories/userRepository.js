/**
 * Canonical platform User adapter — DDL-27A.
 * SSOT is `users` + `user_roles` + `roles`. Never select password_hash
 * into list/get mappers.
 */
import { query } from '../db/pool.js';

export const ADMIN_ROLE_CODE = 'admin';

/** Advisory lock namespace for the last-active-admin invariant (DDL-27A). */
export const LAST_ADMIN_LOCK_KEY1 = 27;
export const LAST_ADMIN_LOCK_KEY2 = 1;

function runner(client) {
  return client ? client.query.bind(client) : query;
}

function parseRoles(raw) {
  if (!raw) return [];
  let list = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((r) => r && r.code)
    .map((r) => ({
      code: r.code,
      labelFa: r.labelFa || r.label_fa || r.code,
    }));
}

export function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    isActive: Boolean(row.is_active),
    roles: parseRoles(row.roles),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const USER_SELECT = `
  SELECT
    u.id,
    u.username,
    u.display_name,
    u.is_active,
    u.created_at,
    u.updated_at,
    COALESCE(
      json_agg(
        json_build_object('code', r.code, 'labelFa', r.label_fa)
        ORDER BY r.code
      ) FILTER (WHERE r.code IS NOT NULL),
      '[]'::json
    ) AS roles
  FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.code = ur.role_code
`;

export async function listUsers(client = null) {
  const run = runner(client);
  const res = await run(`${USER_SELECT} GROUP BY u.id ORDER BY u.created_at DESC`);
  return res.rows.map(mapUserRow);
}

export async function findById(id, client = null) {
  const run = runner(client);
  const res = await run(`${USER_SELECT} WHERE u.id = $1 GROUP BY u.id`, [id]);
  return res.rows[0] ? mapUserRow(res.rows[0]) : null;
}

export async function findByUsername(username, client = null) {
  const run = runner(client);
  const res = await run(`${USER_SELECT} WHERE u.username = $1 GROUP BY u.id`, [username]);
  return res.rows[0] ? mapUserRow(res.rows[0]) : null;
}

export async function lockById(id, client) {
  const res = await client.query(
    `SELECT id, username, display_name, is_active, created_at, updated_at
     FROM users WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return res.rows[0] || null;
}

export async function insertUser({ id, username, displayName, passwordHash, isActive = true }, client) {
  const run = runner(client);
  await run(
    `INSERT INTO users (id, username, display_name, password_hash, is_active)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, username, displayName, passwordHash, isActive],
  );
}

export async function updateUserFields(id, { displayName, isActive }, client) {
  const run = runner(client);
  const sets = ['updated_at = NOW()'];
  const params = [];
  let i = 1;
  if (displayName !== undefined) {
    sets.push(`display_name = $${i++}`);
    params.push(displayName);
  }
  if (isActive !== undefined) {
    sets.push(`is_active = $${i++}`);
    params.push(isActive);
  }
  params.push(id);
  await run(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`,
    params,
  );
}

export async function updatePasswordHash(id, passwordHash, client) {
  const run = runner(client);
  await run(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [passwordHash, id],
  );
}

export async function listRoleCodes(userId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT role_code FROM user_roles WHERE user_id = $1 ORDER BY role_code`,
    [userId],
  );
  return res.rows.map((r) => r.role_code);
}

export async function replaceRoles(userId, roleCodes, client) {
  const run = runner(client);
  await run(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
  for (const code of roleCodes) {
    await run(
      `INSERT INTO user_roles (user_id, role_code) VALUES ($1, $2)`,
      [userId, code],
    );
  }
}

export async function listAssignableRoles(client = null) {
  const run = runner(client);
  const res = await run(`SELECT code, label_fa FROM roles ORDER BY code`);
  return res.rows.map((r) => ({ code: r.code, labelFa: r.label_fa }));
}

export async function findExistingRoleCodes(codes, client = null) {
  const run = runner(client);
  if (!codes.length) return [];
  const res = await run(
    `SELECT code FROM roles WHERE code = ANY($1::text[])`,
    [codes],
  );
  return res.rows.map((r) => r.code);
}

export async function acquireLastAdminLock(client) {
  await client.query(
    `SELECT pg_advisory_xact_lock($1, $2)`,
    [LAST_ADMIN_LOCK_KEY1, LAST_ADMIN_LOCK_KEY2],
  );
}

/**
 * Lock every currently-active admin row so concurrent mutations cannot
 * both observe "another admin remains" and both proceed.
 */
export async function lockActiveAdminRows(client) {
  const res = await client.query(
    `SELECT u.id
     FROM users u
     INNER JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = $1
     WHERE u.is_active = TRUE
     FOR UPDATE`,
    [ADMIN_ROLE_CODE],
  );
  return res.rows.map((r) => r.id);
}

export async function countActiveAdmins(client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT COUNT(DISTINCT u.id)::int AS n
     FROM users u
     INNER JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = $1
     WHERE u.is_active = TRUE`,
    [ADMIN_ROLE_CODE],
  );
  return res.rows[0].n;
}

export async function getPasswordHash(id, client = null) {
  const run = runner(client);
  const res = await run(`SELECT password_hash FROM users WHERE id = $1`, [id]);
  return res.rows[0]?.password_hash || null;
}
