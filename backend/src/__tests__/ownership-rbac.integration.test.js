/**
 * Ownership / RBAC scoping for Activity + Task mutations (Gap 4).
 * Backend-enforced, independent of any FE affordance — proves that a
 * `sales`-role actor who is neither creator nor assignee cannot mutate
 * another actor's Task/Activity, while the owner/assignee and `admin` can.
 *
 * Equivalent to Journey 011 in the QA plan, implemented here (not Playwright)
 * because it requires two distinct authenticated backend actors and must
 * prove server-side enforcement independent of the UI.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import bcrypt from 'bcryptjs';

process.env.JARIAN_SKIP_LISTEN = '1';

const { createApp } = await import('../index.js');
const { pool, query } = await import('../db/pool.js');

let server;
let baseUrl;
let dbOk = false;
let adminToken;
let userAToken;
let userBToken;
let userAId;
let companyId;

async function json(method, path, body, authToken) {
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

async function ensureUser(username, password, roleCode) {
  const existing = await query(`SELECT id FROM users WHERE username = $1`, [username]);
  let id = existing.rows[0]?.id;
  if (!id) {
    id = `u_${username}_${Date.now().toString(36)}`;
    const hash = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO users (id, username, display_name, password_hash) VALUES ($1, $2, $3, $4)`,
      [id, username, username, hash],
    );
  }
  await query(
    `INSERT INTO user_roles (user_id, role_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [id, roleCode],
  );
  const login = await json('POST', '/api/v1/auth/login', { username, password }, null);
  assert.equal(login.status, 200, `login failed for ${username}: ${JSON.stringify(login.data)}`);
  return { id, token: login.data.accessToken || login.data.token };
}

before(async () => {
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    console.warn('[ownership-rbac] DB unavailable — skipping:', err.message);
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

  const stamp = Date.now().toString(36);
  const userA = await ensureUser(`own_a_${stamp}`, 'OwnerA123!', 'sales');
  const userB = await ensureUser(`own_b_${stamp}`, 'OwnerB123!', 'sales');
  userAId = userA.id;
  userAToken = userA.token;
  userBToken = userB.token;

  const co = await json('POST', '/api/v1/companies', {
    name: `Owner-Co-${stamp}`,
    entityType: 'CUSTOMER',
  }, adminToken);
  assert.equal(co.status, 201, JSON.stringify(co.data));
  companyId = co.data.company.id;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});
});

describe('Task ownership scoping', () => {
  let taskId;

  it('User A creates a Task assigned to self', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/tasks', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      title: 'وظیفه اختصاصی کاربر الف',
      assignedTo: userAId,
    }, userAToken);
    assert.equal(res.status, 201, JSON.stringify(res.data));
    taskId = res.data.task.id;
  });

  it('User B (not owner/assignee) cannot update it → 403 OWNERSHIP_FORBIDDEN', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/tasks/${taskId}`, {
      title: 'تلاش برای دستکاری',
    }, userBToken);
    assert.equal(res.status, 403, JSON.stringify(res.data));
    assert.equal(res.data.error, 'OWNERSHIP_FORBIDDEN');
  });

  it('User B cannot complete it → 403 OWNERSHIP_FORBIDDEN (not silent 200)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/tasks/${taskId}/complete`, undefined, userBToken);
    assert.equal(res.status, 403, JSON.stringify(res.data));
    assert.equal(res.data.error, 'OWNERSHIP_FORBIDDEN');
  });

  it('User B cannot change status → 403 OWNERSHIP_FORBIDDEN', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/tasks/${taskId}/status`, { status: 'IN_PROGRESS' }, userBToken);
    assert.equal(res.status, 403, JSON.stringify(res.data));
    assert.equal(res.data.error, 'OWNERSHIP_FORBIDDEN');
  });

  it('User B cannot archive it → 403 OWNERSHIP_FORBIDDEN', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('DELETE', `/api/v1/tasks/${taskId}`, undefined, userBToken);
    assert.equal(res.status, 403, JSON.stringify(res.data));
    assert.equal(res.data.error, 'OWNERSHIP_FORBIDDEN');
  });

  it('User A (assignee/creator) CAN update it → 200', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/tasks/${taskId}`, {
      title: 'ویرایش توسط مالک',
    }, userAToken);
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.task.title, 'ویرایش توسط مالک');
  });

  it('User A (assignee/creator) CAN complete it → 200', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/tasks/${taskId}/complete`, undefined, userAToken);
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.task.status, 'COMPLETED');
  });

  it('admin (elevated role) CAN mutate a Task it neither created nor is assigned to', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/tasks', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      title: 'وظیفه برای تست مدیر',
      assignedTo: userAId,
    }, userAToken);
    const id = created.data.task.id;

    const res = await json('PATCH', `/api/v1/tasks/${id}`, { title: 'ویرایش توسط مدیر' }, adminToken);
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.task.title, 'ویرایش توسط مدیر');

    const done = await json('PATCH', `/api/v1/tasks/${id}/complete`, undefined, adminToken);
    assert.equal(done.status, 200, JSON.stringify(done.data));
  });
});

describe('Activity ownership scoping', () => {
  let activityId;

  it('User A creates an Activity assigned to self', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/activities', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      activityType: 'note',
      note: 'یادداشت اختصاصی کاربر الف',
      assignedTo: userAId,
    }, userAToken);
    assert.equal(res.status, 201, JSON.stringify(res.data));
    activityId = res.data.activity.id;
  });

  it('User B cannot update it → 403 OWNERSHIP_FORBIDDEN', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/activities/${activityId}`, {
      description: 'تلاش برای دستکاری',
    }, userBToken);
    assert.equal(res.status, 403, JSON.stringify(res.data));
    assert.equal(res.data.error, 'OWNERSHIP_FORBIDDEN');
  });

  it('User B cannot complete it → 403 OWNERSHIP_FORBIDDEN', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/activities/${activityId}/complete`, undefined, userBToken);
    assert.equal(res.status, 403, JSON.stringify(res.data));
    assert.equal(res.data.error, 'OWNERSHIP_FORBIDDEN');
  });

  it('User B cannot archive it → 403 OWNERSHIP_FORBIDDEN', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('DELETE', `/api/v1/activities/${activityId}`, undefined, userBToken);
    assert.equal(res.status, 403, JSON.stringify(res.data));
    assert.equal(res.data.error, 'OWNERSHIP_FORBIDDEN');
  });

  it('User A (owner) CAN update and complete it → 200', async (t) => {
    if (!dbOk) return t.skip('no database');
    const upd = await json('PATCH', `/api/v1/activities/${activityId}`, {
      description: 'ویرایش توسط مالک',
    }, userAToken);
    assert.equal(upd.status, 200, JSON.stringify(upd.data));

    const done = await json('PATCH', `/api/v1/activities/${activityId}/complete`, undefined, userAToken);
    assert.equal(done.status, 200, JSON.stringify(done.data));
    assert.equal(done.data.activity.status, 'COMPLETED');
  });

  it('admin (elevated role) CAN mutate an Activity it neither created nor is assigned to', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/activities', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      activityType: 'note',
      note: 'برای تست مدیر',
      assignedTo: userAId,
    }, userAToken);
    const id = created.data.activity.id;

    const res = await json('PATCH', `/api/v1/activities/${id}`, { description: 'ویرایش توسط مدیر' }, adminToken);
    assert.equal(res.status, 200, JSON.stringify(res.data));
  });
});
