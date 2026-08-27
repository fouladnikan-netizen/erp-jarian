import { test, expect } from '@playwright/test';
import { loginAsQaAdmin } from '../helpers/auth.js';
import {
  archiveEntity,
  getActivitiesForCompany,
  getCompany,
  getOrdersForCompany,
  loginApi,
  patchCompany,
} from '../helpers/api.js';
import { requireE2eQaCredentials } from '../helpers/loadEnv.js';

/**
 * Cross-Module Critical Journey 001
 * Company (Kanoon) → Order (Nabz) → Profile → Activity (Pooyesh) → refresh → API proof
 * Real FE + BE + Postgres. VITE_USE_MOCK_API=false. No Company/Order/Activity mocks.
 */

test.describe.configure({ mode: 'serial' });

test('CROSS-MODULE JOURNEY 001: Company → Order → Activity', async ({ page, request }, testInfo) => {
  test.setTimeout(180_000);

  const stamp = Date.now();
  const companyName = `E2E-XMOD-${stamp}`;
  const orderMarker = `E2E-XMOD-ORDER-${stamp}`;
  const activityText = `E2E-XMOD-ACTIVITY-${stamp}`;
  const nationalId = `9${String(stamp).slice(-10)}`;
  const mobile = `09${String(stamp).slice(-8).padStart(8, '0')}`;

  /** @type {{ companyId?: string, orderId?: string, orderCode?: string, activityId?: string, token?: string, failedNetwork?: Array<object> }} */
  const ids = { failedNetwork: [] };

  page.on('response', async (res) => {
    try {
      if (res.status() >= 400 && res.url().includes('/api/')) {
        let body = null;
        try {
          body = await res.text();
        } catch {
          body = null;
        }
        ids.failedNetwork.push({
          url: res.url(),
          status: res.status(),
          method: res.request().method(),
          body: body?.slice?.(0, 800) || body,
        });
      }
    } catch {
      /* ignore listener errors */
    }
  });

  const failWithRelation = async (relation, detail = '') => {
    await page.screenshot({
      path: testInfo.outputPath(`fail-${relation.replace(/\s+/g, '-')}.png`),
      fullPage: true,
    });
    throw new Error(
      `CROSS-MODULE JOURNEY 001 FAIL — ${relation}${detail ? `: ${detail}` : ''}`
      + `\nIDs: ${JSON.stringify({ companyId: ids.companyId, orderId: ids.orderId, activityId: ids.activityId })}`
      + `\nFailed network: ${JSON.stringify(ids.failedNetwork.slice(-5))}`,
    );
  };

  // ── 1. Login ──────────────────────────────────────────────────────────
  const session = await loginAsQaAdmin(page);
  ids.token = session.token;

  // ── 2. Create Company from Kanoon (natural — no Linka) ────────────────
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
    await failWithRelation('Company create HTTP', `${companyPost.status()}`);
  }
  const companyBody = await companyPost.json();
  ids.companyId = companyBody?.company?.id || companyBody?.id;
  if (!ids.companyId) {
    await failWithRelation('Company create missing id', JSON.stringify(companyBody));
  }

  await expect(modal).toBeHidden({ timeout: 15_000 });

  const ensureNaturalList = async () => {
    await page.getByRole('button', { name: 'حقیقی' }).click();
    await expect(page.getByRole('button', { name: 'حقیقی' })).toHaveAttribute('aria-pressed', 'true');
  };

  const findCompanyInList = async () => {
    await ensureNaturalList();
    const search = page.getByRole('searchbox').or(page.locator('input[type="search"]')).first();
    await search.fill(companyName);
    await expect(page.getByRole('button', { name: companyName })).toBeVisible({ timeout: 30_000 });
  };

  await findCompanyInList();

  await page.reload({ waitUntil: 'networkidle' });
  await findCompanyInList();

  // Make company operational for Nabz/Pooyesh gates (nationalId required).
  // Company itself was created via Kanoon UI; nationalId is applied via canonical API
  // (Legal modal UI currently does not reliably persist root nationalId for natural persons).
  {
    const { username, password } = requireE2eQaCredentials();
    const apiLogin = await loginApi(request, username, password);
    ids.token = apiLogin.token;
    const companyGet = await getCompany(request, ids.token, ids.companyId);
    const existing = companyGet.json?.company || companyGet.json;
    const patch = await patchCompany(request, ids.token, ids.companyId, {
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
      await failWithRelation('Company nationalId API patch', `${patch.status} ${JSON.stringify(patch.json)}`);
    }
    const verify = await getCompany(request, ids.token, ids.companyId);
    const company = verify.json?.company || verify.json;
    if (!company?.nationalId) {
      await failWithRelation('Company nationalId missing after API patch', JSON.stringify(company));
    }
  }

  // Refresh FE cache so Nabz sees operational company.
  await page.goto(`/kanoon/contact/${ids.companyId}`);
  await expect(page.getByText(companyName).first()).toBeVisible({ timeout: 20_000 });

  // ── 3. Create Order from Nabz ─────────────────────────────────────────
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

  // If completion gate opens, company is not operational — fail with evidence.
  const incomplete = page.getByRole('alertdialog', { name: /اطلاعات شرکت ناقص/ });
  if (await incomplete.isVisible().catch(() => false)) {
    await failWithRelation(
      'Company not operational for Order (completion gate)',
      await incomplete.innerText().catch(() => ''),
    );
  }

  // Expert placeholder changes once customerId is set.
  await expect(orderDialog.locator('input[aria-label="کارشناس مرتبط"]')).toHaveAttribute(
    'placeholder',
    /جستجو در کارشناسان/,
    { timeout: 10_000 },
  );

  await orderDialog.getByRole('button', { name: /افزودن سطر|انتخاب از ویترین/ }).first().click();
  const picker = page.locator('.nabz-picker-modal');
  await expect(picker).toBeVisible();
  // Nested under create-order overlay — use JS click so React toggle receives the event.
  await picker.locator('tbody tr').first().evaluate((row) => row.click());
  await expect(picker.locator('tbody tr').first()).toHaveClass(/is-selected/);
  await picker.getByRole('button', { name: 'افزودن به سفارش' }).evaluate((btn) => btn.click());

  await orderDialog.locator('textarea').fill(orderMarker);

  const submitBtn = orderDialog.getByRole('button', { name: /ثبت و ایجاد سفارش/ });
  await expect(submitBtn).toBeEnabled({ timeout: 15_000 });

  const orderPostPromise = page.waitForResponse(
    (res) => res.url().includes('/orders') && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await submitBtn.click();
  const orderPost = await orderPostPromise;
  if (orderPost.status() < 200 || orderPost.status() >= 300) {
    await failWithRelation('Order create HTTP', `${orderPost.status()}`);
  }
  const orderBody = await orderPost.json();
  const order = orderBody?.order || orderBody;
  ids.orderId = order?.id;
  ids.orderCode = order?.code;
  const orderCompanyId = order?.companyId || order?.customerId || order?.payload?.customerId;
  if (!ids.orderId) {
    await failWithRelation('Order create missing id', JSON.stringify(orderBody));
  }
  if (String(orderCompanyId) !== String(ids.companyId)) {
    await failWithRelation(
      'Order→Company reference mismatch',
      `expected ${ids.companyId} got ${orderCompanyId}`,
    );
  }

  await expect(orderDialog).toBeHidden({ timeout: 20_000 });

  // Order visible in Nabz list (by code or customer name)
  const nabzSearch = page.getByRole('searchbox').or(page.locator('input[type="search"]')).first();
  await nabzSearch.fill(ids.orderCode || companyName);
  await expect(
    page.getByText(ids.orderCode || companyName).first(),
  ).toBeVisible({ timeout: 20_000 });

  await page.reload({ waitUntil: 'networkidle' });
  await nabzSearch.fill(ids.orderCode || companyName);
  await expect(
    page.getByText(ids.orderCode || companyName).first(),
  ).toBeVisible({ timeout: 30_000 });

  // ── 4. Order visible in Kanoon Customer Profile ───────────────────────
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=orders`);
  await expect(page.getByText('نبض — سفارشات')).toBeVisible({ timeout: 30_000 });

  const orderVisibleInProfile = await page
    .getByText(ids.orderCode, { exact: false })
    .first()
    .isVisible()
    .catch(() => false);
  if (!orderVisibleInProfile) {
    await failWithRelation(
      'Cross-Module Relationship Bug: Order missing from Company Profile',
      `orderCode=${ids.orderCode}`,
    );
  }

  // ── 5. Create Activity for same Company ───────────────────────────────
  await page.getByRole('button', { name: /ثبت فعالیت جدید/ }).click();
  await page.locator('.kprofile-magic__textarea').fill(activityText);

  const activityPostPromise = page.waitForResponse(
    (res) => res.url().includes('/activities') && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'ثبت فعالیت' }).click();
  const activityPost = await activityPostPromise;
  if (activityPost.status() < 200 || activityPost.status() >= 300) {
    await failWithRelation('Activity create HTTP', `${activityPost.status()}`);
  }
  const activityBody = await activityPost.json();
  const activity = activityBody?.activity || activityBody;
  ids.activityId = activity?.id;
  if (!ids.activityId) {
    await failWithRelation('Activity create missing id', JSON.stringify(activityBody));
  }
  if (String(activity.subjectType) !== 'COMPANY'
    || String(activity.subjectId) !== String(ids.companyId)) {
    await failWithRelation(
      'Activity subject mismatch',
      `${activity.subjectType}/${activity.subjectId}`,
    );
  }

  // ── 6. Activity visible in Company Timeline ───────────────────────────
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=timeline`);
  await expect(page.getByText('تایم‌لاین وقایع')).toBeVisible({ timeout: 30_000 });
  const activityOnTimeline = await page.getByText(activityText).first().isVisible().catch(() => false);
  if (!activityOnTimeline) {
    // Also check interactions tab for evidence
    await page.goto(`/kanoon/contact/${ids.companyId}?tab=interactions`);
    const onInteractions = await page.getByText(activityText).first().isVisible().catch(() => false);
    await failWithRelation(
      onInteractions
        ? 'Cross-Module Relationship Bug: Activity in Pooyesh but missing from Company Timeline'
        : 'Activity missing from Company Timeline',
      activityText,
    );
  }

  // ── 7. Hard refresh persistence ───────────────────────────────────────
  await page.reload({ waitUntil: 'networkidle' });
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=timeline`);
  await expect(page.getByRole('heading', { name: companyName }).or(page.getByText(companyName).first()))
    .toBeVisible({ timeout: 30_000 });

  const orderAfterRefresh = await page.goto(`/kanoon/contact/${ids.companyId}?tab=orders`)
    .then(async () => {
      await expect(page.getByText('نبض — سفارشات')).toBeVisible({ timeout: 30_000 });
      return page.getByText(ids.orderCode, { exact: false }).first().isVisible().catch(() => false);
    });
  if (!orderAfterRefresh) {
    await failWithRelation(
      'Order missing from Company Profile after hard refresh',
      ids.orderCode,
    );
  }

  await page.goto(`/kanoon/contact/${ids.companyId}?tab=timeline`);
  await expect(page.getByText('تایم‌لاین وقایع')).toBeVisible({ timeout: 30_000 });
  const activityAfterRefresh = await page.getByText(activityText).first().isVisible({ timeout: 30_000 }).catch(() => false);
  if (!activityAfterRefresh) {
    await failWithRelation(
      'Activity missing from Company Timeline after hard refresh',
      activityText,
    );
  }

  // ── 8. Direct API verification ────────────────────────────────────────
  const { username, password } = requireE2eQaCredentials();
  const apiLogin = await loginApi(request, username, password);
  const token = apiLogin.token;

  const companyGet = await getCompany(request, token, ids.companyId);
  expect(companyGet.status, 'GET Company').toBeGreaterThanOrEqual(200);
  expect(companyGet.status, 'GET Company').toBeLessThan(300);
  expect(String(companyGet.json?.company?.id || companyGet.json?.id)).toBe(String(ids.companyId));

  const ordersGet = await getOrdersForCompany(request, token, ids.companyId);
  expect(ordersGet.status, 'GET Orders').toBeGreaterThanOrEqual(200);
  expect(ordersGet.status, 'GET Orders').toBeLessThan(300);
  const orderItems = ordersGet.json?.items || [];
  const matchedOrder = orderItems.find((o) => String(o.id) === String(ids.orderId));
  expect(matchedOrder, 'orderId in company orders API').toBeTruthy();
  expect(String(matchedOrder.companyId)).toBe(String(ids.companyId));

  const activitiesGet = await getActivitiesForCompany(request, token, ids.companyId);
  expect(activitiesGet.status, 'GET Activities').toBeGreaterThanOrEqual(200);
  expect(activitiesGet.status, 'GET Activities').toBeLessThan(300);
  const activityItems = activitiesGet.json?.items || [];
  const matchedActivity = activityItems.find((a) => String(a.id) === String(ids.activityId));
  expect(matchedActivity, 'activityId in company activities API').toBeTruthy();
  expect(String(matchedActivity.subjectType)).toBe('COMPANY');
  expect(String(matchedActivity.subjectId)).toBe(String(ids.companyId));

  // ── 12. Cleanup (soft archive) ────────────────────────────────────────
  const cleanup = [];
  for (const [kind, id] of [
    ['activity', ids.activityId],
    ['order', ids.orderId],
    ['company', ids.companyId],
  ]) {
    if (!id) continue;
    const result = await archiveEntity(request, token, kind, id);
    cleanup.push({ kind, id, status: result.status });
  }
  console.log('[e2e-xmod] cleanup', JSON.stringify(cleanup));
  console.log('[e2e-xmod] PASS ids', JSON.stringify({
    companyId: ids.companyId,
    orderId: ids.orderId,
    orderCode: ids.orderCode,
    activityId: ids.activityId,
  }));
});
