/**
 * Raw Lead API integration tests — CRUD, lifecycle, RBAC, conversion.
 * Requires PostgreSQL + seeded admin (run: cd backend && npm run setup).
 *
 *   cd backend && npm test
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import bcrypt from 'bcryptjs';

process.env.JARIAN_SKIP_LISTEN = '1';

const { createApp } = await import('../index.js');
const { pool, query } = await import('../db/pool.js');
const leadService = await import('../services/leadService.js');

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
    console.warn('[lead-integration] DB unavailable — skipping:', err.message);
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

  if (login.status !== 200 || !(login.data?.accessToken || login.data?.token)) {
    throw new Error(
      `Login failed (${login.status}). Run: cd backend && npm run setup — ${JSON.stringify(login.data)}`,
    );
  }
  token = login.data.accessToken || login.data.token;

  // Limited user: companies:read only (no leads:*)
  const limitedId = `u_lead_limited_${Date.now().toString(36)}`;
  const hash = await bcrypt.hash('Limited123!', 10);
  await query(
    `INSERT INTO users (id, username, display_name, password_hash)
     VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING`,
    [limitedId, 'lead_limited', 'Lead Limited', hash],
  );
  const limUser = await query(`SELECT id FROM users WHERE username = 'lead_limited'`);
  const limId = limUser.rows[0].id;
  await query(
    `INSERT INTO user_roles (user_id, role_code) VALUES ($1, 'accounting')
     ON CONFLICT DO NOTHING`,
    [limId],
  );
  const limLogin = await json('POST', '/api/v1/auth/login', {
    username: 'lead_limited',
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

describe('Lead CRUD', () => {
  let leadId;

  it('creates lead + audit', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/leads', {
      companyName: `Lead-Co-${Date.now()}`,
      personName: 'علی',
      mobile: '09120001122',
      leadSource: 'نمایشگاه',
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.ok(res.data.lead?.id?.startsWith('lead_'));
    assert.equal(res.data.lead.status, 'NEW');
    leadId = res.data.lead.id;

    const audit = await query(
      `SELECT action FROM audit_log WHERE entity_type = 'raw_lead' AND entity_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [leadId],
    );
    assert.equal(audit.rows[0]?.action, 'lead.create');
  });

  it('lists and gets lead', async (t) => {
    if (!dbOk) return t.skip('no database');
    const list = await json('GET', '/api/v1/leads');
    assert.equal(list.status, 200);
    assert.ok(list.data.items.some((l) => l.id === leadId));

    const get = await json('GET', `/api/v1/leads/${leadId}`);
    assert.equal(get.status, 200);
    assert.equal(get.data.lead.id, leadId);
  });

  it('updates lead', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/leads/${leadId}`, {
      description: 'یادداشت تست',
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.lead.description, 'یادداشت تست');
  });

  it('archives lead', async (t) => {
    if (!dbOk) return t.skip('no database');
    const create = await json('POST', '/api/v1/leads', {
      companyName: `Archive-Lead-${Date.now()}`,
    });
    const id = create.data.lead.id;
    const del = await json('POST', `/api/v1/leads/${id}/archive`, { reason: 'تست آرشیو' });
    assert.equal(del.status, 200);
    assert.equal(del.data.archived, true);

    const get = await json('GET', `/api/v1/leads/${id}`);
    assert.equal(get.status, 404);

    const row = await query(`SELECT deleted_at FROM raw_leads WHERE id = $1`, [id]);
    assert.ok(row.rows[0].deleted_at);
  });
});

describe('Lead lifecycle', () => {
  it('NEW → QUALIFYING allowed; CONVERTED via status rejected', async (t) => {
    if (!dbOk) return t.skip('no database');
    const create = await json('POST', '/api/v1/leads', {
      companyName: `Life-${Date.now()}`,
    });
    const id = create.data.lead.id;

    const q = await json('PATCH', `/api/v1/leads/${id}/status`, { status: 'QUALIFYING' });
    assert.equal(q.status, 200);
    assert.equal(q.data.lead.status, 'QUALIFYING');

    const bad = await json('PATCH', `/api/v1/leads/${id}/status`, { status: 'CONVERTED' });
    assert.equal(bad.status, 400);
    assert.equal(bad.data.error, 'INVALID_LEAD_STATUS');
  });

  it('CONVERTED → NEW rejected; REJECTED → CONVERTED rejected', async (t) => {
    if (!dbOk) return t.skip('no database');
    const create = await json('POST', '/api/v1/leads', {
      companyName: `Term-${Date.now()}`,
      personName: 'Sara',
    });
    const id = create.data.lead.id;

    const convert = await json('POST', `/api/v1/leads/${id}/convert`, {
      nationalId: `10${String(Date.now()).slice(-9)}`,
    });
    assert.equal(convert.status, 200, JSON.stringify(convert.data));
    assert.equal(convert.data.lead.status, 'CONVERTED');

    const reopen = await json('PATCH', `/api/v1/leads/${id}/status`, { status: 'NEW' });
    assert.equal(reopen.status, 400);

    const rej = await json('POST', '/api/v1/leads', { companyName: `Rej-${Date.now()}` });
    const rejId = rej.data.lead.id;
    await json('PATCH', `/api/v1/leads/${rejId}/status`, { status: 'REJECTED' });
    const badConvert = await json('POST', `/api/v1/leads/${rejId}/convert`, {
      nationalId: '12345678901',
    });
    assert.equal(badConvert.status, 400);
    assert.equal(badConvert.data.error, 'INVALID_LEAD_STATUS');
  });
});

describe('Lead RBAC', () => {
  it('unauthenticated → 401', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/leads', undefined, null);
    assert.equal(res.status, 401);
  });

  it('without leads:write → 403', async (t) => {
    if (!dbOk) return t.skip('no database');
    if (!limitedToken) return t.skip('limited user missing');
    const res = await json('POST', '/api/v1/leads', { companyName: 'No' }, limitedToken);
    assert.equal(res.status, 403);
  });

  it('without leads:convert → 403', async (t) => {
    if (!dbOk) return t.skip('no database');
    if (!limitedToken) return t.skip('limited user missing');
    const create = await json('POST', '/api/v1/leads', {
      companyName: `Rbac-${Date.now()}`,
    });
    const res = await json(
      'POST',
      `/api/v1/leads/${create.data.lead.id}/convert`,
      { nationalId: '12345678901' },
      limitedToken,
    );
    assert.equal(res.status, 403);
  });
});

describe('Lead conversion', () => {
  it('links existing company by nationalId (no duplicate)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const nid = `20${String(Date.now()).slice(-9)}`;
    const co = await json('POST', '/api/v1/companies', {
      name: `Exist-Co-${Date.now()}`,
      entityType: 'CUSTOMER',
      nationalId: nid,
    });
    assert.equal(co.status, 201);
    const companyId = co.data.company.id;

    const lead = await json('POST', '/api/v1/leads', {
      companyName: `Link-Lead-${Date.now()}`,
      personName: 'Nima',
    });
    const leadId = lead.data.lead.id;

    let resolverCalls = 0;
    const identityResolver = async () => {
      resolverCalls += 1;
      return { ok: false, errorCode: 'SHOULD_SKIP', error: 'must not run' };
    };

    const conv = await leadService.convertLeadToCompany(
      { leadId, nationalId: nid, actorId: (await query(`SELECT id FROM users WHERE username = 'admin'`)).rows[0].id },
      { identityResolver },
    );
    assert.equal(conv.conversionMode, 'link_existing');
    assert.equal(conv.companyId, companyId);
    assert.equal(conv.lead.status, 'CONVERTED');
    assert.equal(conv.lead.convertedCompanyId, companyId);
    assert.equal(resolverCalls, 0);

    const count = await query(
      `SELECT COUNT(*)::int AS n FROM companies WHERE national_id = $1 AND deleted_at IS NULL`,
      [nid],
    );
    assert.equal(count.rows[0].n, 1);
  });

  it('creates new company when nationalId unknown', async (t) => {
    if (!dbOk) return t.skip('no database');
    const nid = `30${String(Date.now()).slice(-9)}`;
    const lead = await json('POST', '/api/v1/leads', {
      companyName: `New-Co-Lead-${Date.now()}`,
      personName: 'Mina',
      mobile: '09123334455',
    });
    const leadId = lead.data.lead.id;

    const conv = await json('POST', `/api/v1/leads/${leadId}/convert`, { nationalId: nid });
    assert.equal(conv.status, 200, JSON.stringify(conv.data));
    assert.equal(conv.data.conversionMode, 'create_new');
    assert.ok(conv.data.companyId?.startsWith('co_'));
    assert.equal(conv.data.lead.status, 'CONVERTED');

    const co = await query(
      `SELECT national_id FROM companies WHERE id = $1`,
      [conv.data.companyId],
    );
    assert.equal(co.rows[0].national_id, nid);

    const audit = await query(
      `SELECT detail FROM audit_log
       WHERE action = 'lead.convert' AND entity_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [leadId],
    );
    assert.equal(audit.rows[0].detail.companyId, conv.data.companyId);
    assert.equal(audit.rows[0].detail.conversionMode, 'create_new');
  });

  it('atomic failure leaves lead unchanged and no success audit', async (t) => {
    if (!dbOk) return t.skip('no database');
    const lead = await json('POST', '/api/v1/leads', {
      companyName: `Fail-Lead-${Date.now()}`,
    });
    const leadId = lead.data.lead.id;
    const actor = await query(`SELECT id FROM users WHERE username = 'admin'`);
    const actorId = actor.rows[0].id;

    await assert.rejects(
      () => leadService.convertLeadToCompany(
        { leadId, nationalId: '12345678901', actorId },
        {
          identityResolver: async () => ({
            ok: false,
            errorCode: 'COMPANY_IDENTITY_NOT_FOUND',
            error: 'forced',
          }),
        },
      ),
      (err) => err.code === 'COMPANY_IDENTITY_NOT_FOUND',
    );

    const row = await query(`SELECT status, converted_company_id FROM raw_leads WHERE id = $1`, [leadId]);
    assert.equal(row.rows[0].status, 'NEW');
    assert.equal(row.rows[0].converted_company_id, null);

    const audit = await query(
      `SELECT 1 FROM audit_log WHERE action = 'lead.convert' AND entity_id = $1`,
      [leadId],
    );
    assert.equal(audit.rows.length, 0);
  });

  it('rejects order against Raw Lead; allows order after convert', async (t) => {
    if (!dbOk) return t.skip('no database');
    const lead = await json('POST', '/api/v1/leads', {
      companyName: `Gate-Lead-${Date.now()}`,
      personName: 'Gate',
    });
    const leadId = lead.data.lead.id;

    const bad = await json('POST', '/api/v1/orders', {
      companyId: leadId,
      title: 'Should fail',
      entityType: 'RAW_LEAD',
      leadId,
    });
    assert.equal(bad.status, 400);
    assert.equal(bad.data.error, 'RAW_LEAD_NOT_ELIGIBLE_FOR_ORDER');

    const nid = `40${String(Date.now()).slice(-9)}`;
    const conv = await json('POST', `/api/v1/leads/${leadId}/convert`, { nationalId: nid });
    assert.equal(conv.status, 200);
    const companyId = conv.data.companyId;

    const order = await json('POST', '/api/v1/orders', {
      companyId,
      code: `JR-GATE-${Date.now()}`,
      title: 'After convert',
    });
    assert.equal(order.status, 201, JSON.stringify(order.data));
    assert.equal(order.data.order.companyId, companyId);
  });
});
