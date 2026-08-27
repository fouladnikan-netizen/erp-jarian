/**
 * Task API integration tests — DDL-16 Pooyesh SSOT.
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
let token;
let dbOk = false;
let limitedToken = null;
let companyId;
let leadId;
let adminUserId;

async function json(method, path, body, authToken = token) {
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

before(async () => {
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    console.warn('[task-integration] DB unavailable — skipping:', err.message);
    return;
  }

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const login = await json('POST', '/api/v1/auth/login', {
    username: 'admin',
    password: 'Admin123!',
  }, null);
  if (login.status !== 200) {
    throw new Error(`Login failed — run: cd backend && npm run setup`);
  }
  token = login.data.accessToken || login.data.token;
  const admin = await query(`SELECT id FROM users WHERE username = 'admin'`);
  adminUserId = admin.rows[0].id;

  const co = await json('POST', '/api/v1/companies', {
    name: `Task-Co-${Date.now()}`,
    entityType: 'CUSTOMER',
  });
  assert.equal(co.status, 201, JSON.stringify(co.data));
  companyId = co.data.company.id;

  const lead = await json('POST', '/api/v1/leads', {
    companyName: `Task-Lead-${Date.now()}`,
    personName: 'سارا',
    mobile: '09125556677',
    leadSource: 'تست',
  });
  assert.equal(lead.status, 201, JSON.stringify(lead.data));
  leadId = lead.data.lead.id;

  const limitedId = `u_task_limited_${Date.now().toString(36)}`;
  const hash = await bcrypt.hash('Limited123!', 10);
  await query(
    `INSERT INTO users (id, username, display_name, password_hash)
     VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING`,
    [limitedId, 'task_limited', 'Task Limited', hash],
  );
  const limUser = await query(`SELECT id FROM users WHERE username = 'task_limited'`);
  await query(
    `INSERT INTO user_roles (user_id, role_code) VALUES ($1, 'accounting')
     ON CONFLICT DO NOTHING`,
    [limUser.rows[0].id],
  );
  const limLogin = await json('POST', '/api/v1/auth/login', {
    username: 'task_limited',
    password: 'Limited123!',
  }, null);
  if (limLogin.status === 200) {
    limitedToken = limLogin.data.accessToken || limLogin.data.token;
  }
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});
});

describe('Company Task', () => {
  let taskId;

  it('create for Company → success', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/tasks', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      title: 'پیگیری شرکت',
      assignedTo: adminUserId,
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.task.status, 'OPEN');
    taskId = res.data.task.id;
    const audit = await query(
      `SELECT action FROM audit_log WHERE entity_type = 'task' AND entity_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [taskId],
    );
    assert.equal(audit.rows[0]?.action, 'task.create');
  });

  it('list by Company → success', async (t) => {
    if (!dbOk) return t.skip('no database');
    const list = await json(
      'GET',
      `/api/v1/tasks?subjectType=COMPANY&subjectId=${encodeURIComponent(companyId)}`,
    );
    assert.equal(list.status, 200);
    assert.ok(list.data.items.some((x) => x.id === taskId));
  });
});

describe('Raw Lead Task', () => {
  let taskId;

  it('create for Raw Lead → success', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/tasks', {
      subjectType: 'RAW_LEAD',
      subjectId: leadId,
      title: 'پیگیری سرنخ',
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    taskId = res.data.task.id;
  });

  it('list by Raw Lead → success', async (t) => {
    if (!dbOk) return t.skip('no database');
    const list = await json(
      'GET',
      `/api/v1/tasks?subjectType=RAW_LEAD&subjectId=${encodeURIComponent(leadId)}`,
    );
    assert.equal(list.status, 200);
    assert.ok(list.data.items.some((x) => x.id === taskId));
  });
});

describe('Invalid Subject / Assignee', () => {
  it('unknown subject → rejected', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/tasks', {
      subjectType: 'COMPANY',
      subjectId: 'co_missing',
      title: 'x',
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'INVALID_ENTITY_REFERENCE');
  });

  it('invalid assignee → rejected', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/tasks', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      title: 'با مسئول بد',
      assignedTo: 'u_does_not_exist',
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'INVALID_ASSIGNEE');
  });
});

describe('Task RBAC', () => {
  it('unauthenticated → 401', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/tasks', undefined, null);
    assert.equal(res.status, 401);
  });

  it('without tasks:write → 403', async (t) => {
    if (!dbOk || !limitedToken) return t.skip('no limited token');
    const res = await json('POST', '/api/v1/tasks', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      title: 'forbidden',
    }, limitedToken);
    assert.equal(res.status, 403);
  });
});

describe('Status / Complete / Archive', () => {
  let taskId;

  it('valid transition → success', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/tasks', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      title: 'وضعیت',
    });
    taskId = created.data.task.id;
    const res = await json('PATCH', `/api/v1/tasks/${taskId}/status`, {
      status: 'IN_PROGRESS',
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.task.status, 'IN_PROGRESS');
  });

  it('invalid transition → rejected', async (t) => {
    if (!dbOk) return t.skip('no database');
    await json('PATCH', `/api/v1/tasks/${taskId}/complete`);
    const res = await json('PATCH', `/api/v1/tasks/${taskId}/status`, {
      status: 'OPEN',
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'INVALID_TASK_STATUS');
  });

  it('complete → persisted + audit; twice → rejected', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/tasks', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      title: 'کامل',
    });
    const id = created.data.task.id;
    const once = await json('PATCH', `/api/v1/tasks/${id}/complete`);
    assert.equal(once.status, 200);
    assert.equal(once.data.task.status, 'COMPLETED');
    const audit = await query(
      `SELECT action FROM audit_log WHERE entity_id = $1 AND action = 'task.complete' LIMIT 1`,
      [id],
    );
    assert.equal(audit.rows[0]?.action, 'task.complete');
    const twice = await json('PATCH', `/api/v1/tasks/${id}/complete`);
    assert.equal(twice.status, 409);
    assert.equal(twice.data.error, 'TASK_ALREADY_COMPLETED');
  });

  it('archive → soft-delete', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/tasks', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      title: 'آرشیو',
    });
    const id = created.data.task.id;
    const del = await json('DELETE', `/api/v1/tasks/${id}`);
    assert.equal(del.status, 200);
    assert.equal(del.data.archived, true);
    const get = await json('GET', `/api/v1/tasks/${id}`);
    assert.equal(get.status, 404);
  });
});
