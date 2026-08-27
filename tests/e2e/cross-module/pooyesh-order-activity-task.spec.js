import { test, expect } from '@playwright/test';
import { loginAsQaAdmin } from '../helpers/auth.js';
import {
  archiveEntity,
  getActivitiesForSubject,
  getCompany,
  getTasksForSubject,
  loginApi,
  patchCompany,
} from '../helpers/api.js';
import { requireE2eQaCredentials, loadRepoEnv } from '../helpers/loadEnv.js';

loadRepoEnv();

/**
 * POOYESH JOURNEY 006 — Cross-Module canonical Activity + Task
 * Kanoon Customer -> Nabz Order -> Order-linked canonical Activity (subjectType=COMPANY,
 * payload.orderId — NOT the orderCrmService shadow model) -> canonical Task (tomorrow) ->
 * Pooyesh interactions + Calendar + Unified Company Timeline projections ->
 * Task completion -> hard refresh -> exactly-one-record API proof.
 * Real FE + BE + Postgres. VITE_USE_MOCK_API=false. No Activity/Task mocks.
 */

test.describe.configure({ mode: 'serial' });

test('POOYESH JOURNEY 006: Order Activity + Task canonical cross-module', async ({ page, request }, testInfo) => {
  test.setTimeout(240_000);

  const stamp = Date.now();
  const companyName = `E2E-POOY-${stamp}`;
  const orderMarker = `E2E-POOY-ORDER-${stamp}`;
  const activityText = `E2E-POOY-ACTIVITY-${stamp}`;
  const taskTitle = `E2E-POOY-TASK-${stamp}`;
  const nationalId = `9${String(stamp).slice(-10)}`;
  const mobile = `09${String(stamp).slice(-8).padStart(8, '0')}`;
  const tomorrowIso = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);

  /** @type {any} */
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

  const fail = async (relation, detail = '') => {
    await page.screenshot({
      path: testInfo.outputPath(`fail-${relation.replace(/\s+/g, '-')}.png`),
      fullPage: true,
    });
    throw new Error(
      `POOYESH JOURNEY 006 FAIL — ${relation}${detail ? `: ${detail}` : ''}`
      + `\nIDs: ${JSON.stringify({
        companyId: ids.companyId,
        orderId: ids.orderId,
        activityId: ids.activityId,
        taskId: ids.taskId,
      })}`
      + `\nFailed network: ${JSON.stringify(ids.failedNetwork.slice(-5))}`,
    );
  };

  // ── 1. Login ──────────────────────────────────────────────────────────
  const session = await loginAsQaAdmin(page, {
    requiredPermissions: [
      'companies:write', 'orders:write',
      'activities:write', 'activities:read',
      'tasks:write', 'tasks:read',
    ],
  });
  ids.token = session.token;

  // ── 2. Create Company from Kanoon (natural — no Linka) ──────────────────
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'ثبت مخاطب جدید' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'حقیقی' }).click();
  await page.getByRole('button', { name: 'ثبت مخاطب جدید' }).click();

  const contactModal = page.getByRole('dialog');
  await expect(contactModal).toBeVisible();
  await contactModal.getByLabel(/نام شخص/).fill(companyName);
  await contactModal.getByLabel(/شماره موبایل/).fill(mobile);
  await contactModal.locator('select').first().selectOption({ label: 'بازرگانی آهن و فولاد' });

  const companyPostPromise = page.waitForResponse(
    (res) => res.url().includes('/companies')
      && !res.url().includes('from-identity')
      && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await contactModal.getByRole('button', { name: /^ثبت$/ }).click();
  const companyPost = await companyPostPromise;
  if (companyPost.status() < 200 || companyPost.status() >= 300) {
    await fail('Company create HTTP', `${companyPost.status()}`);
  }
  const companyBody = await companyPost.json();
  ids.companyId = companyBody?.company?.id || companyBody?.id;
  if (!ids.companyId) await fail('Company create missing id', JSON.stringify(companyBody));
  await expect(contactModal).toBeHidden({ timeout: 15_000 });

  // Make company operational via canonical API patch (nationalId) — required
  // for Nabz Order creation and Pooyesh completion gates.
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
      await fail('Company nationalId API patch', `${patch.status} ${JSON.stringify(patch.json)}`);
    }
  }

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

  const incomplete = page.getByRole('alertdialog', { name: /اطلاعات شرکت ناقص/ });
  if (await incomplete.isVisible().catch(() => false)) {
    await fail(
      'Company not operational for Order (completion gate)',
      await incomplete.innerText().catch(() => ''),
    );
  }

  await expect(orderDialog.locator('input[aria-label="کارشناس مرتبط"]')).toHaveAttribute(
    'placeholder',
    /جستجو در کارشناسان/,
    { timeout: 10_000 },
  );

  await orderDialog.getByRole('button', { name: /افزودن سطر|انتخاب از ویترین/ }).first().click();
  const picker = page.locator('.nabz-picker-modal');
  await expect(picker).toBeVisible();
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
    await fail('Order create HTTP', `${orderPost.status()}`);
  }
  const orderBody = await orderPost.json();
  const order = orderBody?.order || orderBody;
  ids.orderId = order?.id;
  ids.orderCode = order?.code;
  const orderCompanyId = order?.companyId || order?.customerId || order?.payload?.customerId;
  if (!ids.orderId) await fail('Order create missing id', JSON.stringify(orderBody));
  if (String(orderCompanyId) !== String(ids.companyId)) {
    await fail('Order→Company reference mismatch', `expected ${ids.companyId} got ${orderCompanyId}`);
  }
  await expect(orderDialog).toBeHidden({ timeout: 20_000 });

  // ── 4. Order-linked canonical Activity via Order Profile "میثاق" tab ────
  // (Golden-Law fix under test: must NOT land in orderCrmService's shadow
  // crmActivities model — must be a real `activities` row, subjectType=COMPANY,
  // with payload.orderId set for order-scoped filtering.)
  await page.goto(`/nabz/order/${encodeURIComponent(ids.orderCode)}`);
  await page.getByRole('tab', { name: 'میثاق' }).click();
  await expect(page.getByRole('heading', { name: 'ثبت فعالیت و برنامه پیگیری' })).toBeVisible({ timeout: 20_000 });

  await page.locator('#crm-activity-body').fill(activityText);
  await page.getByLabel('تنظیم یادآور').check();
  await page.locator('input[type="date"]').fill(tomorrowIso);
  await page.locator('input[type="time"]').fill('10:00');

  const activityPostPromise = page.waitForResponse(
    (res) => res.url().includes('/activities') && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'ثبت فعالیت' }).click();
  const activityPost = await activityPostPromise;
  if (activityPost.status() < 200 || activityPost.status() >= 300) {
    await fail('Order Activity create HTTP', `${activityPost.status()}`);
  }
  const activityBody = await activityPost.json();
  const activity = activityBody?.activity || activityBody;
  ids.activityId = activity?.id;
  if (!ids.activityId) await fail('Order Activity create missing id', JSON.stringify(activityBody));
  if (String(activity.subjectType) !== 'COMPANY' || String(activity.subjectId) !== String(ids.companyId)) {
    await fail(
      'Order Activity subject mismatch (shadow-model regression)',
      `${activity.subjectType}/${activity.subjectId}`,
    );
  }
  if (String(activity.payload?.orderId) !== String(ids.orderId)) {
    await fail('Order Activity missing payload.orderId linkage', JSON.stringify(activity.payload));
  }

  await expect(page.getByText(activityText).first()).toBeVisible({ timeout: 20_000 });

  // ── 5. Same Activity visible in Kanoon Customer 360 (Pooyesh interactions) ─
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=interactions`);
  await expect(page.getByText('پویش — تعاملات')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(activityText).first()).toBeVisible({ timeout: 20_000 });

  // ── 6. Create canonical Task (Pooyesh Task Board) due tomorrow ──────────
  await expect(page.getByText('پویش — وظایف')).toBeVisible();
  await page.locator('.pooyesh-tasks__input').fill(taskTitle);

  const taskDateTrigger = page.locator('.pooyesh-tasks__date .jalali-date-picker__trigger');
  await taskDateTrigger.click();
  const todayCell = page.locator('.jalali-date-picker__day.is-today');
  await expect(todayCell).toBeVisible({ timeout: 10_000 });
  const tomorrowCell = todayCell.locator('xpath=following-sibling::button[1]');
  await tomorrowCell.click();

  const taskPostPromise = page.waitForResponse(
    (res) => res.url().includes('/tasks') && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'افزودن وظیفه' }).click();
  const taskPost = await taskPostPromise;
  if (taskPost.status() < 200 || taskPost.status() >= 300) {
    await fail('Task create HTTP', `${taskPost.status()}`);
  }
  const taskBody = await taskPost.json();
  const task = taskBody?.task || taskBody;
  ids.taskId = task?.id;
  if (!ids.taskId) await fail('Task create missing id', JSON.stringify(taskBody));
  if (String(task.subjectType) !== 'COMPANY' || String(task.subjectId) !== String(ids.companyId)) {
    await fail('Task subject mismatch', `${task.subjectType}/${task.subjectId}`);
  }

  await expect(page.getByTestId('pooyesh-task-item').filter({ hasText: taskTitle })).toBeVisible({ timeout: 20_000 });

  // ── 7. Calendar (Pooyesh) shows the canonical Task ──────────────────────
  await page.goto('/pooyesh');
  await expect(page.getByText(taskTitle).first()).toBeVisible({ timeout: 30_000 });

  // ── 8. Unified Company Timeline shows both Activity + Task ─────────────
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=timeline`);
  await expect(page.getByText('تایم‌لاین وقایع')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(activityText).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(taskTitle).first()).toBeVisible({ timeout: 20_000 });

  // ── 9. Order Profile CRM tab still shows the Activity — one record ──────
  await page.goto(`/nabz/order/${encodeURIComponent(ids.orderCode)}`);
  await page.getByRole('tab', { name: 'میثاق' }).click();
  await expect(page.getByText(activityText).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(activityText)).toHaveCount(1);

  // ── 10. Complete the Task ────────────────────────────────────────────────
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=interactions`);
  const taskItem = page.getByTestId('pooyesh-task-item').filter({ hasText: taskTitle });
  await expect(taskItem).toBeVisible({ timeout: 20_000 });

  const taskCompletePromise = page.waitForResponse(
    (res) => res.url().includes(`/tasks/${ids.taskId}/complete`) && res.request().method() === 'PATCH',
    { timeout: 30_000 },
  );
  await taskItem.getByRole('button', { name: '✓ تکمیل' }).click();
  const taskComplete = await taskCompletePromise;
  if (taskComplete.status() < 200 || taskComplete.status() >= 300) {
    await fail('Task complete HTTP', `${taskComplete.status()}`);
  }

  await expect(page.getByTestId('pooyesh-task-item').filter({ hasText: taskTitle })).toHaveCount(0, { timeout: 15_000 });

  // ── 11. Hard refresh — verify no duplicates, completion persists ───────
  await page.reload({ waitUntil: 'networkidle' });
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=interactions`);
  await expect(page.getByText('پویش — تعاملات')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(activityText).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('pooyesh-task-item').filter({ hasText: taskTitle })).toHaveCount(0);

  await page.goto(`/kanoon/contact/${ids.companyId}?tab=timeline`);
  await expect(page.getByText('تایم‌لاین وقایع')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(activityText).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(taskTitle).first()).toBeVisible({ timeout: 20_000 });

  // ── 12. Direct API — exactly one Activity, one Task record ─────────────
  const { username, password } = requireE2eQaCredentials();
  const apiLogin = await loginApi(request, username, password);
  const token = apiLogin.token;

  const activitiesGet = await getActivitiesForSubject(request, token, 'COMPANY', ids.companyId);
  expect(activitiesGet.status, 'GET Activities').toBeGreaterThanOrEqual(200);
  expect(activitiesGet.status, 'GET Activities').toBeLessThan(300);
  const matchedActivities = (activitiesGet.json?.items || []).filter(
    (a) => a.description === activityText,
  );
  expect(matchedActivities.length, 'exactly one canonical Activity for this test').toBe(1);
  expect(String(matchedActivities[0].id)).toBe(String(ids.activityId));
  expect(String(matchedActivities[0].payload?.orderId)).toBe(String(ids.orderId));

  const tasksGet = await getTasksForSubject(request, token, 'COMPANY', ids.companyId);
  expect(tasksGet.status, 'GET Tasks').toBeGreaterThanOrEqual(200);
  expect(tasksGet.status, 'GET Tasks').toBeLessThan(300);
  const matchedTasks = (tasksGet.json?.items || []).filter((t) => t.title === taskTitle);
  expect(matchedTasks.length, 'exactly one canonical Task for this test').toBe(1);
  expect(String(matchedTasks[0].id)).toBe(String(ids.taskId));
  expect(matchedTasks[0].status).toBe('COMPLETED');

  // ── 13. Cleanup (soft archive) ──────────────────────────────────────────
  const cleanup = [];
  for (const [kind, id] of [
    ['task', ids.taskId],
    ['activity', ids.activityId],
    ['order', ids.orderId],
    ['company', ids.companyId],
  ]) {
    if (!id) continue;
    const result = await archiveEntity(request, token, kind, id);
    cleanup.push({ kind, id, status: result.status });
  }
  console.log('[e2e-pooy-006] cleanup', JSON.stringify(cleanup));
  console.log('[e2e-pooy-006] PASS ids', JSON.stringify({
    companyId: ids.companyId,
    orderId: ids.orderId,
    orderCode: ids.orderCode,
    activityId: ids.activityId,
    taskId: ids.taskId,
  }));
});
