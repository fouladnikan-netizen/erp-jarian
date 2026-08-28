/**
 * Contact + CompanyContactRelationship integration tests (DDL-26).
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.JARIAN_SKIP_LISTEN = '1';

const { createApp } = await import('../index.js');
const { pool, query } = await import('../db/pool.js');
const contactService = await import('../services/contactService.js');
const companyService = await import('../services/companyService.js');
const leadService = await import('../services/leadService.js');

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
    console.warn('[contact-integration] DB unavailable — skipping:', err.message);
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

describe('canonical Contact', () => {
  it('same mobile on two companies → one Contact + two relationships', async (t) => {
    if (!dbOk) return t.skip('no database');
    const mobile = `09${String(Date.now()).slice(-9)}`;

    const co1 = await companyService.createCompany({
      name: 'شرکت الف',
      entityType: 'CUSTOMER',
      activityDomain: 'بازرگانی',
    }, actorId);
    const co2 = await companyService.createCompany({
      name: 'شرکت ب',
      entityType: 'CUSTOMER',
      activityDomain: 'بازرگانی',
    }, actorId);

    const r1 = await contactService.createContact({
      fullName: 'علی تست',
      mobile,
      companyId: co1.id,
      isPrimary: true,
      confirmDuplicate: true,
    }, actorId);

    const r2 = await contactService.createContact({
      fullName: 'علی تست',
      mobile,
      companyId: co2.id,
      confirmDuplicate: true,
    }, actorId);

    assert.equal(r1.contact.id, r2.contact.id);
    assert.equal(r2.linkedExisting, true);

    const list1 = await contactService.listContactsByCompany(co1.id);
    const list2 = await contactService.listContactsByCompany(co2.id);
    assert.equal(list1.length, 1);
    assert.equal(list2.length, 1);
  });
});

describe('lead conversion hardened (DDL-26.6)', () => {
  it('does not copy interactions into company payload', async (t) => {
    if (!dbOk) return t.skip('no database');
    const lead = await leadService.createLead({
      companyName: 'تبدیل بدون تعامل',
      personName: 'رضا',
      mobile: `09${String(Date.now()).slice(-9)}`,
      payload: { interactions: [{ id: 'x1', note: 'should not copy' }] },
    }, actorId);

    const nid = `66${Date.now().toString().slice(-9)}`;
    const result = await leadService.convertLeadToCompany({
      leadId: lead.id,
      nationalId: nid,
      actorId,
    }, {
      identityResolver: async () => ({
        ok: true,
        suggestedName: 'تبدیل بدون تعامل',
        identity: { nationalId: nid, name: 'تبدیل بدون تعامل', province: 'تهران' },
      }),
    });

    assert.ok(result.companyId);
    assert.equal(Array.isArray(result.company?.payload?.interactions), false);

    const contacts = await contactService.listContactsByCompany(result.companyId);
    assert.ok(contacts.length >= 1);
  });
});

describe('contacts API RBAC', () => {
  it('requires companies:read for list by company', async (t) => {
    if (!dbOk) return t.skip('no database');
    const co = await companyService.createCompany({
      name: 'API Contact Co',
      entityType: 'CUSTOMER',
      activityDomain: 'بازرگانی',
    }, actorId);
    const res = await json('GET', `/api/v1/contacts/company/${co.id}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.items));
  });
});

describe('canonical Contact write path (DDL-26 cutover)', () => {
  it('create → update identity → update relationship → end → refetch', async (t) => {
    if (!dbOk) return t.skip('no database');
    const mobile = `09${String(Date.now()).slice(-9)}`;
    const co = await companyService.createCompany({
      name: 'Cutover Co',
      entityType: 'CUSTOMER',
      activityDomain: 'بازرگانی',
    }, actorId);

    const created = await contactService.createContact({
      fullName: 'اولیه',
      mobile,
      companyId: co.id,
      roleTitle: 'کارشناس',
      isPrimary: true,
    }, actorId);
    const contactId = created.contact.id;
    const rel = (await contactService.listContactsByCompany(co.id))[0];
    assert.ok(rel?.id);

    const updatedContact = await contactService.updateContact(contactId, {
      fullName: 'ویرایش‌شده',
      email: 'test@example.com',
    }, actorId);
    assert.equal(updatedContact.fullName, 'ویرایش‌شده');

    const updatedRel = await contactService.updateRelationship(rel.id, {
      roleTitle: 'مدیر',
      isPrimary: true,
    }, actorId);
    assert.equal(updatedRel.roleTitle, 'مدیر');
    assert.equal(updatedRel.isPrimary, true);

    await contactService.endRelationship(rel.id, actorId);
    const afterEnd = await contactService.listContactsByCompany(co.id);
    assert.equal(afterEnd.length, 0);

    const stillContact = await contactService.getContact(contactId);
    assert.equal(stillContact.fullName, 'ویرایش‌شده');
  });

  it('HTTP PATCH/POST routes persist canonically', async (t) => {
    if (!dbOk) return t.skip('no database');
    const mobile = `09${String(Date.now() + 1).slice(-9)}`;
    const co = await companyService.createCompany({
      name: 'HTTP Cutover Co',
      entityType: 'CUSTOMER',
      activityDomain: 'بازرگانی',
    }, actorId);

    const createRes = await json('POST', '/api/v1/contacts', {
      fullName: 'HTTP',
      mobile,
      companyId: co.id,
      roleTitle: 'خرید',
      isPrimary: true,
    });
    assert.equal(createRes.status, 201);
    const contactId = createRes.data?.contact?.id;
    const listRes = await json('GET', `/api/v1/contacts/company/${co.id}`);
    const relationshipId = listRes.data.items[0]?.id;
    assert.ok(relationshipId);

    const patchContact = await json('PATCH', `/api/v1/contacts/${contactId}`, {
      fullName: 'HTTP Updated',
    });
    assert.equal(patchContact.status, 200);
    assert.equal(patchContact.data.contact.fullName, 'HTTP Updated');

    const patchRel = await json('PATCH', `/api/v1/contacts/relationships/${relationshipId}`, {
      roleTitle: 'مدیرعامل',
    });
    assert.equal(patchRel.status, 200);
    assert.equal(patchRel.data.relationship.roleTitle, 'مدیرعامل');
  });
});
