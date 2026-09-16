/**
 * Company create — canonical Contact orchestration (DDL-26 legacy write elimination).
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.JARIAN_SKIP_LISTEN = '1';

const { createApp } = await import('../index.js');
const { pool, query } = await import('../db/pool.js');
const companyService = await import('../services/companyService.js');
const {
  isLinkaCanonicalContactCandidate,
  upsertLinkaOfficialPersons,
} = await import('../services/contactOrchestration.js');

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

before(async () => {
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    console.warn('[company-create-canonical] DB unavailable — skipping:', err.message);
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

describe('company create canonical contacts', () => {
  it('creates company without contact and does not write legacy contact_persons', async (t) => {
    if (!dbOk) return t.skip('no database');
    const co = await companyService.createCompany({
      name: `Co Empty ${Date.now()}`,
      entityType: 'CUSTOMER',
      activityDomain: 'بازرگانی',
    }, actorId);

    const legacy = await query(
      `SELECT COUNT(*)::int AS n FROM contact_persons WHERE company_id = $1`,
      [co.id],
    );
    const canonical = await query(
      `SELECT COUNT(*)::int AS n FROM company_contact_relationships
       WHERE company_id = $1 AND ended_at IS NULL`,
      [co.id],
    );
    assert.equal(legacy.rows[0].n, 0);
    assert.equal(canonical.rows[0].n, 0);
    assert.equal(co.payload?.relatedPersons, undefined);
  });

  it('creates company with one contact via canonical path', async (t) => {
    if (!dbOk) return t.skip('no database');
    const mobile = `09${String(Date.now()).slice(-9)}`;
    const co = await companyService.createCompany({
      name: `Co One Contact ${Date.now()}`,
      entityType: 'CUSTOMER',
      activityDomain: 'بازرگانی',
      relatedPersons: [{
        fullName: 'رابط تست',
        mobile,
        jobPosition: 'مدیر خرید',
        isPrimary: true,
      }],
    }, actorId);

    const legacy = await query(
      `SELECT COUNT(*)::int AS n FROM contact_persons WHERE company_id = $1`,
      [co.id],
    );
    assert.equal(legacy.rows[0].n, 0);
    assert.equal(co.canonicalContacts?.length, 1);
    assert.equal(co.canonicalContacts[0].contact.fullName, 'رابط تست');
    assert.equal(co.payload?.relatedPersons, undefined);
  });

  it('HTTP POST /companies does not persist relatedPersons in payload', async (t) => {
    if (!dbOk) return t.skip('no database');
    const mobile = `09${String(Date.now() + 2).slice(-9)}`;
    const res = await json('POST', '/api/v1/companies', {
      name: `HTTP Co ${Date.now()}`,
      entityType: 'CUSTOMER',
      activityDomain: 'بازرگانی',
      relatedPersons: [{ fullName: 'HTTP Person', mobile, jobPosition: 'خرید' }],
      payload: { relatedPersons: [{ fullName: 'shadow', mobile: '09120000000' }] },
    });
    assert.equal(res.status, 201);
    const companyId = res.data?.company?.id;
    const row = await query(`SELECT payload FROM companies WHERE id = $1`, [companyId]);
    assert.equal(row.rows[0].payload?.relatedPersons, undefined);
    const relCount = await query(
      `SELECT COUNT(*)::int AS n FROM company_contact_relationships
       WHERE company_id = $1 AND ended_at IS NULL`,
      [companyId],
    );
    assert.ok(relCount.rows[0].n >= 1);
  });
});

describe('Linka contact policy', () => {
  it('rejects weak person rows without nationalCode', () => {
    assert.equal(isLinkaCanonicalContactCandidate({ fullName: 'فقط نام' }), false);
    assert.equal(isLinkaCanonicalContactCandidate({
      fullName: 'علی',
      nationalCode: '0012345678',
    }), true);
  });

  it('upsertLinkaOfficialPersons skips weak rows', async (t) => {
    if (!dbOk) return t.skip('no database');
    const co = await companyService.createCompany({
      name: `Linka Policy Co ${Date.now()}`,
      entityType: 'CUSTOMER',
      activityDomain: 'بازرگانی',
    }, actorId);

    const upserted = await upsertLinkaOfficialPersons(co.id, [
      { fullName: 'ضعیف', nationalCode: '', roles: [] },
      {
        fullName: 'قوی',
        nationalCode: `${Date.now()}`.slice(-10),
        roles: [{ postDescription: 'مدیرعامل' }],
      },
    ], actorId);

    assert.equal(upserted, 1);
    const legacy = await query(
      `SELECT COUNT(*)::int AS n FROM contact_persons WHERE company_id = $1`,
      [co.id],
    );
    assert.equal(legacy.rows[0].n, 0);
  });
});
