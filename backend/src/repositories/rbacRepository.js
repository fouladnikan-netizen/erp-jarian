/**
 * Role + role_permissions adapter.
 * Permission codes stay seed-canonical. Role metadata is administrable (DDL-35).
 */
import { query } from '../db/pool.js';

/** Distinct from LAST_ADMIN_LOCK_KEY (27, 1) in userRepository. */
export const GENERATED_ROLE_LOCK_KEY1 = 8355;
export const GENERATED_ROLE_LOCK_KEY2 = 1;
export const ROLE_LABEL_LOCK_KEY1 = 8356;

function runner(client) {
  return client ? client.query.bind(client) : query;
}

export function mapRoleRow(row) {
  if (!row) return null;
  return {
    code: row.code,
    labelFa: row.label_fa,
    description: row.description || '',
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    activeUserCount: Number(row.active_user_count) || 0,
  };
}

const ROLE_SELECT = `
  SELECT
    r.code,
    r.label_fa,
    r.description,
    r.is_active,
    r.created_at,
    r.updated_at,
    COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = TRUE)::int AS active_user_count
  FROM roles r
  LEFT JOIN user_roles ur ON ur.role_code = r.code
  LEFT JOIN users u ON u.id = ur.user_id
`;

export function mapPermissionRow(row) {
  if (!row) return null;
  return {
    id: row.code,
    code: row.code,
    resource: row.resource || '',
    action: row.action || '',
    labelFa: row.label_fa,
    category: row.category || '',
    isSensitive: row.is_sensitive === true,
    isActive: row.is_active !== false,
  };
}

export async function listPermissions(client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT code, label_fa, resource, action, category, is_sensitive, is_active
     FROM permissions
     ORDER BY category, resource, code`,
  );
  return res.rows.map(mapPermissionRow);
}

export async function listRoles(client = null) {
  const run = runner(client);
  const res = await run(
    `${ROLE_SELECT} GROUP BY r.code ORDER BY r.is_active DESC, r.code`,
  );
  return res.rows.map(mapRoleRow);
}

export async function findRole(roleCode, client = null) {
  const run = runner(client);
  const res = await run(`${ROLE_SELECT} WHERE r.code = $1 GROUP BY r.code`, [roleCode]);
  return res.rows[0] ? mapRoleRow(res.rows[0]) : null;
}

export async function countActiveUsersForRole(roleCode, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT COUNT(DISTINCT u.id)::int AS n
     FROM user_roles ur
     INNER JOIN users u ON u.id = ur.user_id
     WHERE ur.role_code = $1 AND u.is_active = TRUE`,
    [roleCode],
  );
  return res.rows[0]?.n || 0;
}

export async function findRoleByNormalizedLabel(normalizedLabel, { excludeCode } = {}, client = null) {
  const run = runner(client);
  const key = String(normalizedLabel || '');
  if (!key) return null;
  if (excludeCode) {
    const res = await run(
      `${ROLE_SELECT} WHERE r.label_fa_normalized = $1 AND r.code <> $2 GROUP BY r.code`,
      [key, excludeCode],
    );
    return res.rows[0] ? mapRoleRow(res.rows[0]) : null;
  }
  const res = await run(
    `${ROLE_SELECT} WHERE r.label_fa_normalized = $1 GROUP BY r.code`,
    [key],
  );
  return res.rows[0] ? mapRoleRow(res.rows[0]) : null;
}

export async function acquireRoleLabelLock(normalizedLabel, client) {
  await client.query(
    `SELECT pg_advisory_xact_lock($1, hashtext($2))`,
    [ROLE_LABEL_LOCK_KEY1, String(normalizedLabel || '')],
  );
}

export async function insertRole({ code, labelFa, description, isActive }, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO roles (code, label_fa, description, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING code`,
    [code, labelFa, description, isActive],
  );
  return findRole(res.rows[0].code, client);
}

export async function acquireGeneratedRoleCodeLock(client) {
  await client.query(
    `SELECT pg_advisory_xact_lock($1, $2)`,
    [GENERATED_ROLE_LOCK_KEY1, GENERATED_ROLE_LOCK_KEY2],
  );
}

export async function allocateNextGeneratedRoleCode(client) {
  const res = await client.query(
    `SELECT COALESCE(MAX(CAST(substring(code FROM 6) AS BIGINT)), 0) AS max_n
     FROM roles
     WHERE code ~ '^role_[0-9]+$'`,
  );
  const max = Number(res.rows[0]?.max_n) || 0;
  return `role_${max + 1}`;
}

export async function updateRole(code, patch, client = null) {
  const run = runner(client);
  const sets = ['updated_at = NOW()'];
  const params = [];
  let i = 1;
  if (patch.labelFa !== undefined) {
    sets.push(`label_fa = $${i++}`);
    params.push(patch.labelFa);
  }
  if (patch.description !== undefined) {
    sets.push(`description = $${i++}`);
    params.push(patch.description);
  }
  if (patch.isActive !== undefined) {
    sets.push(`is_active = $${i++}`);
    params.push(patch.isActive);
  }
  params.push(code);
  await run(
    `UPDATE roles SET ${sets.join(', ')} WHERE code = $${i}`,
    params,
  );
  return findRole(code, client);
}

export async function findExistingPermissionCodes(codes, client = null) {
  const run = runner(client);
  if (!codes.length) return [];
  const res = await run(
    `SELECT code FROM permissions WHERE code = ANY($1::text[])`,
    [codes],
  );
  return res.rows.map((row) => row.code);
}

export function mapRoleUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name || '',
    username: row.username,
    isActive: row.is_active !== false,
  };
}

export async function listRoleUsers(roleCode, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT u.id, u.username, u.display_name, u.is_active
     FROM user_roles ur
     INNER JOIN users u ON u.id = ur.user_id
     WHERE ur.role_code = $1
     ORDER BY u.is_active DESC, u.display_name, u.username`,
    [roleCode],
  );
  return res.rows.map(mapRoleUserRow);
}

export async function listRolePermissionCodes(roleCode, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT permission_code
     FROM role_permissions
     WHERE role_code = $1
     ORDER BY permission_code`,
    [roleCode],
  );
  return res.rows.map((row) => row.permission_code);
}

export async function replaceRolePermissions(roleCode, permissionCodes, client) {
  const run = runner(client);
  await run(`DELETE FROM role_permissions WHERE role_code = $1`, [roleCode]);
  for (const code of permissionCodes) {
    await run(
      `INSERT INTO role_permissions (role_code, permission_code) VALUES ($1, $2)`,
      [roleCode, code],
    );
  }
}
