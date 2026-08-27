/**
 * CROSS-MODULE JOURNEY — Order SUCCESS → Customer Lifecycle (DDL-18B)
 *
 * Successful Purchase Event = Order.status == success (gateway / purchase count).
 * CLOSED (saranjam archive) does NOT double-count; only SUCCESS drives lifecycle.
 */
import { test, expect } from '@playwright/test';
import { loginAsQaAdmin } from '../helpers/auth.js';
import { requireE2eQaCredentials } from '../helpers/loadEnv.js';
import { loginApi, apiJson } from '../helpers/api.js';

test.describe.configure({ mode: 'serial' });

test('DDL-18B: SUCCESS purchase drives نوپیمان / هم‌پیمان', async ({ page, request }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const report = {
    token: null,
    companyId: null,
    orderIds: [],
    productDecision: 'DDL-18B: Order.status==SUCCESS (purchase event) = Successful Purchase',
  };

  await loginAsQaAdmin(page);
  const { username, password } = requireE2eQaCredentials();
  const apiLogin = await loginApi(request, username, password);
  report.token = apiLogin.token;

  const health = await request.get('http://127.0.0.1:3100/api/health');
  expect(health.ok()).toBeTruthy();

  const companyRes = await apiJson(request, report.token, 'POST', '/companies', {
    body: {
      name: `E2E-NABZ-LIFE-${stamp}`,
      entityType: 'CUSTOMER',
      personType: 'legal',
      nationalId: String(1000000000 + (stamp % 899999999)).slice(0, 10),
      activityDomain: 'steel',
    },
  });
  expect(companyRes.status).toBeLessThan(300);
  report.companyId = companyRes.json?.company?.id || companyRes.json?.id;
  expect(report.companyId).toBeTruthy();

  const saranjamClosed = {
    items: [{ id: 1, invoiceUploaded: true }],
    supplierPayments: [{ id: 1, balanceRial: 0 }],
    salesInvoiceIssued: true,
    customerBalanceRial: 0,
    archivedAt: new Date().toISOString(),
    locked: true,
  };

  async function createAndCloseSuccess(n) {
    const created = await apiJson(request, report.token, 'POST', '/orders', {
      body: {
        companyId: report.companyId,
        title: `E2E-NABZ-SUCCESS-${stamp}-${n}`,
        stageId: '4',
        status: 'current',
        payload: {
          phase2EnteredAt: new Date().toISOString(),
          gatewayDecision: { outcome: 'success' },
          proforma: { signed: true },
          closure: 'open',
        },
      },
    });
    expect(created.status, JSON.stringify(created.json)).toBeLessThan(300);
    const order = created.json.order || created.json;
    report.orderIds.push(order.id);

    const done = await apiJson(request, report.token, 'PATCH', `/orders/${order.id}`, {
      body: {
        status: 'success',
        stageId: '4',
        version: order.version,
        payload: {
          phase2EnteredAt: new Date().toISOString(),
          gatewayDecision: { outcome: 'success' },
          proforma: { signed: true },
          closure: 'open',
        },
      },
    });
    expect(done.status, JSON.stringify(done.json)).toBeLessThan(300);
    expect(String(done.json.order.status)).toBe('success');
    const atSaranjam = await apiJson(request, report.token, 'PATCH', `/orders/${order.id}`, {
      body: {
        stageId: '8',
        version: done.json.order.version,
        payload: {
          ...(done.json.order.payload || {}),
          phase2EnteredAt: new Date().toISOString(),
          gatewayDecision: { outcome: 'success' },
          proforma: { signed: true },
          closure: 'open',
        },
      },
    });
    expect(atSaranjam.status, JSON.stringify(atSaranjam.json)).toBeLessThan(300);
    const closed = await apiJson(request, report.token, 'PATCH', `/orders/${order.id}`, {
      body: {
        status: 'success',
        stageId: '8',
        version: atSaranjam.json.order.version,
        payload: {
          ...(atSaranjam.json.order.payload || {}),
          saranjam: saranjamClosed,
          closure: 'closed',
        },
      },
    });
    expect(closed.status, JSON.stringify(closed.json)).toBeLessThan(300);
    expect(String(closed.json.order.payload?.closure || '')).toBe('closed');
    return closed.json.order;
  }

  await createAndCloseSuccess(1);
  let co = await apiJson(request, report.token, 'GET', `/companies/${report.companyId}`);
  expect(co.json?.company?.lifecycleStage || co.json?.lifecycleStage).toBe('first_time_buyer');

  await createAndCloseSuccess(2);
  co = await apiJson(request, report.token, 'GET', `/companies/${report.companyId}`);
  expect(co.json?.company?.lifecycleStage || co.json?.lifecycleStage).toBe('first_time_buyer');

  await createAndCloseSuccess(3);
  co = await apiJson(request, report.token, 'GET', `/companies/${report.companyId}`);
  expect(co.json?.company?.lifecycleStage || co.json?.lifecycleStage).toBe('loyal');

  console.log('[e2e-ddl18b] PASS', JSON.stringify(report));
});
