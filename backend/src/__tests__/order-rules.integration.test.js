/**
 * Order lifecycle rules — Backend enforcement (stage/status/completion/audit).
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
  return { status: res.status, data };
}

before(async () => {
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    console.warn('[order-rules] DB unavailable — skipping:', err.message);
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
  if (login.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(login.data)}`);
  }
  token = login.data.accessToken || login.data.token;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});
});

async function seedCompanyOrder(payload = {}) {
  const co = await json('POST', '/api/v1/companies', {
    name: `IT-Rules-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    entityType: 'CUSTOMER',
    nationalId: `1${String(Date.now()).slice(-10)}`,
    payload: { personType: 'legal', recordType: 'CUSTOMER' },
  });
  assert.equal(co.status, 201, JSON.stringify(co.data));
  const companyId = co.data.company.id;

  const res = await json('POST', '/api/v1/orders', {
    companyId,
    code: `JR-RUL-${Date.now()}`,
    title: 'Rules order',
    stageId: '1',
    status: 'current',
    payload: {
      items: [{ name: 'pipe', inquiries: [{ id: 'inq1' }] }],
      ...payload,
    },
  });
  assert.equal(res.status, 201, JSON.stringify(res.data));
  return { companyId, order: res.data.order };
}

describe('Order stage / status enforcement', () => {
  it('allows phase1 1→3 and rejects invalid 1→4 via PATCH', async (t) => {
    if (!dbOk) return t.skip('no database');
    const { order } = await seedCompanyOrder();
    let version = order.version;

    const ok = await json('PATCH', `/api/v1/orders/${order.id}`, {
      stageId: '3',
      version,
    });
    assert.equal(ok.status, 200, JSON.stringify(ok.data));
    assert.equal(ok.data.order.stageId, '3');
    version = ok.data.order.version;

    const bad = await json('PATCH', `/api/v1/orders/${order.id}`, {
      stageId: '4',
      version,
    });
    assert.equal(bad.status, 409);
    assert.equal(bad.data.error, 'ORDER_PHASE2_COMMITMENT_REQUIRED');
    assert.equal(bad.data.details.from, 3);
    assert.equal(bad.data.details.to, 4);
  });

  it('rejects mozene without inquiryCompletedAt', async (t) => {
    if (!dbOk) return t.skip('no database');
    const { order } = await seedCompanyOrder();
    const bad = await json('PATCH', `/api/v1/orders/${order.id}`, {
      stageId: '2',
      version: order.version,
    });
    assert.equal(bad.status, 409);
    assert.equal(bad.data.error, 'ORDER_MOZENE_LOCKED');
  });

  it('allows mozene when kavosh completed', async (t) => {
    if (!dbOk) return t.skip('no database');
    const { order } = await seedCompanyOrder({ inquiryCompletedAt: '1404/01/01 · 10:00' });
    const ok = await json('PATCH', `/api/v1/orders/${order.id}`, {
      stageId: 2,
      version: order.version,
    });
    assert.equal(ok.status, 200, JSON.stringify(ok.data));
    assert.equal(ok.data.order.stageId, '2');
  });

  it('rejects status success without gateway commitment', async (t) => {
    if (!dbOk) return t.skip('no database');
    const { order } = await seedCompanyOrder();
    const mid = await json('PATCH', `/api/v1/orders/${order.id}`, {
      stageId: '3',
      version: order.version,
    });
    assert.equal(mid.status, 200);
    const bad = await json('PATCH', `/api/v1/orders/${order.id}`, {
      status: 'success',
      stageId: '4',
      version: mid.data.order.version,
      payload: {
        proforma: { signed: true },
      },
    });
    assert.equal(bad.status, 409);
    assert.equal(bad.data.error, 'ORDER_COMPLETION_REJECTED');
  });

  it('enters phase2 as SUCCESS + OPEN (DDL-18B)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const { order } = await seedCompanyOrder({
      proforma: { signed: true },
      gatewayDecision: { outcome: 'success' },
      phase2EnteredAt: '2026-08-27T12:00:00Z',
    });
    const mid = await json('PATCH', `/api/v1/orders/${order.id}`, {
      stageId: '3',
      version: order.version,
    });
    assert.equal(mid.status, 200);

    const done = await json('PATCH', `/api/v1/orders/${order.id}`, {
      status: 'success',
      stageId: '4',
      version: mid.data.order.version,
      payload: {
        ...order.payload,
        proforma: { signed: true },
        gatewayDecision: { outcome: 'success' },
        phase2EnteredAt: '2026-08-27T12:00:00Z',
        closure: 'open',
      },
    });
    assert.equal(done.status, 200, JSON.stringify(done.data));
    assert.equal(done.data.order.status, 'success');
    assert.equal(done.data.order.stageId, '4');

    const audits = await query(
      `SELECT action FROM audit_log WHERE entity_type = 'order' AND entity_id = $1
       AND action IN ('order.complete', 'order.stage_change', 'order.status_change')
       ORDER BY created_at DESC`,
      [order.id],
    );
    const actions = audits.rows.map((r) => r.action);
    assert.ok(actions.includes('order.stage_change'));
  });

  it('rejects stale version even for valid transition', async (t) => {
    if (!dbOk) return t.skip('no database');
    const { order } = await seedCompanyOrder();
    const bump = await json('PATCH', `/api/v1/orders/${order.id}`, {
      title: 'bump',
      version: order.version,
    });
    assert.equal(bump.status, 200, JSON.stringify(bump.data));
    const stale = await json('PATCH', `/api/v1/orders/${order.id}`, {
      stageId: '3',
      version: order.version,
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.data.error, 'VERSION_CONFLICT');
  });

  it('locks failed status', async (t) => {
    if (!dbOk) return t.skip('no database');
    const { order } = await seedCompanyOrder();
    const noReason = await json('PATCH', `/api/v1/orders/${order.id}`, {
      status: 'failed',
      version: order.version,
    });
    assert.equal(noReason.status, 409);
    assert.equal(noReason.data.error, 'ORDER_FAIL_REASON_REQUIRED');

    const failed = await json('PATCH', `/api/v1/orders/${order.id}`, {
      status: 'failed',
      payload: { ...(order.payload || {}), failReason: 'قیمت' },
      version: order.version,
    });
    assert.equal(failed.status, 200, JSON.stringify(failed.data));
    const bad = await json('PATCH', `/api/v1/orders/${order.id}`, {
      status: 'current',
      version: failed.data.order.version,
    });
    assert.equal(bad.status, 409);
    assert.equal(bad.data.error, 'INVALID_ORDER_STATUS_TRANSITION');
  });

  it('rejects archive when saranjam gates incomplete', async (t) => {
    if (!dbOk) return t.skip('no database');
    const { order } = await seedCompanyOrder({
      saranjam: {
        items: [{ id: 1, invoiceUploaded: false }],
        salesInvoiceIssued: false,
      },
    });
    const del = await json('DELETE', `/api/v1/orders/${order.id}`);
    assert.equal(del.status, 409);
    assert.equal(del.data.error, 'ORDER_ARCHIVE_GATES_INCOMPLETE');
  });

  it('phase2 stage change after SUCCESS commitment', async (t) => {
    if (!dbOk) return t.skip('no database');
    const { order } = await seedCompanyOrder({
      proforma: { signed: true },
      gatewayDecision: { outcome: 'success' },
      phase2EnteredAt: '2026-08-27T12:00:00Z',
    });
    const toPish = await json('PATCH', `/api/v1/orders/${order.id}`, {
      stageId: '3',
      version: order.version,
    });
    const win = await json('PATCH', `/api/v1/orders/${order.id}`, {
      status: 'success',
      stageId: '4',
      version: toPish.data.order.version,
      payload: {
        proforma: { signed: true },
        gatewayDecision: { outcome: 'success' },
        phase2EnteredAt: '2026-08-27T12:00:00Z',
        closure: 'open',
      },
    });
    assert.equal(win.status, 200, JSON.stringify(win.data));
    assert.equal(win.data.order.status, 'success');
    const jump = await json('PATCH', `/api/v1/orders/${order.id}`, {
      stageId: '8',
      version: win.data.order.version,
      payload: {
        proforma: { signed: true },
        gatewayDecision: { outcome: 'success' },
        phase2EnteredAt: '2026-08-27T12:00:00Z',
        closure: 'open',
      },
    });
    assert.equal(jump.status, 200, JSON.stringify(jump.data));
    assert.equal(jump.data.order.stageId, '8');
    assert.equal(jump.data.order.status, 'success');
  });

  it('CLOSED after saranjam archive keeps SUCCESS', async (t) => {
    if (!dbOk) return t.skip('no database');
    const saranjamClosed = {
      items: [{ id: 1, invoiceUploaded: true }],
      supplierPayments: [{ id: 1, balanceRial: 0 }],
      salesInvoiceIssued: true,
      customerBalanceRial: 0,
      archivedAt: '2026-08-27T15:00:00Z',
      locked: true,
    };
    const { order } = await seedCompanyOrder({
      phase2EnteredAt: '2026-08-27T12:00:00Z',
      gatewayDecision: { outcome: 'success' },
      closure: 'open',
    });
    const purchased = await json('PATCH', `/api/v1/orders/${order.id}`, {
      status: 'success',
      stageId: '4',
      version: order.version,
      payload: {
        phase2EnteredAt: '2026-08-27T12:00:00Z',
        gatewayDecision: { outcome: 'success' },
        proforma: { signed: true },
        closure: 'open',
      },
    });
    assert.equal(purchased.status, 200, JSON.stringify(purchased.data));
    const atSaranjam = await json('PATCH', `/api/v1/orders/${order.id}`, {
      stageId: '8',
      version: purchased.data.order.version,
      payload: {
        ...(purchased.data.order.payload || {}),
        phase2EnteredAt: '2026-08-27T12:00:00Z',
        gatewayDecision: { outcome: 'success' },
        closure: 'open',
      },
    });
    assert.equal(atSaranjam.status, 200, JSON.stringify(atSaranjam.data));
    const done = await json('PATCH', `/api/v1/orders/${order.id}`, {
      status: 'success',
      stageId: '8',
      version: atSaranjam.data.order.version,
      payload: {
        ...(atSaranjam.data.order.payload || {}),
        saranjam: saranjamClosed,
        closure: 'closed',
      },
    });
    assert.equal(done.status, 200, JSON.stringify(done.data));
    assert.equal(done.data.order.status, 'success');
    assert.equal(done.data.order.payload?.closure, 'closed');
  });

  it('rejects supplier-only company on order create', async (t) => {
    if (!dbOk) return t.skip('no database');
    const co = await json('POST', '/api/v1/companies', {
      name: `IT-SUP-${Date.now()}`,
      entityType: 'SUPPLIER',
      nationalId: `2${String(Date.now()).slice(-10)}`,
      payload: { personType: 'legal', recordType: 'SUPPLIER' },
    });
    assert.equal(co.status, 201, JSON.stringify(co.data));
    const res = await json('POST', '/api/v1/orders', {
      companyId: co.data.company.id,
      code: `JR-SUP-${Date.now()}`,
      title: 'Supplier only',
    });
    assert.equal(res.status, 409);
    assert.equal(res.data.error, 'ORDER_SUPPLIER_ONLY_FORBIDDEN');
  });

  it('rejects VAT tamper (+10% on inclusive)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const { order } = await seedCompanyOrder({
      saleType: 'رسمی',
      isOfficial: true,
      items: [{
        name: 'ورق',
        qty: 1,
        unitPrice: 800_000,
        sellingPriceInclVat: 800_000,
        supplyType: 'رسمی',
      }],
    });
    const bad = await json('PATCH', `/api/v1/orders/${order.id}`, {
      version: order.version,
      payload: {
        ...(order.payload || {}),
        saleType: 'رسمی',
        isOfficial: true,
        items: [{
          name: 'ورق',
          qty: 1,
          unitPrice: 800_000,
          sellingPriceInclVat: 800_000,
          supplyType: 'رسمی',
        }],
        quotingSnapshot: {
          vatRate: 0.1,
          economicTotal: 800_000,
          grandTotal: 880_000,
          vatAmount: 80_000,
        },
      },
    });
    assert.equal(bad.status, 409, JSON.stringify(bad.data));
    assert.equal(bad.data.error, 'TAX_TAMPER_REJECTED');
  });
});
