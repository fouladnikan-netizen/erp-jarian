/**
 * Canonical platform User adapter — DDL-27A / DDL-39.
 * SSOT is `users` + `user_roles` + `roles`. Never select password_hash
 * into list/get mappers.
 */
import { query } from '../db/pool.js';

export const ADMIN_ROLE_CODE = 'admin';

/** Advisory lock namespace for the last-active-admin invariant (DDL-27A). */
export const LAST_ADMIN_LOCK_KEY1 = 27;
export const LAST_ADMIN_LOCK_KEY2 = 1;

/** Distinct from last-admin (27,1) and role code/label locks (8355 / 8356). */
export const GENERATED_USERNAME_LOCK_KEY1 = 8357;
export const GENERATED_USERNAME_LOCK_KEY2 = 1;

const AUTHENTICABLE_ADMIN = `
  u.is_active = TRUE
  AND u.account_status = 'ACTIVE'
  AND u.password_hash IS NOT NULL
`;

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
  const status = row.account_status || (row.is_active ? 'ACTIVE' : 'INACTIVE');
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    fullName: row.display_name,
    mobile: row.mobile || null,
    email: row.email || null,
    status,
    isActive: status !== 'INACTIVE',
    hasPassword: row.has_password === true,
    roles: parseRoles(row.roles),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    organization: row.org_unit_id
      ? {
        unitId: row.org_unit_id,
        unitName: row.org_unit_name || '',
        positionId: row.org_position_id || null,
        positionTitle: row.org_position_title || '',
        isManager: row.org_is_manager === true,
      }
      : null,
  };
}

const USER_SELECT = `
  SELECT
    u.id,
    u.username,
    u.display_name,
    u.mobile,
    u.email,
    u.account_status,
    u.is_active,
    (u.password_hash IS NOT NULL) AS has_password,
    u.created_at,
    u.updated_at,
    COALESCE(
      json_agg(
        json_build_object('code', r.code, 'labelFa', r.label_fa)
        ORDER BY r.code
      ) FILTER (WHERE r.code IS NOT NULL),
      '[]'::json
    ) AS roles,
    org.unit_id AS org_unit_id,
    org.unit_name AS org_unit_name,
    org.position_id AS org_position_id,
    org.position_title AS org_position_title,
    org.is_manager AS org_is_manager
  FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.code = ur.role_code
  LEFT JOIN LATERAL (
    SELECT
      a.unit_id,
      a.position_id,
      a.is_manager,
      ou.name AS unit_name,
      op.title AS position_title
    FROM user_organization_assignments a
    INNER JOIN organization_units ou ON ou.id = a.unit_id
    LEFT JOIN organization_positions op ON op.id = a.position_id
    WHERE a.user_id = u.id AND a.is_primary = TRUE
    LIMIT 1
  ) org ON TRUE
`;

const USER_GROUP = 'u.id, org.unit_id, org.unit_name, org.position_id, org.position_title, org.is_manager';

export async function listUsers(client = null) {
  const run = runner(client);
  const res = await run(`${USER_SELECT} GROUP BY ${USER_GROUP} ORDER BY u.created_at DESC`);
  return res.rows.map(mapUserRow);
}

export async function findById(id, client = null) {
  const run = runner(client);
  const res = await run(`${USER_SELECT} WHERE u.id = $1 GROUP BY ${USER_GROUP}`, [id]);
  return res.rows[0] ? mapUserRow(res.rows[0]) : null;
}

export async function findByUsername(username, client = null) {
  const run = runner(client);
  const res = await run(`${USER_SELECT} WHERE u.username = $1 GROUP BY ${USER_GROUP}`, [username]);
  return res.rows[0] ? mapUserRow(res.rows[0]) : null;
}

export async function findByMobile(mobile, client = null) {
  const run = runner(client);
  if (!mobile) return null;
  const res = await run(`${USER_SELECT} WHERE u.mobile = $1 GROUP BY ${USER_GROUP}`, [mobile]);
  return res.rows[0] ? mapUserRow(res.rows[0]) : null;
}

export async function findLoginRow({ kind, value }, client = null) {
  const run = runner(client);
  if (!value) return null;
  const sql = `SELECT id, username, mobile, password_hash, is_active, account_status
                 FROM users WHERE ${kind === 'mobile' ? 'mobile' : 'username'} = $1`;
  const res = await run(sql, [value]);
  return res.rows[0] || null;
}

export async function findByEmail(email, client = null) {
  const run = runner(client);
  if (!email) return null;
  const res = await run(`${USER_SELECT} WHERE u.email = $1 GROUP BY ${USER_GROUP}`, [email]);
  return res.rows[0] ? mapUserRow(res.rows[0]) : null;
}

export async function lockById(id, client) {
  const res = await client.query(
    `SELECT id, username, display_name, mobile, email, account_status, is_active,
            (password_hash IS NOT NULL) AS has_password, created_at, updated_at
     FROM users WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return res.rows[0] || null;
}

export async function insertUser(row, client) {
  const run = runner(client);
  await run(
    `INSERT INTO users (
       id, username, display_name, password_hash, is_active, mobile, email, account_status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      row.id,
      row.username,
      row.displayName,
      row.passwordHash ?? null,
      row.isActive !== false,
      row.mobile ?? null,
      row.email ?? null,
      row.accountStatus || 'ACTIVE',
    ],
  );
}

export async function updateUserFields(id, patch, client) {
  const run = runner(client);
  const sets = ['updated_at = NOW()'];
  const params = [];
  let i = 1;
  if (patch.displayName !== undefined) {
    sets.push(`display_name = $${i++}`);
    params.push(patch.displayName);
  }
  if (patch.isActive !== undefined) {
    sets.push(`is_active = $${i++}`);
    params.push(patch.isActive);
  }
  if (patch.mobile !== undefined) {
    sets.push(`mobile = $${i++}`);
    params.push(patch.mobile);
  }
  if (patch.email !== undefined) {
    sets.push(`email = $${i++}`);
    params.push(patch.email);
  }
  if (patch.accountStatus !== undefined) {
    sets.push(`account_status = $${i++}`);
    params.push(patch.accountStatus);
  }
  params.push(id);
  await run(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`,
    params,
  );
}

export async function updatePasswordHash(id, passwordHash, client, { activateInvited = false } = {}) {
  const run = runner(client);
  if (activateInvited) {
    await run(
      `UPDATE users
       SET password_hash = $1,
           account_status = CASE WHEN account_status = 'INVITED' THEN 'ACTIVE' ELSE account_status END,
           is_active = CASE WHEN account_status = 'INVITED' THEN TRUE ELSE is_active END,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, id],
    );
    return;
  }
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
  const res = await run(
    `SELECT code, label_fa, is_active FROM roles ORDER BY code`,
  );
  return res.rows.map((r) => ({
    code: r.code,
    labelFa: r.label_fa,
    isActive: r.is_active !== false,
  }));
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

export async function findRoleStates(codes, client = null) {
  const run = runner(client);
  if (!codes.length) return [];
  const res = await run(
    `SELECT code, is_active FROM roles WHERE code = ANY($1::text[])`,
    [codes],
  );
  return res.rows.map((r) => ({
    code: r.code,
    isActive: r.is_active !== false,
  }));
}

export async function acquireLastAdminLock(client) {
  await client.query(
    `SELECT pg_advisory_xact_lock($1, $2)`,
    [LAST_ADMIN_LOCK_KEY1, LAST_ADMIN_LOCK_KEY2],
  );
}

export async function acquireGeneratedUsernameLock(client) {
  await client.query(
    `SELECT pg_advisory_xact_lock($1, $2)`,
    [GENERATED_USERNAME_LOCK_KEY1, GENERATED_USERNAME_LOCK_KEY2],
  );
}

export async function allocateNextGeneratedUsername(client) {
  const res = await client.query(
    `SELECT COALESCE(MAX(CAST(substring(username FROM 6) AS BIGINT)), 0) AS max_n
     FROM users
     WHERE username ~ '^user_[0-9]+$'`,
  );
  const max = Number(res.rows[0]?.max_n) || 0;
  return `user_${max + 1}`;
}

/**
 * Lock every currently-authenticable admin row so concurrent mutations cannot
 * both observe "another admin remains" and both proceed.
 */
export async function lockActiveAdminRows(client) {
  const res = await client.query(
    `SELECT u.id
     FROM users u
     INNER JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = $1
     WHERE ${AUTHENTICABLE_ADMIN}
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
     WHERE ${AUTHENTICABLE_ADMIN}`,
    [ADMIN_ROLE_CODE],
  );
  return res.rows[0].n;
}

export async function getPasswordHash(id, client = null) {
  const run = runner(client);
  const res = await run(`SELECT password_hash FROM users WHERE id = $1`, [id]);
  return res.rows[0]?.password_hash || null;
}
