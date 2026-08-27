/**
 * Company create-from-identity (Kanoon → Linka) — unit tests with mocked resolver.
 * Requires PostgreSQL for HTTP path; service-level tests inject identityResolver.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.JARIAN_SKIP_LISTEN = '1';

const { createApp } = await import('../index.js');
const { pool, query } = await import('../db/pool.js');
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
    console.warn('[company-from-identity] DB unavailable — skipping:', err.message);
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
  token = login.data?.accessToken || login.data?.token;
  const admin = await query(`SELECT id FROM users WHERE username = 'admin'`);
  actorId = admin.rows[0]?.id;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end().catch(() => {});
});

describe('createCompanyFromIdentity (service)', () => {
  it('creates company from mocked Linka success', async (t) => {
    if (!dbOk) return t.skip('no database');
    const nid = `55${String(Date.now()).slice(-9)}`;
    const result = await companyService.createCompanyFromIdentity(
      { nationalId: nid, entityType: 'CUSTOMER', activityDomain: 'بازرگانی' },
      actorId,
      {
        identityResolver: async () => ({
          ok: true,
          nationalId: nid,
          suggestedName: `Linka Co ${nid}`,
          identity: {
            nationalId: nid,
            name: `Linka Co ${nid}`,
            province: 'تهران',
            activityDomain: 'بازرگانی',
            registrationNumber: '99',
            city: 'تهران',
            address: 'خیابان تست',
            postalCode: '1234567890',
            legalStatus: 'فعال',
            registeredCapital: 1000,
            companyType: 'سهامی خاص',
            rawProviderReference: 'LINKA',
            providerMeta: { lat: 1, long: 2 },
          },
        }),
      },
    );
    assert.equal(result.created, true);
    assert.equal(result.mode, 'create_new');
    assert.equal(result.company.nationalId, nid);
    assert.equal(result.company.name, `Linka Co ${nid}`);
    assert.equal(result.company.province, 'تهران');
    assert.equal(result.company.activityDomain, 'بازرگانی');
    assert.equal(result.company.payload?.linkaIdentity?.registrationNumber, '99');
    assert.equal(result.company.payload?.linkaIdentity?.city, 'تهران');

    const audit = await query(
      `SELECT action FROM audit_log WHERE entity_id = $1 AND action = 'company.create_from_identity'`,
      [result.company.id],
    );
    assert.equal(audit.rows.length, 1);
  });

  it('returns existing company without calling Linka', async (t) => {
    if (!dbOk) return t.skip('no database');
    const nid = `56${String(Date.now()).slice(-9)}`;
    await companyService.createCompany({
      name: `Exist ${nid}`,
      entityType: 'CUSTOMER',
      nationalId: nid,
    }, actorId);

    let resolverCalls = 0;
    const result = await companyService.createCompanyFromIdentity(
      { nationalId: nid, entityType: 'CUSTOMER', activityDomain: 'بازرگانی' },
      actorId,
      {
        identityResolver: async () => {
          resolverCalls += 1;
          return { ok: false, errorCode: 'SHOULD_NOT_RUN', error: 'fail' };
        },
      },
    );
    assert.equal(resolverCalls, 0);
    assert.equal(result.created, false);
    assert.equal(result.mode, 'existing');
    assert.equal(result.company.nationalId, nid);

    const count = await query(
      `SELECT COUNT(*)::int AS n FROM companies WHERE national_id = $1 AND deleted_at IS NULL`,
      [nid],
    );
    assert.equal(count.rows[0].n, 1);
  });

  it('Linka failure creates no company and no success audit', async (t) => {
    if (!dbOk) return t.skip('no database');
    const nid = `57${String(Date.now()).slice(-9)}`;
    await assert.rejects(
      () => companyService.createCompanyFromIdentity(
        { nationalId: nid, entityType: 'CUSTOMER' },
        actorId,
        {
          identityResolver: async () => ({
            ok: false,
            errorCode: 'COMPANY_IDENTITY_NOT_FOUND',
            error: 'not found',
          }),
        },
      ),
      (err) => err.code === 'COMPANY_IDENTITY_NOT_FOUND',
    );

    const count = await query(
      `SELECT COUNT(*)::int AS n FROM companies WHERE national_id = $1`,
      [nid],
    );
    assert.equal(count.rows[0].n, 0);

    const audit = await query(
      `SELECT 1 FROM audit_log WHERE action = 'company.create_from_identity' AND detail->>'nationalId' = $1`,
      [nid],
    );
    assert.equal(audit.rows.length, 0);
  });
});

describe('POST /companies/from-identity', () => {
  it('HTTP path creates via mock provider when COMPANY_IDENTITY_PROVIDER=mock', async (t) => {
    if (!dbOk) return t.skip('no database');
    const nid = `58${String(Date.now()).slice(-9)}`;
    const res = await json('POST', '/api/v1/companies/from-identity', {
      nationalId: nid,
      entityType: 'CUSTOMER',
      activityDomain: 'بازرگانی',
    });
    // Default mock resolver succeeds with suggested name
    assert.ok([200, 201].includes(res.status), JSON.stringify(res.data));
    assert.ok(res.data.company?.id);
    assert.equal(res.data.company.nationalId, nid);
  });
});
