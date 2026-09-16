/**
 * Activity API integration tests — DDL-15 Pooyesh SSOT.
 * Requires PostgreSQL + seeded admin (run: cd backend && npm run setup).
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
    console.warn('[activity-integration] DB unavailable — skipping:', err.message);
    return;
  }

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;

  const login = await json('POST', '/api/v1/auth/login', {
    username: 'admin',
    password: 'Admin123!',
  }, null);
  if (login.status !== 200) {
    throw new Error(`Login failed (${login.status}). Run: cd backend && npm run setup`);
  }
  token = login.data.accessToken || login.data.token;

  const co = await json('POST', '/api/v1/companies', {
    name: `Act-Co-${Date.now()}`,
    entityType: 'CUSTOMER',
  });
  assert.equal(co.status, 201, JSON.stringify(co.data));
  companyId = co.data.company.id;

  const lead = await json('POST', '/api/v1/leads', {
    companyName: `Act-Lead-${Date.now()}`,
    personName: 'رضا',
    mobile: '09123334455',
    leadSource: 'تست',
  });
  assert.equal(lead.status, 201, JSON.stringify(lead.data));
  leadId = lead.data.lead.id;

  const limitedId = `u_act_limited_${Date.now().toString(36)}`;
  const hash = await bcrypt.hash('Limited123!', 10);
  await query(
    `INSERT INTO users (id, username, display_name, password_hash)
     VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING`,
    [limitedId, 'act_limited', 'Act Limited', hash],
  );
  const limUser = await query(`SELECT id FROM users WHERE username = 'act_limited'`);
  const limId = limUser.rows[0].id;
  await query(
    `INSERT INTO user_roles (user_id, role_code) VALUES ($1, 'accounting')
     ON CONFLICT DO NOTHING`,
    [limId],
  );
  const limLogin = await json('POST', '/api/v1/auth/login', {
    username: 'act_limited',
    password: 'Limited123!',
  }, null);
  if (limLogin.status === 200) {
    limitedToken = limLogin.data.accessToken || limLogin.data.token;
  }
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end().catch(() => {});
});

describe('Company Activity', () => {
  let activityId;

  it('create for active Company → success', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/activities', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      activityType: 'call',
      description: 'تماس شرکت',
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.activity.status, 'OPEN');
    assert.equal(res.data.activity.subjectType, 'COMPANY');
    activityId = res.data.activity.id;

    const audit = await query(
      `SELECT action FROM audit_log WHERE entity_type = 'activity' AND entity_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [activityId],
    );
    assert.equal(audit.rows[0]?.action, 'activity.create');
  });

  it('listBySubject Company → returns Activity', async (t) => {
    if (!dbOk) return t.skip('no database');
    const list = await json(
      'GET',
      `/api/v1/activities?subjectType=COMPANY&subjectId=${encodeURIComponent(companyId)}`,
    );
    assert.equal(list.status, 200);
    assert.ok(list.data.items.some((a) => a.id === activityId));
  });
});

describe('Raw Lead Activity', () => {
  let leadActivityId;

  it('create for active Raw Lead → success', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/activities', {
      subjectType: 'RAW_LEAD',
      subjectId: leadId,
      type: 'note',
      note: 'یادداشت سرنخ',
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.activity.subjectType, 'RAW_LEAD');
    leadActivityId = res.data.activity.id;
  });

  it('listBySubject Raw Lead → returns Activity', async (t) => {
    if (!dbOk) return t.skip('no database');
    const list = await json(
      'GET',
      `/api/v1/activities?subjectType=RAW_LEAD&subjectId=${encodeURIComponent(leadId)}`,
    );
    assert.equal(list.status, 200);
    assert.ok(list.data.items.some((a) => a.id === leadActivityId));
  });
});

describe('Invalid Subject', () => {
  it('unknown Company → INVALID_ENTITY_REFERENCE', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/activities', {
      subjectType: 'COMPANY',
      subjectId: 'co_does_not_exist',
      note: 'x',
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'INVALID_ENTITY_REFERENCE');
  });

  it('archived Lead → INVALID_ENTITY_REFERENCE', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/leads', {
      companyName: `Arch-Lead-${Date.now()}`,
      personName: 'ب',
      mobile: '09120000001',
      leadSource: 'تست',
    });
    const id = created.data.lead.id;
    await json('POST', `/api/v1/leads/${id}/archive`, { reason: 'activity test cleanup' });
    const res = await json('POST', '/api/v1/activities', {
      subjectType: 'RAW_LEAD',
      subjectId: id,
      note: 'روی آرشیو',
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'INVALID_ENTITY_REFERENCE');
  });
});

describe('Activity RBAC', () => {
  it('unauthenticated → 401', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/activities', undefined, null);
    assert.equal(res.status, 401);
  });

  it('without activities:read → 403', async (t) => {
    if (!dbOk || !limitedToken) return t.skip('no limited token');
    const res = await json('GET', '/api/v1/activities', undefined, limitedToken);
    assert.equal(res.status, 403);
  });

  it('without activities:write → 403', async (t) => {
    if (!dbOk || !limitedToken) return t.skip('no limited token');
    const res = await json('POST', '/api/v1/activities', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      note: 'forbidden',
    }, limitedToken);
    assert.equal(res.status, 403);
  });
});

describe('Update / Complete / Archive', () => {
  let actId;

  it('update activity → persisted + audit', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/activities', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      note: 'قبل از ویرایش',
      activityType: 'note',
    });
    actId = created.data.activity.id;
    const res = await json('PATCH', `/api/v1/activities/${actId}`, {
      description: 'بعد از ویرایش',
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.activity.description, 'بعد از ویرایش');
    const audit = await query(
      `SELECT action FROM audit_log WHERE entity_id = $1 AND action = 'activity.update' LIMIT 1`,
      [actId],
    );
    assert.equal(audit.rows[0]?.action, 'activity.update');
  });

  it('OPEN → COMPLETED → audit', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/activities/${actId}/complete`);
    assert.equal(res.status, 200);
    assert.equal(res.data.activity.status, 'COMPLETED');
    assert.ok(res.data.activity.completedAt);
    const audit = await query(
      `SELECT action FROM audit_log WHERE entity_id = $1 AND action = 'activity.complete' LIMIT 1`,
      [actId],
    );
    assert.equal(audit.rows[0]?.action, 'activity.complete');
  });

  it('COMPLETED → complete again → rejected', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/activities/${actId}/complete`);
    assert.equal(res.status, 409);
    assert.equal(res.data.error, 'ACTIVITY_ALREADY_COMPLETED');
  });

  it('archive → soft-delete + absent from active list + audit', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/activities', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      note: 'برای آرشیو',
    });
    const id = created.data.activity.id;
    const del = await json('DELETE', `/api/v1/activities/${id}`);
    assert.equal(del.status, 200);
    assert.equal(del.data.archived, true);

    const list = await json(
      'GET',
      `/api/v1/activities?subjectType=COMPANY&subjectId=${encodeURIComponent(companyId)}`,
    );
    assert.ok(!list.data.items.some((a) => a.id === id));

    const get = await json('GET', `/api/v1/activities/${id}`);
    assert.equal(get.status, 404);

    const audit = await query(
      `SELECT action FROM audit_log WHERE entity_id = $1 AND action = 'activity.archive' LIMIT 1`,
      [id],
    );
    assert.equal(audit.rows[0]?.action, 'activity.archive');
  });
});
