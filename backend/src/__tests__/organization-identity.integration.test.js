/**
 * Organization Identity singleton (DDL-28) — GET empty / PUT upsert / leading zeros.
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
let snapshot = null;

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
    console.warn('[organization-identity] DB unavailable — skipping:', err.message);
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

  const snap = await query(`SELECT * FROM organization_identity WHERE id = 'org'`);
  snapshot = snap.rows[0] || null;

  const limitedId = `u_orgid_limited_${Date.now().toString(36)}`;
  const hash = await bcrypt.hash('Limited123!', 10);
  await query(
    `INSERT INTO users (id, username, display_name, password_hash)
     VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING`,
    [limitedId, 'orgid_limited', 'OrgId Limited', hash],
  );
  const limUser = await query(`SELECT id FROM users WHERE username = 'orgid_limited'`);
  await query(
    `INSERT INTO user_roles (user_id, role_code) VALUES ($1, 'sales')
     ON CONFLICT DO NOTHING`,
    [limUser.rows[0].id],
  );
  const limLogin = await json('POST', '/api/v1/auth/login', {
    username: 'orgid_limited',
    password: 'Limited123!',
  }, null);
  if (limLogin.status === 200) limitedToken = limLogin.data.accessToken || limLogin.data.token;
});

after(async () => {
  if (dbOk) {
    try {
      if (snapshot) {
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
            snapshot.trade_name, snapshot.legal_name, snapshot.national_id, snapshot.legal_person_type,
            snapshot.registration_number, snapshot.economic_number, snapshot.phone, snapshot.email,
            snapshot.website, snapshot.fax, snapshot.province, snapshot.city, snapshot.official_address,
            snapshot.postal_code, snapshot.bank_name, snapshot.bank_account_number, snapshot.iban,
            snapshot.updated_by, snapshot.created_at, snapshot.updated_at,
          ],
        );
        await query(
          `UPDATE organization_identity
           SET phones = $1::jsonb, addresses = $2::jsonb, bank_accounts = $3::jsonb
           WHERE id = 'org'`,
          [
            JSON.stringify(snapshot.phones ?? []),
            JSON.stringify(snapshot.addresses ?? []),
            JSON.stringify(snapshot.bank_accounts ?? []),
          ],
        );
      } else {
        await query(`DELETE FROM organization_identity WHERE id = 'org'`);
      }
    } catch (err) {
      console.warn('[organization-identity] snapshot restore failed:', err.message);
    }
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});
});

describe('Organization Identity singleton', () => {
  it('GET returns empty fields when no row exists (or current singleton)', async (t) => {
    if (!dbOk) return t.skip('no database');
    if (!snapshot) {
      await query(`DELETE FROM organization_identity WHERE id = 'org'`);
    }
    const res = await json('GET', '/api/v1/organization-identity');
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.ok(res.data.organizationIdentity);
    if (!snapshot) {
      assert.equal(res.data.organizationIdentity.tradeName, '');
      assert.equal(res.data.organizationIdentity.nationalId, '');
    }
  });

  it('PUT without required fields is 400', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PUT', '/api/v1/organization-identity', { tradeName: '' });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'VALIDATION');
  });

  it('sales role can GET but cannot PUT', async (t) => {
    if (!dbOk || !limitedToken) return t.skip('no limited token');
    const get = await json('GET', '/api/v1/organization-identity', undefined, limitedToken);
    assert.equal(get.status, 200);
    assert.ok(get.data.organizationIdentity);
    const put = await json('PUT', '/api/v1/organization-identity', {
      tradeName: 'x',
      legalName: 'y',
      nationalId: '1',
    }, limitedToken);
    assert.equal(put.status, 403);
  });

  it('PUT upserts and preserves leading zeros on national_id', async (t) => {
    if (!dbOk) return t.skip('no database');
    const payload = {
      tradeName: 'پترو فولاد نیکان تست',
      legalName: 'شرکت پترو فولاد نیکان تست',
      nationalId: '014013998055',
      legalPersonType: 'legal',
      registrationNumber: '0642490',
      economicNumber: '14013998055',
      phone: '02171683000',
      email: 'info@example.com',
      website: 'www.fouladnikan.com',
      fax: '02171683001',
      province: 'تهران',
      city: 'تهران',
      officialAddress: 'بلوار میرداماد',
      postalCode: '1549847120',
      bankName: 'بانک اقتصاد نوین',
      bankAccountNumber: '181-2-7595437-1',
      iban: 'IR820550018100207595437001',
    };
    const put = await json('PUT', '/api/v1/organization-identity', payload);
    assert.equal(put.status, 200, JSON.stringify(put.data));
    assert.equal(put.data.organizationIdentity.nationalId, '014013998055');
    assert.equal(put.data.organizationIdentity.registrationNumber, '0642490');
    assert.equal(put.data.organizationIdentity.tradeName, payload.tradeName);

    const get = await json('GET', '/api/v1/organization-identity');
    assert.equal(get.status, 200);
    assert.equal(get.data.organizationIdentity.nationalId, '014013998055');
    assert.equal(get.data.organizationIdentity.city, 'تهران');
    assert.equal(get.data.organizationIdentity.iban, payload.iban);
    assert.equal(get.data.organizationIdentity.phone, payload.phone);
    assert.equal(get.data.organizationIdentity.phones[0].number, payload.phone);
    assert.equal(get.data.organizationIdentity.phones[0].isPrimary, true);
    assert.equal(get.data.organizationIdentity.phones[0].type, undefined);
    assert.equal(get.data.organizationIdentity.addresses[0].cityName, 'تهران');
    assert.equal(get.data.organizationIdentity.addresses[0].provinceCode, 'TEH');
    assert.equal(get.data.organizationIdentity.addresses[0].address, payload.officialAddress);
    assert.equal(get.data.organizationIdentity.bankAccounts[0].accountNumber, payload.bankAccountNumber);
    assert.equal(get.data.organizationIdentity.bankAccounts[0].bankCode, '055');
    assert.equal(get.data.organizationIdentity.bankAccounts[0].accountHolderName, payload.legalName);
  });

  it('second PUT updates the same singleton row', async (t) => {
    if (!dbOk) return t.skip('no database');
    const put = await json('PUT', '/api/v1/organization-identity', {
      tradeName: 'نام تجاری ویرایش‌شده',
      legalName: 'شرکت پترو فولاد نیکان تست',
      nationalId: '014013998055',
    });
    assert.equal(put.status, 200, JSON.stringify(put.data));
    assert.equal(put.data.organizationIdentity.tradeName, 'نام تجاری ویرایش‌شده');

    const count = await query(`SELECT count(*)::int AS n FROM organization_identity`);
    assert.equal(count.rows[0].n, 1);

    const get = await json('GET', '/api/v1/organization-identity');
    assert.equal(get.data.organizationIdentity.tradeName, 'نام تجاری ویرایش‌شده');
    assert.equal('logoFileId' in get.data.organizationIdentity, true);
  });
});

const PNG_DOT = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('Organization Identity logo (DDL-31)', () => {
  let previousLogoId = null;

  before(async () => {
    if (!dbOk) return;
    const row = await query(`SELECT logo_file_id FROM organization_identity WHERE id = 'org'`);
    previousLogoId = row.rows[0]?.logo_file_id || null;
  });

  after(async () => {
    if (!dbOk) return;
    try {
      await query(`UPDATE organization_identity SET logo_file_id = $1 WHERE id = 'org'`, [previousLogoId]);
      if (previousLogoId) {
        await query(`DELETE FROM organization_identity_logo WHERE id <> $1`, [previousLogoId]);
      } else {
        await query(`DELETE FROM organization_identity_logo`);
      }
    } catch (err) {
      console.warn('[organization-identity-logo] restore failed:', err.message);
    }
  });

  it('rejects non-image upload', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PUT', '/api/v1/organization-identity/logo', {
      fileName: 'note.txt',
      mimeType: 'text/plain',
      dataBase64: Buffer.from('not an image').toString('base64'),
    });
    assert.equal(res.status, 400, JSON.stringify(res.data));
    assert.equal(res.data.error, 'VALIDATION');
  });

  it('rejects oversized payload', async (t) => {
    if (!dbOk) return t.skip('no database');
    const tooBig = Buffer.alloc((2 * 1024 * 1024) + 8, 0);
    tooBig[0] = 0x89;
    tooBig[1] = 0x50;
    tooBig[2] = 0x4e;
    tooBig[3] = 0x47;
    tooBig[4] = 0x0d;
    tooBig[5] = 0x0a;
    tooBig[6] = 0x1a;
    tooBig[7] = 0x0a;
    const res = await json('PUT', '/api/v1/organization-identity/logo', {
      fileName: 'huge.png',
      mimeType: 'image/png',
      dataBase64: tooBig.toString('base64'),
    });
    assert.equal(res.status, 400, JSON.stringify(res.data));
  });

  it('sales role cannot PUT logo', async (t) => {
    if (!dbOk || !limitedToken) return t.skip('no limited token');
    const res = await json('PUT', '/api/v1/organization-identity/logo', {
      fileName: 'dot.png',
      mimeType: 'image/png',
      dataBase64: PNG_DOT,
    }, limitedToken);
    assert.equal(res.status, 403);
  });

  it('PUT logo then GET persists; replace keeps identity fields', async (t) => {
    if (!dbOk) return t.skip('no database');
    const before = await json('GET', '/api/v1/organization-identity');
    const tradeName = before.data.organizationIdentity.tradeName;
    const nationalId = before.data.organizationIdentity.nationalId;
    if (!tradeName) {
      const seed = await json('PUT', '/api/v1/organization-identity', {
        tradeName: 'پترو فولاد نیکان تست',
        legalName: 'شرکت پترو فولاد نیکان تست',
        nationalId: '014013998055',
      });
      assert.equal(seed.status, 200, JSON.stringify(seed.data));
    }

    const first = await json('PUT', '/api/v1/organization-identity/logo', {
      fileName: 'logo-a.png',
      mimeType: 'image/png',
      dataBase64: PNG_DOT,
    });
    assert.equal(first.status, 200, JSON.stringify(first.data));
    const firstId = first.data.organizationIdentity.logoFileId;
    assert.ok(firstId);
    assert.equal(first.data.organizationIdentity.logo.fileName, 'logo-a.png');

    const got = await json('GET', '/api/v1/organization-identity/logo');
    assert.equal(got.status, 200, JSON.stringify(got.data));
    assert.equal(got.data.logo.dataBase64, PNG_DOT);

    const second = await json('PUT', '/api/v1/organization-identity/logo', {
      fileName: 'logo-b.png',
      mimeType: 'image/png',
      dataBase64: PNG_DOT,
    });
    assert.equal(second.status, 200, JSON.stringify(second.data));
    assert.notEqual(second.data.organizationIdentity.logoFileId, firstId);
    assert.equal(second.data.organizationIdentity.logo.fileName, 'logo-b.png');

    const identity = await json('GET', '/api/v1/organization-identity');
    assert.equal(identity.data.organizationIdentity.tradeName, tradeName || 'پترو فولاد نیکان تست');
    assert.equal(identity.data.organizationIdentity.nationalId, nationalId || '014013998055');
    assert.equal(identity.data.organizationIdentity.logoFileId, second.data.organizationIdentity.logoFileId);

    const replaced = await json('GET', '/api/v1/organization-identity/logo');
    assert.equal(replaced.data.logo.fileName, 'logo-b.png');
  });
});

describe('Organization Identity collections (DDL-32 / DDL-33)', () => {
  it('PUT collections persist; first item is primary compatibility', async (t) => {
    if (!dbOk) return t.skip('no database');
    const seed = await json('PUT', '/api/v1/organization-identity', {
      tradeName: 'پترو فولاد نیکان تست',
      legalName: 'شرکت پترو فولاد نیکان تست',
      nationalId: '014013998055',
      phones: ['021-11111111', '021-22222222'],
      addresses: [
        { province: 'تهران', city: 'تهران', officialAddress: 'میرداماد', postalCode: '1549847120' },
        { province: 'اصفهان', city: 'اصفهان', officialAddress: 'چهارباغ', postalCode: '81431' },
      ],
      bankAccounts: [
        { bankCode: '055', accountNumber: '181-2-7595437-1', iban: 'IR820550018100207595437001' },
        { bankCode: '057', accountNumber: '210.8100.20600165.1', iban: 'IR890570021081020600165101' },
      ],
    });
    assert.equal(seed.status, 200, JSON.stringify(seed.data));
    const row = seed.data.organizationIdentity;
    assert.equal(row.phones[0].number, '021-11111111');
    assert.equal(row.phones[1].number, '021-22222222');
    assert.equal(row.phones[0].isPrimary, true);
    assert.equal(row.phones[1].isPrimary, false);
    assert.equal(row.phones[0].type, undefined);
    assert.ok(row.phones[0].id);
    assert.equal(row.phone, '021-11111111');
    assert.equal(row.addresses.length, 2);
    assert.equal(row.province, 'تهران');
    assert.equal(row.city, 'تهران');
    assert.equal(row.officialAddress, 'میرداماد');
    assert.equal(row.addresses[0].provinceCode, 'TEH');
    assert.equal(row.addresses[0].address, 'میرداماد');
    assert.equal(row.bankAccounts.length, 2);
    assert.equal(row.bankAccounts[0].bankName, 'بانک اقتصاد نوین');
    assert.equal(row.bankAccounts[0].accountHolderName, 'شرکت پترو فولاد نیکان تست');
    assert.equal(row.bankAccountNumber, '181-2-7595437-1');
    assert.equal(row.iban, 'IR820550018100207595437001');

    const get = await json('GET', '/api/v1/organization-identity');
    assert.equal(get.data.organizationIdentity.phones[0].number, '021-11111111');
    assert.equal(get.data.organizationIdentity.phone, '021-11111111');
    const firstPhoneId = get.data.organizationIdentity.phones[0].id;

    const again = await json('PUT', '/api/v1/organization-identity', {
      tradeName: 'پترو فولاد نیکان تست',
      legalName: 'شرکت پترو فولاد نیکان تست',
      nationalId: '014013998055',
      phones: get.data.organizationIdentity.phones,
      addresses: get.data.organizationIdentity.addresses,
      bankAccounts: get.data.organizationIdentity.bankAccounts,
    });
    assert.equal(again.status, 200, JSON.stringify(again.data));
    assert.equal(again.data.organizationIdentity.phones[0].id, firstPhoneId);
  });

  it('PUT explicit primary persists after GET; IBAN-bank mismatch is 400', async (t) => {
    if (!dbOk) return t.skip('no database');
    const seed = await json('PUT', '/api/v1/organization-identity', {
      tradeName: 'پترو فولاد نیکان تست',
      legalName: 'شرکت پترو فولاد نیکان تست',
      nationalId: '014013998055',
      phones: [
        { number: '021-11111111' },
        { number: '021-22222222', isPrimary: true },
      ],
      addresses: [
        { province: 'تهران', city: 'تهران', officialAddress: 'میرداماد' },
        { province: 'اصفهان', city: 'اصفهان', officialAddress: 'چهارباغ', isPrimary: true },
      ],
      bankAccounts: [
        { bankCode: '055', accountNumber: '181-2-7595437-1', iban: 'IR820550018100207595437001' },
        { bankCode: '057', accountNumber: '210.8100.20600165.1', iban: 'IR890570021081020600165101', isPrimary: true },
      ],
    });
    assert.equal(seed.status, 200, JSON.stringify(seed.data));
    assert.equal(seed.data.organizationIdentity.phone, '021-22222222');
    assert.equal(seed.data.organizationIdentity.officialAddress, 'چهارباغ');
    assert.equal(seed.data.organizationIdentity.iban, 'IR890570021081020600165101');
    assert.equal(seed.data.organizationIdentity.phones[1].isPrimary, true);
    assert.equal(seed.data.organizationIdentity.addresses[1].isPrimary, true);
    assert.equal(seed.data.organizationIdentity.bankAccounts[1].isPrimary, true);

    const get = await json('GET', '/api/v1/organization-identity');
    assert.equal(get.data.organizationIdentity.phone, '021-22222222');
    assert.equal(get.data.organizationIdentity.officialAddress, 'چهارباغ');
    assert.equal(get.data.organizationIdentity.bankName, 'بانک پاسارگاد');

    const mismatch = await json('PUT', '/api/v1/organization-identity', {
      tradeName: 'پترو فولاد نیکان تست',
      legalName: 'شرکت پترو فولاد نیکان تست',
      nationalId: '014013998055',
      bankAccounts: [{
        bankCode: '057',
        accountNumber: '210.8100.20600165.1',
        iban: 'IR820550018100207595437001',
      }],
    });
    assert.equal(mismatch.status, 400);
    assert.equal(mismatch.data.message, 'شماره شبا متعلق به بانک انتخاب‌شده نیست.');

    const badPhone = await json('PUT', '/api/v1/organization-identity', {
      tradeName: 'پترو فولاد نیکان تست',
      legalName: 'شرکت پترو فولاد نیکان تست',
      nationalId: '014013998055',
      phones: [{ number: 'not-a-phone' }],
    });
    assert.equal(badPhone.status, 400);
  });

  it('rejects invalid IBAN and keeps previous phones', async (t) => {
    if (!dbOk) return t.skip('no database');
    const before = await json('GET', '/api/v1/organization-identity');
    const previousPhones = before.data.organizationIdentity.phones;
    const res = await json('PUT', '/api/v1/organization-identity', {
      tradeName: before.data.organizationIdentity.tradeName || 'پترو فولاد نیکان تست',
      legalName: before.data.organizationIdentity.legalName || 'شرکت پترو فولاد نیکان تست',
      nationalId: before.data.organizationIdentity.nationalId || '014013998055',
      phones: previousPhones,
      bankAccounts: [
        { bankCode: '055', accountNumber: '181-2-7595437-1', iban: 'IR000000000000000000000000' },
      ],
    });
    assert.equal(res.status, 400, JSON.stringify(res.data));
    const after = await json('GET', '/api/v1/organization-identity');
    assert.deepEqual(after.data.organizationIdentity.phones, previousPhones);
  });
});

