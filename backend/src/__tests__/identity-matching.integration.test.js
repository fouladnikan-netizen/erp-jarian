/**
 * Identity matching + duplicate governance integration tests (DDL-25).
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.JARIAN_SKIP_LISTEN = '1';

const { createApp } = await import('../index.js');
const { pool, query } = await import('../db/pool.js');
const identityMatchingService = await import('../services/identityMatchingService.js');
const companyService = await import('../services/companyService.js');

let server;
let baseUrl;
let token;
let dbOk = false;
let actorId;

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
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { status: res.status, data };
}

function uniqueNationalId() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-11).padStart(11, '1');
}

before(async () => {
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    console.warn('[identity-matching] DB unavailable — skipping:', err.message);
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
  token = login.data?.accessToken || login.data?.token;
  const admin = await query(`SELECT id FROM users WHERE username = 'admin'`);
  actorId = admin.rows[0]?.id;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});
});

describe('identity matching service', () => {
  it('blocks exact company duplicate by nationalId', async (t) => {
    if (!dbOk) return t.skip('no database');
    const nid = uniqueNationalId();
    const name = `شرکت تست تکراری ${nid}`;
    await companyService.createCompany({
      name,
      entityType: 'CUSTOMER',
      nationalId: nid,
      activityDomain: 'بازرگانی',
      lifecycleStage: 'COLD_LEAD',
      confirmDuplicate: true,
    }, actorId);

    const dup = await identityMatchingService.checkCompanyDuplicates(
      { nationalId: nid, name: `${name}-2` },
      { actorUserId: actorId },
    );
    assert.equal(dup.classification, 'EXACT');
    assert.equal(dup.policy, 'block');
  });

  it('POST /identity/matches/company returns classification', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/identity/matches/company', {
      name: 'شرکت ناموجود',
      nationalId: '99999999999',
    });
    assert.equal(res.status, 200);
    assert.ok(res.data.classification);
  });
});

describe('company nationalId DB unique (concurrent)', () => {
  it('partial unique index exists on active national_id', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'companies'
        AND indexname = 'companies_national_id_active_unique'
    `);
    assert.equal(res.rowCount, 1);
  });
});
