/**
 * Correspondence Type Registry (DDL-23d) — real backend-persisted CRUD,
 * consumed by Correspondence creation validation. Mirrors
 * activity-type-registry.integration.test.js.
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
    console.warn('[correspondence-type-registry] DB unavailable — skipping:', err.message);
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
  assert.equal(login.status, 200, 'admin login failed — run: cd backend && npm run setup');
  token = login.data.accessToken || login.data.token;

  const limitedId = `u_ctype_limited_${Date.now().toString(36)}`;
  const hash = await bcrypt.hash('Limited123!', 10);
  await query(
    `INSERT INTO users (id, username, display_name, password_hash)
     VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING`,
    [limitedId, 'ctype_limited', 'Ctype Limited', hash],
  );
  const limUser = await query(`SELECT id FROM users WHERE username = 'ctype_limited'`);
  await query(
    `INSERT INTO user_roles (user_id, role_code) VALUES ($1, 'sales')
     ON CONFLICT DO NOTHING`,
    [limUser.rows[0].id],
  );
  const limLogin = await json('POST', '/api/v1/auth/login', {
    username: 'ctype_limited',
    password: 'Limited123!',
  }, null);
  if (limLogin.status === 200) limitedToken = limLogin.data.accessToken || limLogin.data.token;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});
});

describe('Seeded canonical registry', () => {
  it('GET returns the audited canonical types, active by default', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/correspondence-types');
    assert.equal(res.status, 200);
    const keys = res.data.items.map((i) => i.key);
    for (const expected of ['OFFICIAL', 'INTERNAL', 'ESTELAM', 'GHARARDAD', 'PASOKH', 'ELAMIEH']) {
      assert.ok(keys.includes(expected), `expected seed key ${expected}`);
    }
  });

  it('a sales-role user (correspondence:read) can list types but cannot mutate them', async (t) => {
    if (!dbOk || !limitedToken) return t.skip('no limited token');
    const list = await json('GET', '/api/v1/correspondence-types', undefined, limitedToken);
    assert.equal(list.status, 200);

    const create = await json('POST', '/api/v1/correspondence-types', {
      key: 'FORBIDDEN',
      labelFa: 'ممنوع',
    }, limitedToken);
    assert.equal(create.status, 403);
  });
});

describe('CRUD lifecycle + historical survival on deactivation', () => {
  const key = `E2E_TEST_${Date.now().toString(36).toUpperCase()}`;
  let companyId;

  it('admin creates a new type', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/correspondence-types', { key, labelFa: 'نوع تستی' });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.correspondenceType.key, key);
    assert.equal(res.data.correspondenceType.isActive, true);
  });

  it('duplicate key is rejected', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/correspondence-types', { key, labelFa: 'دوباره' });
    assert.equal(res.status, 409);
    assert.equal(res.data.error, 'CORRESPONDENCE_TYPE_DUPLICATE');
  });

  it('rename via PATCH', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/correspondence-types/${key}`, { labelFa: 'نام جدید' });
    assert.equal(res.status, 200);
    assert.equal(res.data.correspondenceType.labelFa, 'نام جدید');
  });

  it('a Correspondence can be created using the new active type', async (t) => {
    if (!dbOk) return t.skip('no database');
    const co = await json('POST', '/api/v1/companies', { name: `Ctype-Co-${Date.now()}`, entityType: 'CUSTOMER' });
    companyId = co.data.company.id;
    const res = await json('POST', '/api/v1/correspondence', {
      direction: 'OUTGOING',
      typeKey: key,
      subject: 'با نوع جدید',
      rawBody: 'متن',
      companyId,
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
  });

  it('unknown/never-registered typeKey is rejected on create', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/correspondence', {
      direction: 'OUTGOING',
      typeKey: 'TOTALLY_MADE_UP_TYPE',
      subject: 'باید رد شود',
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'INVALID_CORRESPONDENCE_TYPE');
  });

  it('deactivate → historical Correspondence with that type remains fully readable', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/correspondence', {
      direction: 'OUTGOING',
      typeKey: key,
      subject: 'قبل از غیرفعال شدن نوع',
      rawBody: 'متن',
      companyId,
    });
    assert.equal(created.status, 201);
    const correspondenceId = created.data.correspondence.id;

    const deact = await json('PATCH', `/api/v1/correspondence-types/${key}/deactivate`);
    assert.equal(deact.status, 200);
    assert.equal(deact.data.correspondenceType.isActive, false);

    const get = await json('GET', `/api/v1/correspondence/${correspondenceId}`);
    assert.equal(get.status, 200);
    assert.equal(get.data.correspondence.typeKey, key);

    const activeList = await json('GET', '/api/v1/correspondence-types?includeInactive=false');
    assert.ok(!activeList.data.items.some((i) => i.key === key), 'deactivated type must not appear in active-only list');
  });

  it('new Correspondence creation with the now-deactivated type is rejected', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/correspondence', {
      direction: 'OUTGOING',
      typeKey: key,
      subject: 'نباید ساخته شود',
      companyId,
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'INVALID_CORRESPONDENCE_TYPE');
  });

  it('reactivating the type makes it available for NEW correspondence again', async (t) => {
    if (!dbOk) return t.skip('no database');
    const act = await json('PATCH', `/api/v1/correspondence-types/${key}/activate`);
    assert.equal(act.status, 200);
    assert.equal(act.data.correspondenceType.isActive, true);

    const res = await json('POST', '/api/v1/correspondence', {
      direction: 'OUTGOING',
      typeKey: key,
      subject: 'بعد از فعال‌سازی مجدد',
      companyId,
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
  });
});
