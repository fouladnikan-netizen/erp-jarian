/**
 * Backend API integration tests — Company + Order (repository path).
 * Requires PostgreSQL (same DATABASE_URL as backend/.env) and seeded admin.
 *
 *   cd backend && npm test
 *
 * Skips cleanly when DB is unreachable.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.JARIAN_SKIP_LISTEN = '1';

const { createApp } = await import('../index.js');
const { pool, query } = await import('../db/pool.js');

let server;
let baseUrl;
let token;
let dbOk = false;

async function json(method, path, body, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;
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
  return { status: res.status, data, headers: res.headers };
}

before(async () => {
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    console.warn('[integration] DB unavailable — skipping:', err.message);
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
  }, false);

  if (login.status !== 200 || !(login.data?.accessToken || login.data?.token)) {
    throw new Error(
      `Login failed (${login.status}). Run: cd backend && npm run setup — ${JSON.stringify(login.data)}`,
    );
  }
  token = login.data.accessToken || login.data.token;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end().catch(() => {});
});

describe('health', () => {
  it('reports db up', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/health', undefined, false);
    assert.equal(res.status, 200);
    assert.equal(res.data.db, 'up');
    assert.ok(res.headers.get('x-request-id'));
  });
});

describe('Company via repository path', () => {
  let companyId;

  it('creates company + audit', async (t) => {
    if (!dbOk) return t.skip('no database');
    const name = `IT-Co-${Date.now()}`;
    const res = await json('POST', '/api/v1/companies', {
      name,
      entityType: 'CUSTOMER',
      province: 'تهران',
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.ok(res.data.company?.id?.startsWith('co_'));
    companyId = res.data.company.id;

    const audit = await query(
      `SELECT action FROM audit_log WHERE entity_type = 'company' AND entity_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [companyId],
    );
    assert.equal(audit.rows[0]?.action, 'company.create');
  });

  it('lists active company', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', `/api/v1/companies?q=${encodeURIComponent('IT-Co-')}`);
    assert.equal(res.status, 200);
    assert.ok(res.data.items.some((c) => c.id === companyId));
  });

  it('updates company', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/companies/${companyId}`, {
      phone: '02100000000',
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.company.phone, '02100000000');
  });

  it('archives (soft-delete) and hides from list/get', async (t) => {
    if (!dbOk) return t.skip('no database');
    const del = await json('DELETE', `/api/v1/companies/${companyId}`);
    assert.equal(del.status, 200);
    assert.equal(del.data.archived, true);

    const get = await json('GET', `/api/v1/companies/${companyId}`);
    assert.equal(get.status, 404);

    const row = await query(`SELECT deleted_at, deleted_by FROM companies WHERE id = $1`, [companyId]);
    assert.ok(row.rows[0].deleted_at);
    assert.ok(row.rows[0].deleted_by);
  });

  it('rejects unauthenticated write', async (t) => {
    if (!dbOk) return t.skip('no database');
    const prev = token;
    token = null;
    const res = await json('POST', '/api/v1/companies', { name: 'Nope' });
    token = prev;
    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'UNAUTHORIZED');
  });
});

describe('Order via repository path', () => {
  let companyId;
  let orderId;
  let version;

  it('creates company host + order', async (t) => {
    if (!dbOk) return t.skip('no database');
    const co = await json('POST', '/api/v1/companies', {
      name: `IT-OrdCo-${Date.now()}`,
      entityType: 'CUSTOMER',
      nationalId: `2${String(Date.now()).slice(-10)}`,
      payload: { personType: 'legal', recordType: 'CUSTOMER' },
    });
    assert.equal(co.status, 201);
    companyId = co.data.company.id;

    const res = await json('POST', '/api/v1/orders', {
      companyId,
      code: `JR-IT-${Date.now()}`,
      title: 'Integration order',
      stageId: 'inquiry',
      status: 'open',
      payload: { items: [{ name: 'pipe' }] },
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.ok(res.data.order?.id?.startsWith('ord_'));
    orderId = res.data.order.id;
    version = res.data.order.version;
    assert.equal(typeof version, 'number');
    // Legacy aliases normalize to Nabz vocabulary
    assert.equal(res.data.order.stageId, '1');
    assert.equal(res.data.order.status, 'current');
  });

  it('updates with version and bumps version', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/orders/${orderId}`, {
      title: 'Updated title',
      stageId: '3',
      version,
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.order.title, 'Updated title');
    assert.equal(res.data.order.stageId, '3');
    assert.equal(res.data.order.version, version + 1);
    version = res.data.order.version;
  });

  it('rejects update without version', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/orders/${orderId}`, {
      title: 'No version',
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'VALIDATION');
  });

  it('returns VERSION_CONFLICT on stale version', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/orders/${orderId}`, {
      title: 'Stale',
      version: 1,
    });
    assert.equal(res.status, 409);
    assert.equal(res.data.error, 'VERSION_CONFLICT');
  });

  it('archives order and hides from get', async (t) => {
    if (!dbOk) return t.skip('no database');
    const del = await json('DELETE', `/api/v1/orders/${orderId}`);
    assert.equal(del.status, 200);
    assert.equal(del.data.archived, true);

    const get = await json('GET', `/api/v1/orders/${orderId}`);
    assert.equal(get.status, 404);

    const audit = await query(
      `SELECT action FROM audit_log WHERE entity_type = 'order' AND entity_id = $1 AND action = 'order.archive'`,
      [orderId],
    );
    assert.ok(audit.rows.length >= 1);

    // cleanup host company
    await json('DELETE', `/api/v1/companies/${companyId}`);
  });
});
