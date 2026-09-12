/**
 * RBAC matrix API — read catalog + replace role_permissions.
 * Existing tables only; requirePermission('users:admin') is the gate.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { normalizeRoleLabelFa } from '../domain/rbac/normalizeRoleLabel.js';

process.env.JARIAN_SKIP_LISTEN = '1';

const { createApp } = await import('../index.js');
const { pool, query } = await import('../db/pool.js');

let server;
let baseUrl;
let dbOk = false;
let adminToken;
let salesToken;
let salesSnapshot = [];

function stamp() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function json(method, path, body, authToken = adminToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function restoreSalesPermissions() {
  if (!salesSnapshot.length) return;
  await query(`DELETE FROM role_permissions WHERE role_code = 'sales'`);
  for (const code of salesSnapshot) {
    await query(
      `INSERT INTO role_permissions (role_code, permission_code) VALUES ('sales', $1)`,
      [code],
    );
  }
}

before(async () => {
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    console.warn('[rbac-integration] DB unavailable — skipping:', err.message);
    return;
  }

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const adminLogin = await json('POST', '/api/v1/auth/login', {
    username: 'admin',
    password: 'Admin123!',
  }, null);
  assert.equal(adminLogin.status, 200, 'admin login failed — run: cd backend && npm run setup');
  adminToken = adminLogin.data.accessToken || adminLogin.data.token;

  const salesLogin = await json('POST', '/api/v1/auth/login', {
    username: 'sales_b',
    password: 'SalesB123!',
  }, null);
  if (salesLogin.status === 200) {
    salesToken = salesLogin.data.accessToken || salesLogin.data.token;
  }

  const snap = await query(
    `SELECT permission_code FROM role_permissions WHERE role_code = 'sales' ORDER BY permission_code`,
  );
  salesSnapshot = snap.rows.map((row) => row.permission_code);
});

async function deleteQaRoles() {
  await query(`DELETE FROM users WHERE id LIKE 'u_qa_%'`);
  await query(`DELETE FROM roles WHERE code LIKE 'qa_role_%'`);
  await query(`DELETE FROM roles WHERE label_fa LIKE 'QA-GEN-%'`);
}

after(async () => {
  try {
    await restoreSalesPermissions();
  } catch {
    /* ignore */
  }
  try {
    await deleteQaRoles();
  } catch {
    /* ignore */
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});
});

describe('rbac API', () => {
  it('GET /permissions returns seed catalog', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/rbac/permissions');
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.ok(Array.isArray(res.data.permissions));
    const codes = res.data.permissions.map((p) => p.code);
    assert.ok(codes.includes('orders:read'));
    assert.ok(codes.includes('users:admin'));
    const ordersRead = res.data.permissions.find((p) => p.code === 'orders:read');
    assert.equal(typeof ordersRead.labelFa, 'string');
    assert.ok(ordersRead.labelFa.length > 0);
    assert.equal(ordersRead.resource, 'orders');
    assert.equal(ordersRead.action, 'read');
    assert.equal(ordersRead.category, 'نبض');
    assert.equal(ordersRead.isSensitive, false);
    assert.equal(ordersRead.id, 'orders:read');

    const viewCost = res.data.permissions.find((p) => p.code === 'orders:view_cost');
    assert.ok(viewCost, 'sensitive catalog row orders:view_cost');
    assert.equal(viewCost.isSensitive, true);
    assert.equal(viewCost.category, 'مالی');
    assert.equal(viewCost.action, 'view_cost');

    const usersAdmin = res.data.permissions.find((p) => p.code === 'users:admin');
    assert.equal(usersAdmin.isSensitive, true);
  });

  it('GET /permissions without token → 401', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/rbac/permissions', undefined, null);
    assert.equal(res.status, 401);
  });

  it('GET /permissions without users:admin → 403', async (t) => {
    if (!dbOk) return t.skip('no database');
    if (!salesToken) return t.skip('sales_b not seeded');
    const res = await json('GET', '/api/v1/rbac/permissions', undefined, salesToken);
    assert.equal(res.status, 403);
    assert.equal(res.data.error, 'FORBIDDEN');
  });

  it('GET /roles/sales/permissions returns current grants', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/rbac/roles/sales/permissions');
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.deepEqual(res.data.permissions, salesSnapshot);
    assert.ok(res.data.permissions.includes('orders:read'));
  });

  it('GET unknown role → 404', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/rbac/roles/not_a_role/permissions');
    assert.equal(res.status, 404);
    assert.equal(res.data.error, 'ROLE_NOT_FOUND');
  });

  it('GET /roles/:code/users lists assigned active and inactive users', async (t) => {
    if (!dbOk) return t.skip('no database');

    const missing = await json('GET', '/api/v1/rbac/roles/not_a_role/users');
    assert.equal(missing.status, 404);
    assert.equal(missing.data.error, 'ROLE_NOT_FOUND');

    const unauth = await json('GET', '/api/v1/rbac/roles/admin/users', undefined, null);
    assert.equal(unauth.status, 401);

    const admin = await json('GET', '/api/v1/rbac/roles/admin/users');
    assert.equal(admin.status, 200, JSON.stringify(admin.data));
    assert.ok(Array.isArray(admin.data.users));
    assert.ok(admin.data.users.length >= 1);
    const adminUser = admin.data.users.find((u) => u.username === 'admin') || admin.data.users[0];
    assert.ok(adminUser.id);
    assert.equal(typeof adminUser.displayName, 'string');
    assert.ok(adminUser.displayName.length > 0);
    assert.equal(typeof adminUser.username, 'string');
    assert.equal(typeof adminUser.isActive, 'boolean');
    assert.equal(adminUser.isActive, true);

    const code = `qa_role_${stamp()}`;
    const created = await json('POST', '/api/v1/rbac/roles', {
      code,
      labelFa: 'QA-GEN-بدون کاربر',
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const empty = await json('GET', `/api/v1/rbac/roles/${code}/users`);
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.data.users, []);

    const activeId = `u_qa_${stamp()}`;
    const inactiveId = `u_qa_${stamp()}`;
    await query(
      `INSERT INTO users (id, username, display_name, password_hash, is_active)
       VALUES ($1, $2, $3, 'x', TRUE), ($4, $5, $6, 'x', FALSE)`,
      [activeId, `qa_active_${stamp()}`, 'کاربر فعال آزمون', inactiveId, `qa_inactive_${stamp()}`, 'کاربر غیرفعال آزمون'],
    );
    await query(
      `INSERT INTO user_roles (user_id, role_code) VALUES ($1, $3), ($2, $3)`,
      [activeId, inactiveId, code],
    );

    const listed = await json('GET', `/api/v1/rbac/roles/${code}/users`);
    assert.equal(listed.status, 200, JSON.stringify(listed.data));
    assert.equal(listed.data.users.length, 2);
    const byName = Object.fromEntries(listed.data.users.map((u) => [u.displayName, u]));
    assert.equal(byName['کاربر فعال آزمون'].isActive, true);
    assert.equal(byName['کاربر غیرفعال آزمون'].isActive, false);
    assert.ok(byName['کاربر فعال آزمون'].username);
    assert.ok(byName['کاربر غیرفعال آزمون'].username);
  });

  it('PUT replaces role_permissions and GET round-trips', async (t) => {
    if (!dbOk) return t.skip('no database');
    const next = salesSnapshot.filter((code) => code !== 'tasks:write');
    assert.ok(next.length < salesSnapshot.length, 'sales seed must include tasks:write');

    const put = await json('PUT', '/api/v1/rbac/roles/sales/permissions', { permissions: next });
    assert.equal(put.status, 200, JSON.stringify(put.data));
    assert.deepEqual(put.data.permissions, next);

    const get = await json('GET', '/api/v1/rbac/roles/sales/permissions');
    assert.deepEqual(get.data.permissions, next);

    const restore = await json('PUT', '/api/v1/rbac/roles/sales/permissions', {
      permissions: salesSnapshot,
    });
    assert.equal(restore.status, 200, JSON.stringify(restore.data));
    assert.deepEqual(restore.data.permissions, salesSnapshot);
  });

  it('PUT unknown permission code → 400', async (t) => {
    if (!dbOk) return t.skip('no database');
    const put = await json('PUT', '/api/v1/rbac/roles/sales/permissions', {
      permissions: ['orders:read', 'not:a-real-permission'],
    });
    assert.equal(put.status, 400);
    assert.equal(put.data.error, 'PERMISSION_NOT_FOUND');
    const still = await json('GET', '/api/v1/rbac/roles/sales/permissions');
    assert.deepEqual(still.data.permissions, salesSnapshot);
  });

  it('PUT admin without users:admin → 409', async (t) => {
    if (!dbOk) return t.skip('no database');
    const put = await json('PUT', '/api/v1/rbac/roles/admin/permissions', {
      permissions: ['orders:read'],
    });
    assert.equal(put.status, 409);
    assert.equal(put.data.error, 'ADMIN_PERMISSION_REQUIRED');
    const adminPerms = await json('GET', '/api/v1/rbac/roles/admin/permissions');
    assert.ok(adminPerms.data.permissions.includes('users:admin'));
  });

  it('login after grant change returns updated permissions', async (t) => {
    if (!dbOk) return t.skip('no database');
    if (!salesToken) return t.skip('sales_b not seeded');

    const reduced = salesSnapshot.filter((code) => code !== 'tasks:write');
    const put = await json('PUT', '/api/v1/rbac/roles/sales/permissions', { permissions: reduced });
    assert.equal(put.status, 200, JSON.stringify(put.data));

    const relogin = await json('POST', '/api/v1/auth/login', {
      username: 'sales_b',
      password: 'SalesB123!',
    }, null);
    assert.equal(relogin.status, 200, JSON.stringify(relogin.data));
    const perms = relogin.data.user.permissions || [];
    assert.equal(perms.includes('tasks:write'), false);
    assert.equal(perms.includes('orders:read'), true);

    await json('PUT', '/api/v1/rbac/roles/sales/permissions', { permissions: salesSnapshot });
  });

  it('PUT accepts dotted aliases and stores canonical colon codes', async (t) => {
    if (!dbOk) return t.skip('no database');
    const mixed = ['orders.view', 'orders:write', 'companies.read'];
    const put = await json('PUT', '/api/v1/rbac/roles/sales/permissions', { permissions: mixed });
    assert.equal(put.status, 200, JSON.stringify(put.data));
    assert.deepEqual(put.data.permissions, ['companies:read', 'orders:read', 'orders:write']);

    const restore = await json('PUT', '/api/v1/rbac/roles/sales/permissions', {
      permissions: salesSnapshot,
    });
    assert.equal(restore.status, 200, JSON.stringify(restore.data));
  });
});

describe('rbac role administration', () => {
  it('GET /roles lists seed roles with usage counts', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/rbac/roles');
    assert.equal(res.status, 200, JSON.stringify(res.data));
    const codes = (res.data.roles || []).map((r) => r.code);
    for (const required of ['admin', 'sales_manager', 'sales', 'purchase', 'accounting']) {
      assert.ok(codes.includes(required), `missing ${required}`);
    }
    const admin = res.data.roles.find((r) => r.code === 'admin');
    assert.equal(admin.isActive, true);
    assert.equal(typeof admin.description, 'string');
    assert.ok(admin.activeUserCount >= 1);
  });

  it('POST /roles creates a role and GET round-trips', async (t) => {
    if (!dbOk) return t.skip('no database');
    const code = `qa_role_${stamp()}`;
    const created = await json('POST', '/api/v1/rbac/roles', {
      code,
      labelFa: 'نقش آزمایشی',
      description: 'برای آزمون مدیریت نقش',
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    assert.equal(created.data.role.code, code);
    assert.equal(created.data.role.labelFa, 'نقش آزمایشی');
    assert.equal(created.data.role.isActive, true);

    const listed = await json('GET', '/api/v1/rbac/roles');
    assert.ok(listed.data.roles.some((r) => r.code === code));

    const detail = await json('GET', `/api/v1/rbac/roles/${code}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.data.role.description, 'برای آزمون مدیریت نقش');

    const grants = await json('GET', `/api/v1/rbac/roles/${code}/permissions`);
    assert.equal(grants.status, 200);
    assert.deepEqual(grants.data.permissions, []);
  });

  it('PATCH updates label/description and rejects code change', async (t) => {
    if (!dbOk) return t.skip('no database');
    const code = `qa_role_${stamp()}`;
    await json('POST', '/api/v1/rbac/roles', { code, labelFa: 'قبل', description: 'قدیم' });

    const patched = await json('PATCH', `/api/v1/rbac/roles/${code}`, {
      labelFa: 'بعد',
      description: 'جدید',
    });
    assert.equal(patched.status, 200, JSON.stringify(patched.data));
    assert.equal(patched.data.role.labelFa, 'بعد');
    assert.equal(patched.data.role.description, 'جدید');

    const reject = await json('PATCH', `/api/v1/rbac/roles/${code}`, { code: 'other_code' });
    assert.equal(reject.status, 400);
  });

  it('PATCH isActive=false warns when users are assigned but still deactivates', async (t) => {
    if (!dbOk) return t.skip('no database');
    const admin = await json('GET', '/api/v1/rbac/roles/admin');
    assert.equal(admin.status, 200);
    assert.ok(admin.data.role.activeUserCount >= 1);

    const deactivated = await json('PATCH', '/api/v1/rbac/roles/admin', { isActive: false });
    assert.equal(deactivated.status, 200, JSON.stringify(deactivated.data));
    assert.equal(deactivated.data.role.isActive, false);
    assert.equal(deactivated.data.usage?.code, 'ROLE_IN_USE');
    assert.ok(deactivated.data.usage.activeUserCount >= 1);

    const relogin = await json('POST', '/api/v1/auth/login', {
      username: 'admin',
      password: 'Admin123!',
    }, null);
    assert.equal(relogin.status, 200, JSON.stringify(relogin.data));
    assert.ok((relogin.data.user.permissions || []).includes('users:admin'));

    const restored = await json('PATCH', '/api/v1/rbac/roles/admin', { isActive: true });
    assert.equal(restored.status, 200, JSON.stringify(restored.data));
    assert.equal(restored.data.role.isActive, true);
  });

  it('POST duplicate role code → 409', async (t) => {
    if (!dbOk) return t.skip('no database');
    const dup = await json('POST', '/api/v1/rbac/roles', {
      code: 'sales',
      labelFa: 'تکراری',
    });
    assert.equal(dup.status, 409);
    assert.equal(dup.data.error, 'ROLE_EXISTS');
  });

  it('POST /roles without code allocates sequential role_N', async (t) => {
    if (!dbOk) return t.skip('no database');
    const listed = await json('GET', '/api/v1/rbac/roles');
    const nums = (listed.data.roles || [])
      .map((r) => r.code)
      .filter((code) => /^role_[0-9]+$/.test(code))
      .map((code) => Number(code.slice('role_'.length)));
    const max = nums.length ? Math.max(...nums) : 0;

    const first = await json('POST', '/api/v1/rbac/roles', {
      labelFa: 'QA-GEN-مدیر انبار',
    });
    assert.equal(first.status, 201, JSON.stringify(first.data));
    assert.equal(first.data.role.code, `role_${max + 1}`);
    assert.equal(first.data.role.labelFa, 'QA-GEN-مدیر انبار');

    const second = await json('POST', '/api/v1/rbac/roles', {
      labelFa: 'QA-GEN-دوم',
    });
    assert.equal(second.status, 201, JSON.stringify(second.data));
    assert.equal(second.data.role.code, `role_${max + 2}`);

    const grant = await json('PUT', `/api/v1/rbac/roles/${first.data.role.code}/permissions`, {
      permissions: ['orders:read'],
    });
    assert.equal(grant.status, 200, JSON.stringify(grant.data));
    assert.deepEqual(grant.data.permissions, ['orders:read']);

    const seed = await json('GET', '/api/v1/rbac/roles');
    const codes = (seed.data.roles || []).map((r) => r.code);
    for (const required of ['admin', 'sales_manager', 'sales', 'purchase', 'accounting']) {
      assert.ok(codes.includes(required), `seed role mutated: ${required}`);
    }
  });

  it('POST /roles concurrent omitted codes do not collide', async (t) => {
    if (!dbOk) return t.skip('no database');
    const [a, b] = await Promise.all([
      json('POST', '/api/v1/rbac/roles', { labelFa: 'QA-GEN-همزمان-ا' }),
      json('POST', '/api/v1/rbac/roles', { labelFa: 'QA-GEN-همزمان-ب' }),
    ]);
    assert.equal(a.status, 201, JSON.stringify(a.data));
    assert.equal(b.status, 201, JSON.stringify(b.data));
    const codes = [a.data.role.code, b.data.role.code];
    assert.match(codes[0], /^role_[0-9]+$/);
    assert.match(codes[1], /^role_[0-9]+$/);
    assert.notEqual(codes[0], codes[1]);
  });

  it('POST /roles rejects duplicate normalized labels including inactive and Arabic yeh', async (t) => {
    if (!dbOk) return t.skip('no database');
    const token = stamp();
    const arabic = `QA-GEN-مدير ${token}`;
    const persian = `QA-GEN-مدیر ${token}`;
    const created = await json('POST', '/api/v1/rbac/roles', { labelFa: arabic });
    assert.equal(created.status, 201, JSON.stringify(created.data));

    const sql = await query(
      `SELECT jarian_normalize_role_label($1) AS n`,
      [' مدير  فروش '],
    );
    assert.equal(sql.rows[0].n, normalizeRoleLabelFa(' مدير  فروش '));

    const exact = await json('POST', '/api/v1/rbac/roles', { labelFa: arabic });
    assert.equal(exact.status, 409, JSON.stringify(exact.data));
    assert.equal(exact.data.error, 'ROLE_NAME_ALREADY_EXISTS');
    assert.equal(exact.data.code, 'ROLE_NAME_ALREADY_EXISTS');
    assert.equal(exact.data.existingRoleCode, created.data.role.code);
    assert.equal(exact.data.existingRoleIsActive, true);
    assert.match(String(exact.data.message), /قبلاً وجود دارد/);

    const spaced = await json('POST', '/api/v1/rbac/roles', {
      labelFa: `  QA-GEN-مدير  ${token}  `,
    });
    assert.equal(spaced.status, 409, JSON.stringify(spaced.data));

    const yeh = await json('POST', '/api/v1/rbac/roles', { labelFa: persian });
    assert.equal(yeh.status, 409, JSON.stringify(yeh.data));

    const deactivated = await json('PATCH', `/api/v1/rbac/roles/${created.data.role.code}`, {
      isActive: false,
    });
    assert.equal(deactivated.status, 200, JSON.stringify(deactivated.data));
    const afterInactive = await json('POST', '/api/v1/rbac/roles', { labelFa: persian });
    assert.equal(afterInactive.status, 409, JSON.stringify(afterInactive.data));
    assert.equal(afterInactive.data.existingRoleIsActive, false);
    assert.equal(afterInactive.data.existingRoleCode, created.data.role.code);
    assert.match(String(afterInactive.data.message), /غیرفعال/);

    const other = await json('POST', '/api/v1/rbac/roles', { labelFa: `QA-GEN-دیگر ${token}` });
    assert.equal(other.status, 201, JSON.stringify(other.data));
    const renamed = await json('PATCH', `/api/v1/rbac/roles/${other.data.role.code}`, {
      labelFa: persian,
    });
    assert.equal(renamed.status, 409, JSON.stringify(renamed.data));
    assert.equal(renamed.data.error, 'ROLE_NAME_ALREADY_EXISTS');

    const keepOwn = await json('PATCH', `/api/v1/rbac/roles/${created.data.role.code}`, {
      labelFa: `  ${persian}  `,
    });
    assert.equal(keepOwn.status, 200, JSON.stringify(keepOwn.data));

    const salesDup = await json('POST', '/api/v1/rbac/roles', { labelFa: 'مدیر فروش' });
    assert.equal(salesDup.status, 409);
    assert.equal(salesDup.data.existingRoleCode, 'sales_manager');

    const salesPerms = await json('GET', '/api/v1/rbac/roles/sales_manager/permissions');
    assert.equal(salesPerms.status, 200);
    assert.ok((salesPerms.data.permissions || []).length > 0);
  });

  it('POST /roles concurrent equivalent names do not both succeed', async (t) => {
    if (!dbOk) return t.skip('no database');
    const token = stamp();
    const [a, b] = await Promise.all([
      json('POST', '/api/v1/rbac/roles', { labelFa: `QA-GEN-همنام ${token}` }),
      json('POST', '/api/v1/rbac/roles', { labelFa: `QA-GEN-همنام  ${token}` }),
    ]);
    const statuses = [a.status, b.status].sort();
    assert.deepEqual(statuses, [201, 409], JSON.stringify({ a: a.data, b: b.data }));
    const conflict = a.status === 409 ? a : b;
    assert.equal(conflict.data.error, 'ROLE_NAME_ALREADY_EXISTS');
  });
});
