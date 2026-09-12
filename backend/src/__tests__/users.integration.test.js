/**
 * Canonical User administration API (DDL-27A).
 * PostgreSQL `users` / `user_roles` / `roles` / `audit_log` are SSOT.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import bcrypt from 'bcryptjs';

process.env.JARIAN_SKIP_LISTEN = '1';

const { createApp } = await import('../index.js');
const { pool, query } = await import('../db/pool.js');
const { ADMIN_ROLE_CODE } = await import('../repositories/userRepository.js');

let server;
let baseUrl;
let dbOk = false;
let adminToken;
let salesToken;
let seedAdminId;

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

function stamp() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function countActiveAdmins() {
  const res = await query(
    `SELECT COUNT(DISTINCT u.id)::int AS n
     FROM users u
     INNER JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = $1
     WHERE u.is_active = TRUE`,
    [ADMIN_ROLE_CODE],
  );
  return res.rows[0].n;
}

async function restoreSeedAdmin() {
  if (!seedAdminId) return;
  await query(
    `UPDATE users SET is_active = TRUE, account_status = 'ACTIVE' WHERE id = $1`,
    [seedAdminId],
  );
  await query(
    `INSERT INTO user_roles (user_id, role_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [seedAdminId, ADMIN_ROLE_CODE],
  );
}

before(async () => {
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    console.warn('[users-integration] DB unavailable — skipping:', err.message);
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
  const adminRow = await query(`SELECT id FROM users WHERE username = 'admin'`);
  seedAdminId = adminRow.rows[0]?.id;

  const salesLogin = await json('POST', '/api/v1/auth/login', {
    username: 'sales_b',
    password: 'SalesB123!',
  }, null);
  if (salesLogin.status === 200) {
    salesToken = salesLogin.data.accessToken || salesLogin.data.token;
  }
});

after(async () => {
  try {
    await restoreSeedAdmin();
  } catch {
    /* ignore */
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});
});

describe('users API authz', () => {
  it('users:admin can list users', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/users');
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.ok(Array.isArray(res.data.users));
    assert.ok(res.data.users.length >= 1);
    const self = res.data.users.find((u) => u.username === 'admin');
    assert.ok(self);
    assert.equal(self.displayName, self.displayName);
    assert.equal(typeof self.isActive, 'boolean');
    assert.ok(Array.isArray(self.roles));
  });

  it('unauthorized / no token → 401', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/users', undefined, null);
    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'UNAUTHORIZED');
  });

  it('authenticated user without users:admin → 403', async (t) => {
    if (!dbOk) return t.skip('no database');
    if (!salesToken) return t.skip('sales_b fixture missing');
    const res = await json('GET', '/api/v1/users', undefined, salesToken);
    assert.equal(res.status, 403);
    assert.equal(res.data.error, 'FORBIDDEN');
  });
});

describe('users API mutations', () => {
  it('create user, hash password, never return password_hash', async (t) => {
    if (!dbOk) return t.skip('no database');
    const username = `u_create_${stamp()}`;
    const password = 'CreatePass8!';
    const res = await json('POST', '/api/v1/users', {
      username,
      displayName: 'کاربر ایجاد',
      password,
      roles: ['sales'],
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    const user = res.data.user;
    assert.ok(user.id);
    assert.equal(user.username, username);
    assert.equal(user.displayName, 'کاربر ایجاد');
    assert.equal(user.isActive, true);
    assert.equal(user.status, 'ACTIVE');
    assert.equal(user.hasPassword, true);
    assert.ok(user.roles.some((r) => r.code === 'sales'));
    assert.ok(user.roles[0].labelFa);

    const serialized = JSON.stringify(res.data);
    assert.equal(serialized.includes('password_hash'), false);
    assert.equal(serialized.includes(password), false);
    assert.equal(user.password_hash, undefined);
    assert.equal(user.passwordHash, undefined);
    assert.equal(user.password, undefined);

    const row = await query(`SELECT password_hash FROM users WHERE id = $1`, [user.id]);
    const hash = row.rows[0].password_hash;
    assert.ok(hash && hash.startsWith('$2'));
    assert.equal(await bcrypt.compare(password, hash), true);
    assert.notEqual(hash, password);
  });

  it('duplicate username rejected cleanly', async (t) => {
    if (!dbOk) return t.skip('no database');
    const username = `u_dup_${stamp()}`;
    const first = await json('POST', '/api/v1/users', {
      username,
      displayName: 'اول',
      password: 'DupPass12!',
      roles: ['sales'],
    });
    assert.equal(first.status, 201, JSON.stringify(first.data));
    const second = await json('POST', '/api/v1/users', {
      username,
      displayName: 'دوم',
      password: 'DupPass12!',
      roles: ['purchase'],
    });
    assert.equal(second.status, 409);
    assert.equal(second.data.error, 'USERNAME_EXISTS');
  });

  it('invalid role rejected', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/users', {
      username: `u_badrole_${stamp()}`,
      displayName: 'نقش نامعتبر',
      password: 'BadRole12!',
      roles: ['not_a_real_role'],
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'ROLE_NOT_FOUND');
  });

  it('GET /meta/roles returns canonical assignable roles', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/users/meta/roles');
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.ok(Array.isArray(res.data.roles));
    const admin = res.data.roles.find((r) => r.code === 'admin');
    assert.ok(admin);
    assert.ok(admin.labelFa);
  });

  it('update display name', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/users', {
      username: `u_dn_${stamp()}`,
      displayName: 'نام قدیم',
      password: 'Display8!',
      roles: ['sales'],
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const res = await json('PATCH', `/api/v1/users/${created.data.user.id}`, {
      displayName: 'نام جدید',
    });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.user.displayName, 'نام جدید');
    assert.equal(res.data.user.username, created.data.user.username);
  });

  it('username is immutable', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/users', {
      username: `u_immut_${stamp()}`,
      displayName: 'ثابت',
      password: 'ImmutPass8!',
      roles: ['sales'],
    });
    const res = await json('PATCH', `/api/v1/users/${created.data.user.id}`, {
      username: 'hacked_name',
      displayName: 'ثابت ۲',
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'VALIDATION');
  });

  it('change roles (multi-role supported)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/users', {
      username: `u_roles_${stamp()}`,
      displayName: 'چندنقش',
      password: 'RolesPass8!',
      roles: ['sales'],
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const res = await json('PATCH', `/api/v1/users/${created.data.user.id}`, {
      roles: ['sales', 'purchase'],
    });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    const codes = res.data.user.roles.map((r) => r.code).sort();
    assert.deepEqual(codes, ['purchase', 'sales']);
  });

  it('activate / deactivate user', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/users', {
      username: `u_act_${stamp()}`,
      displayName: 'وضعیت',
      password: 'ActivePass8!',
      roles: ['sales'],
    });
    const id = created.data.user.id;
    const off = await json('PATCH', `/api/v1/users/${id}`, { isActive: false });
    assert.equal(off.status, 200, JSON.stringify(off.data));
    assert.equal(off.data.user.isActive, false);
    const on = await json('PATCH', `/api/v1/users/${id}`, { isActive: true });
    assert.equal(on.status, 200, JSON.stringify(on.data));
    assert.equal(on.data.user.isActive, true);
  });

  it('inactive user cannot login', async (t) => {
    if (!dbOk) return t.skip('no database');
    const username = `u_nologin_${stamp()}`;
    const password = 'NoLogin8!';
    const created = await json('POST', '/api/v1/users', {
      username,
      displayName: 'غیرفعال ورود',
      password,
      roles: ['sales'],
    });
    await json('PATCH', `/api/v1/users/${created.data.user.id}`, { isActive: false });
    const login = await json('POST', '/api/v1/auth/login', { username, password }, null);
    assert.equal(login.status, 401);
    assert.equal(login.data.error, 'INVALID_CREDENTIALS');
  });

  it('password reset allows new password and rejects old', async (t) => {
    if (!dbOk) return t.skip('no database');
    const username = `u_pw_${stamp()}`;
    const oldPassword = 'OldPass88!';
    const newPassword = 'NewPass88!';
    const created = await json('POST', '/api/v1/users', {
      username,
      displayName: 'رمز',
      password: oldPassword,
      roles: ['sales'],
    });
    const id = created.data.user.id;
    const reset = await json('POST', `/api/v1/users/${id}/password`, { password: newPassword });
    assert.equal(reset.status, 200, JSON.stringify(reset.data));
    assert.equal(reset.data.ok, true);
    const serialized = JSON.stringify(reset.data);
    assert.equal(serialized.includes(newPassword), false);
    assert.equal(serialized.includes('password_hash'), false);

    const oldLogin = await json('POST', '/api/v1/auth/login', { username, password: oldPassword }, null);
    assert.equal(oldLogin.status, 401);

    const newLogin = await json('POST', '/api/v1/auth/login', { username, password: newPassword }, null);
    assert.equal(newLogin.status, 200, JSON.stringify(newLogin.data));
    assert.ok(newLogin.data.accessToken);
  });
});

describe('last-active-admin invariant', () => {
  it('cannot deactivate last active admin', async (t) => {
    if (!dbOk) return t.skip('no database');
    const extras = await query(
      `SELECT u.id FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = $1
       WHERE u.is_active = TRUE AND u.id <> $2`,
      [ADMIN_ROLE_CODE, seedAdminId],
    );
    for (const row of extras.rows) {
      await query(`UPDATE users SET is_active = FALSE WHERE id = $1`, [row.id]);
    }
    try {
      const res = await json('PATCH', `/api/v1/users/${seedAdminId}`, { isActive: false });
      assert.equal(res.status, 409, JSON.stringify(res.data));
      assert.equal(res.data.error, 'LAST_ACTIVE_ADMIN_REQUIRED');
      const still = await query(`SELECT is_active FROM users WHERE id = $1`, [seedAdminId]);
      assert.equal(still.rows[0].is_active, true);
    } finally {
      for (const row of extras.rows) {
        await query(`UPDATE users SET is_active = TRUE WHERE id = $1`, [row.id]);
      }
    }
  });

  it('cannot remove admin role from last active admin', async (t) => {
    if (!dbOk) return t.skip('no database');
    const extras = await query(
      `SELECT u.id FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = $1
       WHERE u.is_active = TRUE AND u.id <> $2`,
      [ADMIN_ROLE_CODE, seedAdminId],
    );
    for (const row of extras.rows) {
      await query(`DELETE FROM user_roles WHERE user_id = $1 AND role_code = $2`, [row.id, ADMIN_ROLE_CODE]);
    }
    try {
      const res = await json('PATCH', `/api/v1/users/${seedAdminId}`, { roles: ['sales'] });
      assert.equal(res.status, 409, JSON.stringify(res.data));
      assert.equal(res.data.error, 'LAST_ACTIVE_ADMIN_REQUIRED');
      const roles = await query(
        `SELECT role_code FROM user_roles WHERE user_id = $1 AND role_code = $2`,
        [seedAdminId, ADMIN_ROLE_CODE],
      );
      assert.equal(roles.rows.length, 1);
    } finally {
      for (const row of extras.rows) {
        await query(
          `INSERT INTO user_roles (user_id, role_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [row.id, ADMIN_ROLE_CODE],
        );
        await query(`UPDATE users SET is_active = TRUE WHERE id = $1`, [row.id]);
      }
    }
  });

  it('operation succeeds if another active admin exists', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/users', {
      username: `u_admin2_${stamp()}`,
      displayName: 'مدیر دوم',
      password: 'AdminTwo8!',
      roles: ['admin'],
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const extraId = created.data.user.id;
    const off = await json('PATCH', `/api/v1/users/${extraId}`, { isActive: false });
    assert.equal(off.status, 200, JSON.stringify(off.data));
    assert.equal(off.data.user.isActive, false);
    const rolesOff = await json('PATCH', `/api/v1/users/${extraId}`, {
      isActive: true,
      roles: ['sales'],
    });
    assert.equal(rolesOff.status, 200, JSON.stringify(rolesOff.data));
    assert.equal(rolesOff.data.user.roles.some((r) => r.code === 'admin'), false);
  });

  it('concurrency protects last-admin invariant', async (t) => {
    if (!dbOk) return t.skip('no database');
    const userService = await import('../services/userService.js');
    const password = 'RaceAdmin8!';
    const a = await json('POST', '/api/v1/users', {
      username: `u_race_a_${stamp()}`,
      displayName: 'مسابقه الف',
      password,
      roles: ['admin'],
    });
    const b = await json('POST', '/api/v1/users', {
      username: `u_race_b_${stamp()}`,
      displayName: 'مسابقه ب',
      password,
      roles: ['admin'],
    });
    assert.equal(a.status, 201, JSON.stringify(a.data));
    assert.equal(b.status, 201, JSON.stringify(b.data));
    const idA = a.data.user.id;
    const idB = b.data.user.id;

    const others = await query(
      `SELECT u.id FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = $1
       WHERE u.is_active = TRUE AND u.id <> ALL($2::text[])`,
      [ADMIN_ROLE_CODE, [idA, idB]],
    );
    const otherAdminIds = others.rows.map((r) => r.id);
    for (const id of otherAdminIds) {
      await query(`UPDATE users SET is_active = FALSE WHERE id = $1`, [id]);
    }

    try {
      assert.equal(await countActiveAdmins(), 2, 'race setup must isolate to two active admins');
      const results = await Promise.allSettled([
        userService.updateUser(idA, { isActive: false }, idB),
        userService.updateUser(idB, { isActive: false }, idA),
      ]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      assert.equal(
        fulfilled.length,
        1,
        JSON.stringify(results.map((r) => (r.status === 'rejected' ? r.reason?.code : 'ok'))),
      );
      assert.equal(rejected.length, 1);
      assert.equal(rejected[0].reason?.code, 'LAST_ACTIVE_ADMIN_REQUIRED');
      assert.equal(await countActiveAdmins(), 1);
    } finally {
      for (const id of otherAdminIds) {
        await query(`UPDATE users SET is_active = TRUE WHERE id = $1`, [id]);
      }
      await restoreSeedAdmin();
      await query(`UPDATE users SET is_active = TRUE WHERE id = ANY($1::text[])`, [[idA, idB]]);
    }
  });
});

describe('users audit', () => {
  it('audit rows exist for mutations and contain no password/hash', async (t) => {
    if (!dbOk) return t.skip('no database');
    const username = `u_audit_${stamp()}`;
    const password = 'AuditSecret9!';
    const created = await json('POST', '/api/v1/users', {
      username,
      displayName: 'حسابرسی',
      password,
      roles: ['sales'],
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const id = created.data.user.id;
    await json('PATCH', `/api/v1/users/${id}`, { displayName: 'حسابرسی ۲' });
    await json('PATCH', `/api/v1/users/${id}`, { isActive: false });
    await json('PATCH', `/api/v1/users/${id}`, { isActive: true });
    await json('PATCH', `/api/v1/users/${id}`, { roles: ['sales', 'purchase'] });
    await json('POST', `/api/v1/users/${id}/password`, { password: 'AuditReset9!' });

    const logs = await query(
      `SELECT action, detail FROM audit_log WHERE entity_type = 'user' AND entity_id = $1`,
      [id],
    );
    const actions = logs.rows.map((r) => r.action);
    for (const needed of [
      'user.create',
      'user.update',
      'user.deactivate',
      'user.activate',
      'user.roles.update',
      'user.password.reset',
    ]) {
      assert.ok(actions.includes(needed), `missing audit action ${needed}: ${actions.join(',')}`);
    }

    const blob = JSON.stringify(logs.rows);
    assert.equal(blob.includes(password), false);
    assert.equal(blob.includes('AuditReset9!'), false);
    assert.equal(blob.includes('password_hash'), false);
    assert.equal(/\$2[aby]\$/.test(blob), false);
  });

  it('USER_NOT_FOUND for unknown id', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/users/u_does_not_exist');
    assert.equal(res.status, 404);
    assert.equal(res.data.error, 'USER_NOT_FOUND');
  });
});

describe('user profile + organization assignment (DDL-39)', () => {
  it('creates INVITED user without password and generates internal username', async (t) => {
    if (!dbOk) return t.skip('no database');
    const mobile = `0912${String(Date.now()).slice(-7)}`.slice(0, 11);
    const res = await json('POST', '/api/v1/users', {
      fullName: 'کاربر تست سازمانی',
      mobile,
      email: `org-user-${stamp()}@example.com`,
      roles: ['sales'],
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    const user = res.data.user;
    assert.equal(user.fullName, 'کاربر تست سازمانی');
    assert.equal(user.displayName, 'کاربر تست سازمانی');
    assert.equal(user.mobile, mobile);
    assert.equal(user.status, 'INVITED');
    assert.equal(user.hasPassword, false);
    assert.match(user.username, /^user_[0-9]+$/);
    assert.equal(user.password, undefined);
    assert.equal(res.data.invitation?.sent, true);

    const login = await json('POST', '/api/v1/auth/login', {
      username: user.username,
      password: 'anything1',
    }, null);
    assert.equal(login.status, 401);

    const adminStill = await json('POST', '/api/v1/auth/login', {
      username: 'admin',
      password: 'Admin123!',
    }, null);
    assert.equal(adminStill.status, 200, JSON.stringify(adminStill.data));
  });

  it('rejects duplicate mobile after normalization', async (t) => {
    if (!dbOk) return t.skip('no database');
    const unique = String(Date.now()).slice(-7);
    const mobile = `0913${unique}`.slice(0, 11);
    const first = await json('POST', '/api/v1/users', {
      fullName: 'موبایل یک',
      mobile,
      roles: ['sales'],
    });
    assert.equal(first.status, 201, JSON.stringify(first.data));
    const persian = mobile.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
    const second = await json('POST', '/api/v1/users', {
      fullName: 'موبایل دو',
      mobile: persian,
      roles: ['sales'],
    });
    assert.equal(second.status, 409, JSON.stringify(second.data));
    assert.equal(second.data.error, 'MOBILE_EXISTS');
  });

  it('creates user with unit/position in one transaction without changing roles from position', async (t) => {
    if (!dbOk) return t.skip('no database');
    const unitRes = await json('POST', '/api/v1/organization/units', {
      name: `فروش آزمون ${stamp()}`,
      parentId: 'ou_root',
    });
    assert.equal(unitRes.status, 201, JSON.stringify(unitRes.data));
    const unitId = unitRes.data.unit.id;
    const expertRes = await json('POST', '/api/v1/organization/positions', {
      unitId,
      title: 'کارشناس فروش',
    });
    assert.equal(expertRes.status, 201, JSON.stringify(expertRes.data));
    const managerRes = await json('POST', '/api/v1/organization/positions', {
      unitId,
      title: 'مدیر فروش',
    });
    assert.equal(managerRes.status, 201, JSON.stringify(managerRes.data));

    const mobile = `0914${String(Date.now()).slice(-7)}`.slice(0, 11);
    const created = await json('POST', '/api/v1/users', {
      fullName: 'کارشناس آزمون',
      mobile,
      email: `sales-qa-${stamp()}@example.com`,
      roles: ['sales'],
      organization: { unitId, positionId: expertRes.data.position.id },
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    assert.equal(created.data.user.organization?.unitId, unitId);
    assert.equal(created.data.user.organization?.positionId, expertRes.data.position.id);
    assert.deepEqual(created.data.user.roles.map((r) => r.code), ['sales']);

    const moved = await json('PATCH', `/api/v1/users/${created.data.user.id}`, {
      organization: { unitId, positionId: managerRes.data.position.id },
    });
    assert.equal(moved.status, 200, JSON.stringify(moved.data));
    assert.equal(moved.data.user.organization?.positionId, managerRes.data.position.id);
    assert.deepEqual(moved.data.user.roles.map((r) => r.code), ['sales']);

    const roleChanged = await json('PATCH', `/api/v1/users/${created.data.user.id}`, {
      roles: ['purchase'],
    });
    assert.equal(roleChanged.status, 200, JSON.stringify(roleChanged.data));
    assert.deepEqual(roleChanged.data.user.roles.map((r) => r.code), ['purchase']);
    assert.equal(roleChanged.data.user.organization?.positionId, managerRes.data.position.id);
  });
});
