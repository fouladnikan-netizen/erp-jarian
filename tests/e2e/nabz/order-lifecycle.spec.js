import { test, expect } from '@playwright/test';
import { loginAsQaAdmin } from '../helpers/auth.js';
import {
  archiveEntity,
  createActivityApi,
  createCompanyApi,
  createOrderApi,
  getActivitiesForCompany,
  getCompany,
  getOrderApi,
  getOrdersForCompany,
  loginApi,
  patchCompany,
  patchOrderApi,
} from '../helpers/api.js';
import { requireE2eQaCredentials, loadRepoEnv } from '../helpers/loadEnv.js';

loadRepoEnv();

/**
 * JOURNEY 005 — Nabz Order lifecycle core
 * Real FE + BE + Postgres. VITE_USE_MOCK_API=false.
 */

test.describe.configure({ mode: 'serial' });

test('JOURNEY 005: Nabz Order create → profile → fail → PATCH protection', async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(300_000);

  const stamp = Date.now();
  const companyName = `E2E-NABZ-${stamp}`;
  const orderTitle = `E2E-NABZ-ORDER-${stamp}`;
  const activityText = `E2E-NABZ-ACT-${stamp}`;
  const nationalId = `7${String(stamp).slice(-10)}`;
  const mobile = `09${String(stamp).slice(-8).padStart(8, '0')}`;

  /** @type {Record<string, any>} */
  const report = {
    companyId: null,
    orderId: null,
    orderCode: null,
    failedOrderId: null,
    activityId: null,
    token: null,
    gaps: [],
    failedNetwork: [],
  };

  page.on('response', async (res) => {
    try {
      if (res.status() >= 400 && res.url().includes('/api/')) {
        let body = null;
        try {
          body = await res.text();
        } catch {
          body = null;
        }
        report.failedNetwork.push({
          url: res.url().replace(/accessToken=[^&]+/gi, 'accessToken=***'),
          status: res.status(),
          method: res.request().method(),
          body: String(body || '').slice(0, 500),
        });
      }
    } catch {
      /* ignore */
    }
  });

  const failStep = async (step, detail = '') => {
    await page.screenshot({
      path: testInfo.outputPath(`fail-${String(step).replace(/\s+/g, '-').slice(0, 80)}.png`),
      fullPage: true,
    });
    throw new Error(
      `JOURNEY 005 FAIL — ${step}${detail ? `: ${detail}` : ''}`
      + `\nIDs: ${JSON.stringify({
        companyId: report.companyId,
        orderId: report.orderId,
        orderCode: report.orderCode,
        failedOrderId: report.failedOrderId,
      })}`
      + `\nGaps: ${JSON.stringify(report.gaps)}`
      + `\nFailed network: ${JSON.stringify(report.failedNetwork.slice(-8))}`,
    );
  };

  // ── Login ─────────────────────────────────────────────────────────────
  const session = await loginAsQaAdmin(page);
  report.token = session.token;

  // ── Legal customer without nationalId → Order blocked ─────────────────
  {
    const bare = await createCompanyApi(request, report.token, {
      name: `E2E-NABZ-NOID-${stamp}`,
      entityType: 'CUSTOMER',
      payload: { personType: 'legal', recordType: 'CUSTOMER' },
    });
    const bareId = bare.json?.company?.id;
    if (!bareId) await failStep('Create legal customer without nationalId', JSON.stringify(bare.json));
    const blocked = await createOrderApi(request, report.token, {
      companyId: bareId,
      title: `blocked-${stamp}`,
    });
    if (blocked.status < 400) {
      await failStep('NationalId gate should block', `${blocked.status}`);
    }
    expect(String(blocked.json?.error || '')).toMatch(/NATIONAL_ID|CUSTOMER_NATIONAL/);
    await archiveEntity(request, report.token, 'company', bareId);
  }

  // ── Supplier as sales customer (API) ──────────────────────────────────
  {
    const supplier = await createCompanyApi(request, report.token, {
      name: `E2E-NABZ-SUP-${stamp}`,
      entityType: 'SUPPLIER',
      nationalId: `5${String(stamp).slice(-10)}`,
      payload: { personType: 'legal', recordType: 'SUPPLIER' },
    });
    const supplierId = supplier.json?.company?.id;
    const supplierOrder = await createOrderApi(request, report.token, {
      companyId: supplierId,
      title: `supplier-order-${stamp}`,
      code: `JR-SUP-${stamp}`,
    });
    // Current contract: no explicit SUPPLIER rejection on order create.
    // UI listCustomers filters CUSTOMER only; API still accepts SUPPLIER.
    if (supplierOrder.status >= 200 && supplierOrder.status < 300) {
      report.gaps.push({
        code: 'SUPPLIER_ORDER_API_ALLOWED',
        detail: 'Backend accepts SUPPLIER companyId on POST /orders; Nabz UI filters CUSTOMER-only.',
        orderId: supplierOrder.json?.order?.id,
      });
      if (supplierOrder.json?.order?.id) {
        await archiveEntity(request, report.token, 'order', supplierOrder.json.order.id);
      }
    } else {
      report.gaps.push({
        code: 'SUPPLIER_ORDER_API_REJECTED',
        status: supplierOrder.status,
        error: supplierOrder.json?.error,
      });
    }
    if (supplierId) await archiveEntity(request, report.token, 'company', supplierId);
  }

  // ── Create canonical Customer (Kanoon UI — natural, no Linka) ─────────
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'ثبت مخاطب جدید' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'حقیقی' }).click();
  await page.getByRole('button', { name: 'ثبت مخاطب جدید' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await modal.getByLabel(/نام شخص/).fill(companyName);
  await modal.getByLabel(/شماره موبایل/).fill(mobile);
  await modal.locator('select').first().selectOption({ label: 'بازرگانی آهن و فولاد' });

  const companyPostPromise = page.waitForResponse(
    (res) => res.url().includes('/companies')
      && !res.url().includes('from-identity')
      && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await modal.getByRole('button', { name: /^ثبت$/ }).click();
  const companyPost = await companyPostPromise;
  if (companyPost.status() < 200 || companyPost.status() >= 300) {
    await failStep('Company create HTTP', `${companyPost.status()}`);
  }
  const companyBody = await companyPost.json();
  report.companyId = companyBody?.company?.id || companyBody?.id;
  if (!report.companyId) await failStep('Company create missing id', JSON.stringify(companyBody));

  // Make company operational for Nabz (mirror Journey 001)
  {
    const companyGet = await getCompany(request, report.token, report.companyId);
    const existing = companyGet.json?.company || companyGet.json;
    const patch = await patchCompany(request, report.token, report.companyId, {
      name: existing?.name || companyName,
      nationalId,
      activityDomain: existing?.activityDomain || 'بازرگانی آهن و فولاد',
      payload: {
        ...(existing?.payload || {}),
        personType: 'natural',
        personName: companyName,
        mobile,
      },
    });
    if (patch.status < 200 || patch.status >= 300) {
      await failStep('Company nationalId patch', `${patch.status}`);
    }
  }
  await page.goto(`/kanoon/contact/${report.companyId}`);
  await expect(page.getByText(companyName).first()).toBeVisible({ timeout: 20_000 });

  // ── Create Order from Nabz UI ─────────────────────────────────────────
  await page.goto('/nabz');
  await expect(page.getByRole('button', { name: 'ثبت سفارش جدید' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'ثبت سفارش جدید' }).click();

  const orderDialog = page.getByRole('dialog').filter({ hasText: 'ثبت سفارش جدید' });
  await expect(orderDialog).toBeVisible();

  const customerInput = orderDialog.locator('input[aria-label="مشتری"]');
  await customerInput.click();
  await customerInput.fill(companyName);
  const customerOption = page.locator('.nabz-combobox__option').filter({ hasText: companyName }).first();
  await expect(customerOption).toBeVisible({ timeout: 15_000 });
  await customerOption.click();

  await orderDialog.getByRole('button', { name: /افزودن سطر|انتخاب از ویترین/ }).first().click();
  const picker = page.locator('.nabz-picker-modal');
  await expect(picker).toBeVisible();
  await picker.locator('tbody tr').first().evaluate((row) => row.click());
  await expect(picker.locator('tbody tr').first()).toHaveClass(/is-selected/);
  await picker.getByRole('button', { name: 'افزودن به سفارش' }).evaluate((btn) => btn.click());

  await orderDialog.locator('textarea').fill(orderTitle);

  const submitBtn = orderDialog.getByRole('button', { name: /ثبت و ایجاد سفارش/ });
  await expect(submitBtn).toBeEnabled({ timeout: 15_000 });

  const orderPostPromise = page.waitForResponse(
    (res) => res.url().includes('/orders') && res.request().method() === 'POST',
    { timeout: 45_000 },
  );
  await submitBtn.click();
  const orderPost = await orderPostPromise;
  if (orderPost.status() < 200 || orderPost.status() >= 300) {
    await failStep('Order create HTTP', `${orderPost.status()} ${await orderPost.text().catch(() => '')}`);
  }
  const orderBody = await orderPost.json();
  const order = orderBody?.order || orderBody;
  report.orderId = order?.id;
  report.orderCode = order?.code;
  if (!report.orderId) await failStep('Order missing id', JSON.stringify(orderBody));

  await expect(orderDialog).toBeHidden({ timeout: 20_000 });

  {
    const got = await getOrderApi(request, report.token, report.orderId);
    const order = got.json?.order || got.json;
    if (String(order?.companyId) !== String(report.companyId)) {
      await failStep('companyId mismatch', `${order?.companyId} vs ${report.companyId}`);
    }
    if (String(order?.status).toLowerCase() !== 'current') {
      await failStep('initial status', order?.status);
    }
    const stage = String(order?.stageId);
    if (stage !== '1' && stage !== 'kavosh') {
      await failStep('initial stage', stage);
    }
  }

  // Visible in Nabz
  await page.goto('/nabz');
  await expect(page.getByText(report.orderCode || orderTitle).first()).toBeVisible({ timeout: 30_000 });

  // Visible in Kanoon Customer 360
  await page.goto(`/kanoon/contact/${report.companyId}?tab=orders`);
  await expect(page.getByText('نبض — سفارشات')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(report.orderCode, { exact: false }).first()).toBeVisible({ timeout: 30_000 });

  // Hard refresh
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByText(report.orderCode, { exact: false }).first()).toBeVisible({ timeout: 30_000 });

  // Order Profile
  await page.goto(`/nabz/order/${encodeURIComponent(report.orderCode)}`);
  await expect(page.getByText(report.orderCode).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(companyName).first()).toBeVisible({ timeout: 20_000 });

  // Customer navigation (exact companyId)
  const customerLink = page.getByRole('link', { name: new RegExp(companyName) }).first()
    .or(page.locator(`a[href*="/kanoon/contact/${report.companyId}"]`).first());
  if (await customerLink.isVisible().catch(() => false)) {
    await customerLink.click();
    await expect(page).toHaveURL(new RegExp(`/kanoon/contact/${report.companyId}`), { timeout: 30_000 });
  } else {
    report.gaps.push({ code: 'ORDER_PROFILE_CUSTOMER_LINK', detail: 'No clickable customer link with exact href' });
    await page.goto(`/kanoon/contact/${report.companyId}`);
  }

  // Activity via API (canonical Pooyesh) + timeline presence
  {
    const act = await createActivityApi(request, report.token, {
      subjectType: 'COMPANY',
      subjectId: report.companyId,
      activityType: 'call',
      description: activityText,
    });
    if (act.status < 200 || act.status >= 300) {
      await failStep('Activity create', `${act.status} ${JSON.stringify(act.json)}`);
    }
    report.activityId = act.json?.activity?.id || act.json?.id;
    const list = await getActivitiesForCompany(request, report.token, report.companyId);
    const items = list.json?.items || list.json?.activities || [];
    if (!items.some((a) => a.id === report.activityId || a.description === activityText)) {
      await failStep('Activity not in company list');
    }
    await page.goto(`/kanoon/contact/${report.companyId}?tab=timeline`);
    await expect(page.getByText('تایم‌لاین وقایع')).toBeVisible({ timeout: 30_000 });
    const onTimeline = await page.getByText(activityText).first().isVisible({ timeout: 20_000 }).catch(() => false);
    if (!onTimeline) {
      report.gaps.push({ code: 'TIMELINE_MAPPING_GAP', detail: 'Activity in API but not visible on Company Timeline UI' });
    }
  }

  // ── FAILED path (second order) ────────────────────────────────────────
  {
    const failOrder = await createOrderApi(request, report.token, {
      companyId: report.companyId,
      title: `E2E-NABZ-FAIL-${stamp}`,
      code: `JR-NABZ-F-${stamp}`,
      payload: { items: [{ name: 'خط تست', qty: 1 }] },
    });
    if (failOrder.status < 200 || failOrder.status >= 300) {
      await failStep('Fail-order create', `${failOrder.status}`);
    }
    report.failedOrderId = failOrder.json?.order?.id;
    let version = failOrder.json?.order?.version;

    const noReason = await patchOrderApi(request, report.token, report.failedOrderId, {
      status: 'failed',
      version,
    });
    if (noReason.status < 400) {
      await failStep('FAILED without reason should reject', `${noReason.status}`);
    }
    expect(String(noReason.json?.error || '')).toMatch(/FAIL_REASON|ORDER_FAIL/);

    const withReason = await patchOrderApi(request, report.token, report.failedOrderId, {
      status: 'failed',
      payload: {
        ...(failOrder.json?.order?.payload || {}),
        failReason: 'قیمت',
      },
      version,
    });
    if (withReason.status < 200 || withReason.status >= 300) {
      await failStep('FAILED with reason', `${withReason.status} ${JSON.stringify(withReason.json)}`);
    }
    expect(String(withReason.json?.order?.status).toLowerCase()).toBe('failed');
    version = withReason.json.order.version;

    const escape = await patchOrderApi(request, report.token, report.failedOrderId, {
      status: 'current',
      version,
    });
    if (escape.status < 400) {
      await failStep('FAILED must be terminal', `${escape.status}`);
    }
    expect(String(escape.json?.error || '')).toMatch(/INVALID_ORDER_STATUS/);
  }

  // ── Generic PATCH cannot jump to Phase2 without commitment ────────────
  {
    const got = await getOrderApi(request, report.token, report.orderId);
    const order = got.json.order;
    const bad = await patchOrderApi(request, report.token, report.orderId, {
      stageId: '4',
      version: order.version,
    });
    if (bad.status < 400) await failStep('PATCH stage 4 while current should reject', `${bad.status}`);
    expect(String(bad.json?.error || '')).toMatch(/ORDER_PHASE2|INVALID_ORDER_STAGE/);

    const badSuccess = await patchOrderApi(request, report.token, report.orderId, {
      status: 'success',
      stageId: '4',
      version: order.version,
    });
    if (badSuccess.status < 400) {
      await failStep('success without gateway commitment should reject', `${badSuccess.status}`);
    }
    expect(String(badSuccess.json?.error || '')).toMatch(/ORDER_COMPLETION|INVALID_ORDER/);
  }

  // ── Gateway Phase-2 entry — SUCCESS + OPEN (DDL-18B) ────────────
  {
    const got = await getOrderApi(request, report.token, report.orderId);
    let version = got.json.order.version;

    const toPish = await patchOrderApi(request, report.token, report.orderId, {
      stageId: '3',
      version,
    });
    if (toPish.status !== 200) await failStep('stage→pishkesh', JSON.stringify(toPish.json));
    version = toPish.json.order.version;

    const complete = await patchOrderApi(request, report.token, report.orderId, {
      status: 'success',
      stageId: '4',
      payload: {
        ...(toPish.json.order.payload || {}),
        gatewayDecision: { outcome: 'success', paymentType: 'پیش‌پرداخت' },
        phase2EnteredAt: new Date().toISOString(),
        proforma: { signed: true, revision: 1 },
        closure: 'open',
      },
      version,
    });
    if (complete.status !== 200) {
      await failStep('phase2 commit', `${complete.status} ${JSON.stringify(complete.json)}`);
    }
    expect(String(complete.json.order.status).toLowerCase()).toBe('success');
    expect(String(complete.json.order.payload?.closure || 'open').toLowerCase()).toBe('open');
    expect(String(complete.json.order.stageId)).toBe('4');

    version = complete.json.order.version;
    const tadarok = await patchOrderApi(request, report.token, report.orderId, {
      stageId: '5',
      payload: {
        ...(complete.json.order.payload || {}),
        gatewayDecision: { outcome: 'success' },
        phase2EnteredAt: complete.json.order.payload?.phase2EnteredAt || new Date().toISOString(),
        closure: 'open',
      },
      version,
    });
    if (tadarok.status !== 200) {
      report.gaps.push({ code: 'PROCUREMENT_STAGE', detail: tadarok.json });
    } else {
      expect(String(tadarok.json.order.stageId)).toBe('5');
      expect(String(tadarok.json.order.status).toLowerCase()).toBe('success');
      expect(String(tadarok.json.order.id)).toBe(report.orderId);
    }

    const co = await getCompany(request, report.token, report.companyId);
    const life = co.json?.company?.lifecycleStage;
    if (life !== 'first_time_buyer' && life !== 'loyal') {
      report.gaps.push({
        code: 'LIFECYCLE_AFTER_SUCCESS',
        detail: `expected نوپیمان/هم‌پیمان after SUCCESS purchase; got ${life}`,
      });
    }
  }

  // API list proof
  const orders = await getOrdersForCompany(request, report.token, report.companyId);
  const items = orders.json?.items || orders.json?.orders || [];
  if (!items.some((o) => o.id === report.orderId)) {
    await failStep('Order missing from company orders API');
  }

  console.log('[e2e-005] PASS', JSON.stringify({
    companyId: report.companyId,
    orderId: report.orderId,
    orderCode: report.orderCode,
    failedOrderId: report.failedOrderId,
    gaps: report.gaps,
  }));

  // Cleanup (soft)
  for (const id of [report.activityId]) {
    if (id) await archiveEntity(request, report.token, 'activity', id).catch(() => {});
  }
  // Do not archive success order if saranjam gates may block — leave for ops cleanup prefix E2E-NABZ-
});
