import { test, expect } from '@playwright/test';
import { loginAsQaAdmin } from '../helpers/auth.js';
import {
  archiveEntity,
  completeActivityApi,
  convertLeadApi,
  createActivityApi,
  createCompanyApi,
  createOrderApi,
  getCompany,
  getLead,
  loginApi,
  patchCompany,
  recomputeLifecycleApi,
} from '../helpers/api.js';
import { requireE2eQaCredentials, loadRepoEnv } from '../helpers/loadEnv.js';

loadRepoEnv();

/**
 * CROSS-MODULE JOURNEY 003 — Customer Lifecycle Automation
 * Real FE + BE + Postgres. VITE_USE_MOCK_API=false.
 * Lifecycle changes ONLY via domain events (convert / activity.complete / order.create).
 * Never PATCH lifecycle_stage or drag cards to force stages.
 */

test.describe.configure({ mode: 'serial' });

test('CROSS-MODULE JOURNEY 003: Customer Lifecycle Automation', async ({ page, request }, testInfo) => {
  test.setTimeout(300_000);

  const stamp = Date.now();
  const leadName = `E2E-LC-${stamp}`;
  const supplierName = `E2E-SUP-${stamp}`;
  const personName = `شخص-LC-${stamp}`;
  const mobile = `09${String(stamp).slice(-8).padStart(8, '0')}`;
  const leadSource = `E2E-LC-SRC-${stamp}`;
  const nationalId = `8${String(stamp).slice(-10)}`;

  /** @type {Record<string, any>} */
  const report = {
    leadId: null,
    companyId: null,
    supplierId: null,
    catalogActivityId: null,
    followUpActivityId: null,
    orderId: null,
    conversionMode: null,
    failedNetwork: [],
    token: null,
    productDecision: 'SUCCESSFUL_PURCHASE_EVENT',
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
          body: String(body || '').slice(0, 600),
        });
      }
    } catch {
      /* ignore */
    }
  });

  const failStep = async (relation, detail = '') => {
    await page.screenshot({
      path: testInfo.outputPath(`fail-${String(relation).replace(/\s+/g, '-').slice(0, 80)}.png`),
      fullPage: true,
    });
    throw new Error(
      `CROSS-MODULE JOURNEY 003 FAIL — ${relation}${detail ? `: ${detail}` : ''}`
      + `\nIDs: ${JSON.stringify({
        leadId: report.leadId,
        companyId: report.companyId,
        orderId: report.orderId,
      })}`
      + `\nFailed network: ${JSON.stringify(report.failedNetwork.slice(-8))}`,
    );
  };

  const expectLifecycle = async (expected, label) => {
    const co = await getCompany(request, report.token, report.companyId);
    const stage = co.json?.company?.lifecycleStage;
    if (stage !== expected) {
      await failStep(label, `expected ${expected}, got ${stage}`);
    }
    return co.json.company;
  };

  // ── Preconditions ─────────────────────────────────────────────────────
  const health = await request.get('http://localhost:3100/api/health');
  expect(health.ok()).toBeTruthy();
  expect(process.env.VITE_USE_MOCK_API, 'VITE_USE_MOCK_API must be false').toBe('false');

  await loginAsQaAdmin(page, {
    requiredPermissions: [
      'leads:write',
      'leads:convert',
      'companies:write',
      'companies:read',
      'activities:write',
      'orders:write',
    ],
  });
  const { username, password } = requireE2eQaCredentials();
  const apiLogin = await loginApi(request, username, password);
  report.token = apiLogin.token;

  // Supplier fixture (must never appear on Customer Lifecycle)
  {
    const supplier = await createCompanyApi(request, report.token, {
      name: supplierName,
      entityType: 'SUPPLIER',
      nationalId: `7${String(stamp).slice(-10)}`,
      payload: { personType: 'legal', recordType: 'SUPPLIER' },
    });
    if (supplier.status < 200 || supplier.status >= 300) {
      await failStep('Supplier create', `${supplier.status} ${JSON.stringify(supplier.json)}`);
    }
    report.supplierId = supplier.json?.company?.id;
  }

  // ── 1–2 Create Lead in Ofogh (سرنخ‌ها) ────────────────────────────────
  await page.goto('/ofogh?view=leads');
  await expect(page.getByTestId('ofogh-tab-leads')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'ثبت سرنخ خام' })).toBeVisible();
  await page.getByRole('button', { name: 'ثبت سرنخ خام' }).click();

  const createDlg = page.getByRole('dialog', { name: 'ثبت سرنخ خام' });
  await expect(createDlg).toBeVisible();
  await createDlg.getByLabel(/نام شرکت یا مجموعه/).fill(leadName);
  await createDlg.getByLabel(/نام شخص/).fill(personName);
  await createDlg.getByLabel(/موبایل/).fill(mobile);
  await createDlg.getByLabel(/منبع جذب/).fill(leadSource);

  const leadPostPromise = page.waitForResponse(
    (res) => res.url().includes('/leads')
      && !res.url().includes('/convert')
      && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await createDlg.getByRole('button', { name: 'ذخیره سرنخ' }).click();
  const leadPost = await leadPostPromise;
  if (leadPost.status() < 200 || leadPost.status() >= 300) {
    await failStep('Lead create HTTP', `${leadPost.status()}`);
  }
  const leadBody = await leadPost.json();
  report.leadId = leadBody?.lead?.id || leadBody?.id;
  if (!report.leadId) await failStep('Lead create missing id', JSON.stringify(leadBody));

  await expect(page.locator('.ofoq-lead-card--raw', { hasText: leadName })).toBeVisible({
    timeout: 20_000,
  });

  // Close lead detail if auto-opened after save (must not block workspace tabs).
  const leadDlg = page.locator('.ofoq-modal--lead, [role="dialog"][aria-label*="سرنخ"]');
  if (await leadDlg.count()) {
    await page.keyboard.press('Escape');
    await expect(leadDlg).toHaveCount(0, { timeout: 10_000 }).catch(async () => {
      await page.getByRole('button', { name: 'بستن' }).first().click({ force: true });
    });
  }

  // ── 3 Lead is NOT a Customer Lifecycle card yet ───────────────────────
  await page.goto('/ofogh?view=customers');
  await expect(page.getByTestId('ofogh-customer-lifecycle-board')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(`[data-testid^="ofogh-customer-card-"]`, { hasText: leadName })).toHaveCount(0);
  await expect(page.getByText(supplierName)).toHaveCount(0);

  // ── 4–6 Convert (seed + link_existing if Linka create_new blocked) ────
  await page.goto('/ofogh?view=leads');
  await expect(page.getByTestId('ofogh-lead-board')).toBeVisible({ timeout: 30_000 });

  let converted = await convertLeadApi(request, report.token, report.leadId, { nationalId });
  if (converted.status >= 200 && converted.status < 300 && converted.json?.companyId) {
    report.companyId = converted.json.companyId;
    report.conversionMode = converted.json.conversionMode || 'create_new';
  } else {
    const seeded = await createCompanyApi(request, report.token, {
      name: leadName,
      entityType: 'CUSTOMER',
      nationalId,
      payload: { personType: 'legal', recordType: 'CUSTOMER' },
    });
    if (seeded.status < 200 || seeded.status >= 300) {
      await failStep('Seed company for convert', `${seeded.status} ${JSON.stringify(seeded.json)}`);
    }
    converted = await convertLeadApi(request, report.token, report.leadId, { nationalId });
    if (converted.status < 200 || converted.status >= 300) {
      await failStep('Convert link_existing', `${converted.status} ${JSON.stringify(converted.json)}`);
    }
    report.companyId = converted.json.companyId;
    report.conversionMode = converted.json.conversionMode || 'link_existing';
  }

  const leadAfter = await getLead(request, report.token, report.leadId);
  if (leadAfter.json?.lead?.convertedCompanyId !== report.companyId) {
    await failStep(
      'convertedCompanyId mismatch',
      `${leadAfter.json?.lead?.convertedCompanyId} vs ${report.companyId}`,
    );
  }

  await expectLifecycle('cold_lead', 'After convert lifecycle must be نوپدید (cold_lead)');

  // Arbitrary lifecycle PATCH must be rejected
  {
    const bad = await patchCompany(request, report.token, report.companyId, {
      lifecycleStage: 'loyal',
    });
    if (bad.status < 400) {
      await failStep('Arbitrary lifecycle PATCH should be rejected', `${bad.status}`);
    }
    expect(bad.json?.error || bad.json?.code).toBeTruthy();
  }

  // ── 7–9 Customer Lifecycle tab shows نوپدید ───────────────────────────
  await page.goto(`/ofogh?view=customers`);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('ofogh-customer-lifecycle-board')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId(`ofogh-customer-card-${report.companyId}`)).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId('ofogh-lifecycle-col-cold_lead')).toContainText(leadName);
  await expect(page.getByText(supplierName)).toHaveCount(0);

  // ── 11–12 Catalog activity completed → دیدار ──────────────────────────
  {
    const created = await createActivityApi(request, report.token, {
      subjectType: 'COMPANY',
      subjectId: report.companyId,
      activityType: 'catalog',
      description: `E2E catalog ${stamp}`,
    });
    if (created.status < 200 || created.status >= 300) {
      await failStep('Catalog activity create', `${created.status} ${JSON.stringify(created.json)}`);
    }
    report.catalogActivityId = created.json?.activity?.id;
    const done = await completeActivityApi(request, report.token, report.catalogActivityId);
    if (done.status < 200 || done.status >= 300) {
      await failStep('Catalog activity complete', `${done.status} ${JSON.stringify(done.json)}`);
    }
  }
  await expectLifecycle('pitched', 'After catalog complete → دیدار (pitched)');

  // ── 13–14 Follow-up activity → رویش ───────────────────────────────────
  {
    const created = await createActivityApi(request, report.token, {
      subjectType: 'COMPANY',
      subjectId: report.companyId,
      activityType: 'call',
      description: `E2E follow-up ${stamp}`,
    });
    if (created.status < 200 || created.status >= 300) {
      await failStep('Follow-up activity create', `${created.status}`);
    }
    report.followUpActivityId = created.json?.activity?.id;
    const done = await completeActivityApi(request, report.token, report.followUpActivityId);
    if (done.status < 200 || done.status >= 300) {
      await failStep('Follow-up activity complete', `${done.status}`);
    }
  }
  await expectLifecycle('nurturing', 'After follow-up → رویش (nurturing)');

  // ── National ID order gate (legal without nid) ────────────────────────
  {
    const noIdCompany = await createCompanyApi(request, report.token, {
      name: `E2E-NOID-${stamp}`,
      entityType: 'CUSTOMER',
      payload: { personType: 'legal', recordType: 'CUSTOMER' },
    });
    const noId = noIdCompany.json?.company?.id;
    const blocked = await createOrderApi(request, report.token, {
      companyId: noId,
      title: `blocked-${stamp}`,
    });
    if (blocked.status < 400) {
      await failStep('Order without nationalId should block', `${blocked.status}`);
    }
    expect(String(blocked.json?.error || blocked.json?.code || '')).toMatch(/NATIONAL_ID|CUSTOMER_NATIONAL/);
    if (noId) await archiveEntity(request, report.token, 'company', noId);
  }

  // ── 15–17 First Order → آستانه ────────────────────────────────────────
  {
    const order = await createOrderApi(request, report.token, {
      companyId: report.companyId,
      title: `E2E-LC-ORDER-${stamp}`,
      code: `JR-E2E-${stamp}`,
    });
    if (order.status < 200 || order.status >= 300) {
      await failStep('Order create', `${order.status} ${JSON.stringify(order.json)}`);
    }
    report.orderId = order.json?.order?.id;
    if (order.json?.order?.companyId !== report.companyId) {
      await failStep('order.companyId mismatch', JSON.stringify(order.json));
    }
  }
  await expectLifecycle('sales_qualified', 'After first order → آستانه (sales_qualified)');

  // ── 18–19 Hard refresh persistence ────────────────────────────────────
  await page.reload({ waitUntil: 'networkidle' });
  await page.goto('/ofogh?view=customers');
  await expect(page.getByTestId(`ofogh-customer-card-${report.companyId}`)).toBeVisible({
    timeout: 30_000,
  });
  await expectLifecycle('sales_qualified', 'After hard refresh lifecycle persists as آستانه');

  // ── 20–22 Customer card → Kanoon ──────────────────────────────────────
  await page.getByTestId(`ofogh-customer-card-${report.companyId}`).click();
  const kanoonLink = page.getByTestId('ofogh-open-kanoon-profile');
  await expect(kanoonLink).toBeVisible({ timeout: 15_000 });
  const kanoonHref = await kanoonLink.getAttribute('href');
  if (!kanoonHref || !kanoonHref.includes(report.companyId)) {
    await failStep('Kanoon deep-link missing companyId', String(kanoonHref));
  }
  await page.goto(kanoonHref);
  await expect(page).toHaveURL(new RegExp(`/kanoon/contact/${report.companyId}`), { timeout: 30_000 });

  // ── Forgotten / Shadow (deterministic asOf recompute) ─────────────────
  // Place company back conceptually: engagement from asOf without mutating lifecycle via PATCH.
  {
    // Shadow: آستانه + last order > 90d relative to asOf
    const asOfShadow = new Date(Date.now() + 100 * 86_400_000).toISOString();
    const shadow = await recomputeLifecycleApi(request, report.token, report.companyId, {
      asOf: asOfShadow,
      trigger: 'e2e_shadow',
    });
    if (shadow.json?.engagement !== 'shadow' && shadow.json?.company?.engagementStatus !== 'shadow') {
      // If order is "now", asOf +100d should make idle > 90
      await failStep('Shadow engagement', JSON.stringify(shadow.json));
    }

    // New order reactivates to normal
    const order2 = await createOrderApi(request, report.token, {
      companyId: report.companyId,
      title: `E2E-LC-ORDER2-${stamp}`,
      code: `JR-E2E2-${stamp}`,
    });
    if (order2.status < 200 || order2.status >= 300) {
      await failStep('Shadow reactivation order', `${order2.status}`);
    }
    const afterOrder = await getCompany(request, report.token, report.companyId);
    if (afterOrder.json?.company?.engagementStatus !== 'normal') {
      await failStep('Shadow → NORMAL', afterOrder.json?.company?.engagementStatus);
    }
    // Lifecycle stays آستانه+ (not reset to نوپدید)
    const life = afterOrder.json?.company?.lifecycleStage;
    if (life !== 'sales_qualified' && life !== 'first_time_buyer' && life !== 'loyal') {
      await failStep('Lifecycle must not reset after shadow reactivation', life);
    }
  }

  // Forgotten path on a separate early-stage customer
  {
    const early = await createCompanyApi(request, report.token, {
      name: `E2E-FORGOT-${stamp}`,
      entityType: 'CUSTOMER',
      nationalId: `6${String(stamp).slice(-10)}`,
      payload: { personType: 'legal', recordType: 'CUSTOMER' },
    });
    const earlyId = early.json?.company?.id;
    const asOf = new Date(Date.now() + 40 * 86_400_000).toISOString();
    const forgot = await recomputeLifecycleApi(request, report.token, earlyId, {
      asOf,
      trigger: 'e2e_forgotten',
    });
    const eng = forgot.json?.engagement || forgot.json?.company?.engagementStatus;
    if (eng !== 'forgotten') {
      await failStep('Forgotten engagement', JSON.stringify(forgot.json));
    }
    const act = await createActivityApi(request, report.token, {
      subjectType: 'COMPANY',
      subjectId: earlyId,
      activityType: 'call',
      description: `reactivate ${stamp}`,
    });
    await completeActivityApi(request, report.token, act.json?.activity?.id);
    const after = await getCompany(request, report.token, earlyId);
    if (after.json?.company?.engagementStatus !== 'normal') {
      await failStep('Forgotten → NORMAL', after.json?.company?.engagementStatus);
    }
    if (after.json?.company?.lifecycleStage !== 'cold_lead') {
      await failStep('Forgotten reactivation must keep lifecycle', after.json?.company?.lifecycleStage);
    }
    await archiveEntity(request, report.token, 'company', earlyId);
  }

  // Cleanup best-effort
  try {
    if (report.orderId) await archiveEntity(request, report.token, 'order', report.orderId);
    if (report.companyId) await archiveEntity(request, report.token, 'company', report.companyId);
    if (report.supplierId) await archiveEntity(request, report.token, 'company', report.supplierId);
    if (report.leadId) await archiveEntity(request, report.token, 'lead', report.leadId);
  } catch {
    /* ignore */
  }

  console.log('[e2e-003] PASS', JSON.stringify({
    leadId: report.leadId,
    companyId: report.companyId,
    conversionMode: report.conversionMode,
    productDecision: report.productDecision,
  }));
});
