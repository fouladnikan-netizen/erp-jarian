/**
 * Correspondence API integration tests — DDL-23 Gahshomar aggregate.
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
let readOnlyToken = null;
let companyId;
let orderId;

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
    console.warn('[correspondence-integration] DB unavailable — skipping:', err.message);
    return;
  }

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
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
    name: `Corr-Co-${Date.now()}`,
    entityType: 'CUSTOMER',
    nationalId: `1${String(Date.now()).slice(-10)}`,
  });
  assert.equal(co.status, 201, JSON.stringify(co.data));
  companyId = co.data.company.id;

  const ord = await json('POST', '/api/v1/orders', {
    companyId,
    title: `Corr-Order-${Date.now()}`,
  });
  if (ord.status === 201) orderId = ord.data.order.id;
  else console.warn('[correspondence-integration] order fixture creation failed:', ord.status, JSON.stringify(ord.data));

  // accounting: has correspondence:read only — RBAC negative fixture.
  const limitedId = `u_corr_limited_${Date.now().toString(36)}`;
  const hash = await bcrypt.hash('Limited123!', 10);
  await query(
    `INSERT INTO users (id, username, display_name, password_hash)
     VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING`,
    [limitedId, 'corr_limited', 'Corr Limited', hash],
  );
  const limUser = await query(`SELECT id FROM users WHERE username = 'corr_limited'`);
  await query(
    `INSERT INTO user_roles (user_id, role_code) VALUES ($1, 'accounting')
     ON CONFLICT DO NOTHING`,
    [limUser.rows[0].id],
  );
  const limLogin = await json('POST', '/api/v1/auth/login', {
    username: 'corr_limited',
    password: 'Limited123!',
  }, null);
  if (limLogin.status === 200) readOnlyToken = limLogin.data.accessToken || limLogin.data.token;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});
});

describe('Correspondence RBAC', () => {
  it('unauthenticated → 401', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/correspondence', undefined, null);
    assert.equal(res.status, 401);
  });

  it('read-only role can list but cannot create', async (t) => {
    if (!dbOk || !readOnlyToken) return t.skip('no read-only token');
    const list = await json('GET', '/api/v1/correspondence', undefined, readOnlyToken);
    assert.equal(list.status, 200);

    const create = await json('POST', '/api/v1/correspondence', {
      direction: 'OUTGOING',
      subject: 'ممنوع',
    }, readOnlyToken);
    assert.equal(create.status, 403);
  });

  it('read-only role cannot finalize', async (t) => {
    if (!dbOk || !readOnlyToken) return t.skip('no read-only token');
    const draft = await json('POST', '/api/v1/correspondence', {
      direction: 'OUTGOING',
      subject: 'برای تست RBAC',
      rawBody: 'متن آزمایشی',
    });
    const res = await json('POST', `/api/v1/correspondence/${draft.data.correspondence.id}/finalize`, {}, readOnlyToken);
    assert.equal(res.status, 403);
  });
});

describe('OUTGOING lifecycle', () => {
  let id;

  it('create OUT draft, linked to Company + Order', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/correspondence', {
      direction: 'OUTGOING',
      typeKey: 'OFFICIAL',
      subject: 'نامه همکاری مشترک',
      rawBody: 'سلام خوبيد. طبق چيزي كه گفتيم مبلغ 12,000,000 ريال و 5 درصد تخفيف تا تاريخ 1405/05/01 با سفارش JR-000123.',
      companyId,
      orderId: orderId || null,
      recordDate: '1405/05/01',
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.correspondence.status, 'DRAFT');
    assert.equal(res.data.correspondence.officialNumber, null);
    assert.equal(res.data.correspondence.companyId, companyId);
    id = res.data.correspondence.id;

    const audit = await query(
      `SELECT action FROM audit_log WHERE entity_type = 'correspondence' AND entity_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [id],
    );
    assert.equal(audit.rows[0]?.action, 'correspondence.create');
  });

  it('DRAFT is editable', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/correspondence/${id}`, {
      subject: 'نامه همکاری مشترک — ویرایش‌شده',
    });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.correspondence.subject, 'نامه همکاری مشترک — ویرایش‌شده');
  });

  it('finalize assigns a server-side official number and locks the record', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', `/api/v1/correspondence/${id}/finalize`, {
      finalBody: 'سلام؛ با احترام به استحضار می‌رساند مبلغ 12,000,000 ریال و 5 درصد تخفیف تا تاریخ 1405/05/01 با سفارش JR-000123 مورد تایید است.',
    });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.correspondence.status, 'FINAL');
    assert.ok(res.data.correspondence.officialNumber, 'expected an assigned official number');
    assert.match(res.data.correspondence.officialNumber, /^[۰-۹]+\/OUT\/[۰-۹]+$/);
    assert.equal('organizationSnapshot' in res.data.correspondence, true);

    const audit = await query(
      `SELECT action FROM audit_log WHERE entity_id = $1 AND action = 'correspondence.finalize' LIMIT 1`,
      [id],
    );
    assert.equal(audit.rows[0]?.action, 'correspondence.finalize');
  });

  it('cannot edit or re-finalize a FINAL record', async (t) => {
    if (!dbOk) return t.skip('no database');
    const patch = await json('PATCH', `/api/v1/correspondence/${id}`, { subject: 'نباید تغییر کند' });
    assert.equal(patch.status, 409);
    assert.equal(patch.data.error, 'CORRESPONDENCE_NOT_DRAFT');

    const refinalize = await json('POST', `/api/v1/correspondence/${id}/finalize`, {});
    assert.equal(refinalize.status, 409);
    assert.equal(refinalize.data.error, 'CORRESPONDENCE_ALREADY_FINAL');
  });

  it('hard-refresh equivalent (fresh GET) persists content + number', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', `/api/v1/correspondence/${id}`);
    assert.equal(res.status, 200);
    assert.equal(res.data.correspondence.status, 'FINAL');
    assert.ok(res.data.correspondence.officialNumber);
    assert.ok(res.data.correspondence.finalBody.includes('JR-000123'));
  });

  it('Nabz Order projection: correspondence is listable by orderId', async (t) => {
    if (!dbOk || !orderId) return t.skip('no order fixture');
    const res = await json('GET', `/api/v1/correspondence?orderId=${encodeURIComponent(orderId)}`);
    assert.equal(res.status, 200);
    assert.ok(res.data.items.some((item) => item.id === id));
  });

  it('Kanoon Company projection: correspondence is listable by companyId', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', `/api/v1/correspondence?companyId=${encodeURIComponent(companyId)}`);
    assert.equal(res.status, 200);
    assert.ok(res.data.items.some((item) => item.id === id));
  });
});

describe('DDL-30 organization snapshot at finalize', () => {
  let identityRow;

  async function restoreIdentity() {
    if (!dbOk) return;
    if (identityRow) {
      await query(
        `INSERT INTO organization_identity (
           id, trade_name, legal_name, national_id, legal_person_type,
           registration_number, economic_number, phone, email, website, fax,
           province, city, official_address, postal_code,
           bank_name, bank_account_number, iban, updated_by, created_at, updated_at
         ) VALUES (
           'org', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
         )
         ON CONFLICT (id) DO UPDATE SET
           trade_name = EXCLUDED.trade_name,
           legal_name = EXCLUDED.legal_name,
           national_id = EXCLUDED.national_id,
           legal_person_type = EXCLUDED.legal_person_type,
           registration_number = EXCLUDED.registration_number,
           economic_number = EXCLUDED.economic_number,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           website = EXCLUDED.website,
           fax = EXCLUDED.fax,
           province = EXCLUDED.province,
           city = EXCLUDED.city,
           official_address = EXCLUDED.official_address,
           postal_code = EXCLUDED.postal_code,
           bank_name = EXCLUDED.bank_name,
           bank_account_number = EXCLUDED.bank_account_number,
           iban = EXCLUDED.iban,
           updated_by = EXCLUDED.updated_by,
           updated_at = EXCLUDED.updated_at`,
        [
          identityRow.trade_name, identityRow.legal_name, identityRow.national_id,
          identityRow.legal_person_type, identityRow.registration_number, identityRow.economic_number,
          identityRow.phone, identityRow.email, identityRow.website, identityRow.fax,
          identityRow.province, identityRow.city, identityRow.official_address, identityRow.postal_code,
          identityRow.bank_name, identityRow.bank_account_number, identityRow.iban,
          identityRow.updated_by, identityRow.created_at, identityRow.updated_at,
        ],
      );
      await query(
        `UPDATE organization_identity
         SET phones = $1::jsonb, addresses = $2::jsonb, bank_accounts = $3::jsonb
         WHERE id = 'org'`,
        [
          JSON.stringify(identityRow.phones ?? []),
          JSON.stringify(identityRow.addresses ?? []),
          JSON.stringify(identityRow.bank_accounts ?? []),
        ],
      );
    } else {
      await query(`DELETE FROM organization_identity WHERE id = 'org'`);
    }
  }

  before(async () => {
    if (!dbOk) return;
    const snap = await query(`SELECT * FROM organization_identity WHERE id = 'org'`);
    identityRow = snap.rows[0] || null;
  });

  after(async () => {
    try {
      await restoreIdentity();
    } catch (err) {
      console.warn('[correspondence-snapshot] identity restore failed:', err.message);
    }
  });

  it('TEST-A freeze survives TEST-B identity change; new draft stays live', async (t) => {
    if (!dbOk) return t.skip('no database');

    const putA = await json('PUT', '/api/v1/organization-identity', {
      tradeName: 'Snap Letter Co',
      legalName: 'Snap Letter Legal',
      nationalId: '11111111111',
      phone: 'TEST-A',
    });
    assert.equal(putA.status, 200, JSON.stringify(putA.data));

    const draft = await json('POST', '/api/v1/correspondence', {
      direction: 'OUTGOING',
      typeKey: 'OFFICIAL',
      subject: 'نامه snapshot',
      rawBody: 'متن پیش‌نویس نامه رسمی برای تست هویت.',
      companyId,
      recordDate: '1405/05/08',
    });
    assert.equal(draft.status, 201, JSON.stringify(draft.data));
    assert.equal(draft.data.correspondence.organizationSnapshot, null);

    const finalized = await json('POST', `/api/v1/correspondence/${draft.data.correspondence.id}/finalize`, {
      finalBody: 'متن پیش‌نویس نامه رسمی برای تست هویت.',
    });
    assert.equal(finalized.status, 200, JSON.stringify(finalized.data));
    assert.equal(finalized.data.correspondence.organizationSnapshot?.phone, 'TEST-A');
    assert.equal(finalized.data.correspondence.organizationSnapshot?.tradeName, 'Snap Letter Co');

    const putB = await json('PUT', '/api/v1/organization-identity', {
      tradeName: 'Live Letter Co',
      legalName: 'Live Letter Legal',
      nationalId: '22222222222',
      phone: 'TEST-B',
    });
    assert.equal(putB.status, 200, JSON.stringify(putB.data));

    const reprint = await json('GET', `/api/v1/correspondence/${draft.data.correspondence.id}`);
    assert.equal(reprint.status, 200);
    assert.equal(reprint.data.correspondence.organizationSnapshot?.phone, 'TEST-A');

    const liveDraft = await json('POST', '/api/v1/correspondence', {
      direction: 'OUTGOING',
      subject: 'پیش‌نویس live',
      rawBody: 'پیش‌نویس جدید پس از تغییر هویت.',
    });
    assert.equal(liveDraft.status, 201, JSON.stringify(liveDraft.data));
    assert.equal(liveDraft.data.correspondence.organizationSnapshot, null);
    assert.equal(liveDraft.data.correspondence.status, 'DRAFT');
  });
});

describe('AI critical-value-preservation is enforced at FINALIZE (P0)', () => {
  it('rejects finalize when the final text silently mutates a protected amount', async (t) => {
    if (!dbOk) return t.skip('no database');
    const draft = await json('POST', '/api/v1/correspondence', {
      direction: 'OUTGOING',
      subject: 'تست جهش هوش مصنوعی',
      rawBody: 'مبلغ فاکتور 2,000,000 ریال است.',
    });
    assert.equal(draft.status, 201);
    const id = draft.data.correspondence.id;

    const res = await json('POST', `/api/v1/correspondence/${id}/finalize`, {
      // simulates an AI/human edit that silently changed the amount
      finalBody: 'مبلغ فاکتور 3,000,000 ریال است.',
    });
    assert.equal(res.status, 422, JSON.stringify(res.data));
    assert.equal(res.data.error, 'CRITICAL_VALUE_VIOLATION');
    assert.ok(res.data.details?.violations?.some((v) => v.kind === 'amount'));

    const check = await json('GET', `/api/v1/correspondence/${id}`);
    assert.equal(check.data.correspondence.status, 'DRAFT', 'must not silently finalize on violation');
  });

  it('accepts finalize when the final text preserves the protected amount (just reworded)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const draft = await json('POST', '/api/v1/correspondence', {
      direction: 'OUTGOING',
      subject: 'تست حفظ مقادیر حیاتی',
      rawBody: 'مبلغ فاکتور 2,000,000 ریال است.',
    });
    const id = draft.data.correspondence.id;

    const res = await json('POST', `/api/v1/correspondence/${id}/finalize`, {
      finalBody: 'با احترام، مبلغ فاکتور 2,000,000 ریال به تایید نهایی رسید.',
    });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.correspondence.status, 'FINAL');
  });
});

describe('INCOMING lifecycle — attachment gate (P0)', () => {
  let id;

  it('create IN draft', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/correspondence', {
      direction: 'INCOMING',
      subject: 'استعلام قیمت ورق',
      rawBody: 'با سلام، قیمت ورق را اعلام فرمایید.',
      recordDate: '1405/05/02',
      receivedDate: '1405/05/02',
      senderParty: { name: 'شرکت فولاد پارس' },
      companyId,
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    id = res.data.correspondence.id;
  });

  it('finalize WITHOUT attachment → backend rejects (ATTACHMENT_REQUIRED)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', `/api/v1/correspondence/${id}/finalize`, {
      finalBody: 'با سلام، قیمت ورق را اعلام فرمایید.',
    });
    assert.equal(res.status, 422);
    assert.equal(res.data.error, 'ATTACHMENT_REQUIRED');
  });

  it('add attachment, then finalize succeeds', async (t) => {
    if (!dbOk) return t.skip('no database');
    const upload = await json('POST', `/api/v1/correspondence/${id}/attachments`, {
      fileName: 'estelam.pdf',
      mimeType: 'application/pdf',
      dataBase64: Buffer.from('%PDF-1.4 fake content').toString('base64'),
    });
    assert.equal(upload.status, 201, JSON.stringify(upload.data));

    const res = await json('POST', `/api/v1/correspondence/${id}/finalize`, {
      finalBody: 'با سلام، قیمت ورق را اعلام فرمایید.',
    });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.correspondence.status, 'FINAL');
    assert.ok(res.data.correspondence.officialNumber);
    assert.match(res.data.correspondence.officialNumber, /^[۰-۹]+\/IN\/[۰-۹]+$/);
  });

  it('hard refresh: attachment metadata persists', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', `/api/v1/correspondence/${id}/attachments`);
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 1);
    assert.equal(res.data.items[0].fileName, 'estelam.pdf');
    assert.equal(res.data.items[0].dataBase64, undefined, 'metadata list must not include the base64 payload');
  });
});

describe('Concurrency — server-authoritative numbering (product rule 20)', () => {
  it('two concurrent OUT finalize calls never collide on official number', async (t) => {
    if (!dbOk) return t.skip('no database');

    const [d1, d2] = await Promise.all([
      json('POST', '/api/v1/correspondence', {
        direction: 'OUTGOING',
        subject: 'همزمان ۱',
        rawBody: 'متن ۱',
        recordDate: '1405/05/03',
      }),
      json('POST', '/api/v1/correspondence', {
        direction: 'OUTGOING',
        subject: 'همزمان ۲',
        rawBody: 'متن ۲',
        recordDate: '1405/05/03',
      }),
    ]);
    assert.equal(d1.status, 201);
    assert.equal(d2.status, 201);

    const [f1, f2] = await Promise.all([
      json('POST', `/api/v1/correspondence/${d1.data.correspondence.id}/finalize`, { finalBody: 'متن ۱ نهایی' }),
      json('POST', `/api/v1/correspondence/${d2.data.correspondence.id}/finalize`, { finalBody: 'متن ۲ نهایی' }),
    ]);
    assert.equal(f1.status, 200, JSON.stringify(f1.data));
    assert.equal(f2.status, 200, JSON.stringify(f2.data));

    const n1 = f1.data.correspondence.officialNumber;
    const n2 = f2.data.correspondence.officialNumber;
    assert.ok(n1 && n2, 'both must receive an official number');
    assert.notEqual(n1, n2, 'concurrent finalizations must never collide on the same number');

    const dup = await query(
      `SELECT official_number, COUNT(*)::int AS n FROM correspondence
       WHERE official_number IN ($1, $2) GROUP BY official_number HAVING COUNT(*) > 1`,
      [n1, n2],
    );
    assert.equal(dup.rows.length, 0, 'no duplicate official_number rows in DB');
  });

  it('a larger batch of concurrent finalizations all get unique sequential numbers', async (t) => {
    if (!dbOk) return t.skip('no database');
    const BATCH = 8;
    const drafts = await Promise.all(
      Array.from({ length: BATCH }, (_, i) => json('POST', '/api/v1/correspondence', {
        direction: 'OUTGOING',
        subject: `دسته همزمان ${i}`,
        rawBody: `متن دسته ${i}`,
        recordDate: '1405/05/04',
      })),
    );
    assert.ok(drafts.every((d) => d.status === 201));

    const results = await Promise.all(
      drafts.map((d) => json('POST', `/api/v1/correspondence/${d.data.correspondence.id}/finalize`, {
        finalBody: 'نهایی شد',
      })),
    );
    assert.ok(results.every((r) => r.status === 200), JSON.stringify(results.map((r) => r.data)));

    const numbers = results.map((r) => r.data.correspondence.officialNumber);
    const uniqueNumbers = new Set(numbers);
    assert.equal(uniqueNumbers.size, BATCH, 'every concurrent finalize must get a distinct number');
  });
});
