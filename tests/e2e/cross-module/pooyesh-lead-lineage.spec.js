import { test, expect } from '@playwright/test';
import { loginAsQaAdmin } from '../helpers/auth.js';
import {
  archiveEntity,
  createCompanyApi,
  createTaskApi,
  getActivitiesForSubject,
  getLead,
  getTasksForSubject,
  loginApi,
} from '../helpers/api.js';
import { requireE2eQaCredentials, loadRepoEnv } from '../helpers/loadEnv.js';

loadRepoEnv();

/**
 * POOYESH JOURNEY 007 — Lead lineage across conversion
 * Create Raw Lead -> canonical Activity (subjectType=RAW_LEAD) -> canonical Task
 * (subjectType=RAW_LEAD, via API — no Raw-Lead Task creation UI exists yet, see
 * TASK_UI_RAW_LEAD_GAP in final report) -> convert Lead to Customer (canonical
 * flow) -> verify the original Activity/Task are preserved (not deleted, not
 * duplicated) and report whether Customer 360 UI can discover them
 * (LEAD_ACTIVITY_LINEAGE_GAP — informational, not a hard failure since backend
 * relation ownership stays with Raw Lead subject, by design, per DDL-15).
 * Real FE + BE + Postgres. VITE_USE_MOCK_API=false. No Lead/Activity/Task mocks.
 */

test.describe.configure({ mode: 'serial' });

test('POOYESH JOURNEY 007: Lead → Activity/Task → Convert → lineage', async ({ page, request }, testInfo) => {
  test.setTimeout(240_000);

  const stamp = Date.now();
  const leadName = `E2E-POOY-LEAD-${stamp}`;
  const personName = `شخص-${stamp}`;
  const mobile = `09${String(stamp).slice(-8).padStart(8, '0')}`;
  const leadSource = `E2E-POOY-SRC-${stamp}`;
  const activityText = `E2E-POOY-LEAD-ACTIVITY-${stamp}`;
  const taskTitle = `E2E-POOY-LEAD-TASK-${stamp}`;
  const nationalId = `9${String(stamp).slice(-10)}`;

  /** @type {any} */
  const report = {
    leadId: null,
    companyId: null,
    activityId: null,
    taskId: null,
    conversionMode: null,
    leadActivityVisibleOnCustomer360: null,
    leadTimelineVisibleOnCustomer360: null,
    failedNetwork: [],
    token: null,
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
          url: res.url(),
          status: res.status(),
          method: res.request().method(),
          body: String(body || '').slice(0, 600),
        });
      }
    } catch {
      /* ignore */
    }
  });

  const fail = async (relation, detail = '') => {
    await page.screenshot({
      path: testInfo.outputPath(`fail-${String(relation).replace(/\s+/g, '-').slice(0, 80)}.png`),
      fullPage: true,
    });
    throw new Error(
      `POOYESH JOURNEY 007 FAIL — ${relation}${detail ? `: ${detail}` : ''}`
      + `\nIDs: ${JSON.stringify({
        leadId: report.leadId, companyId: report.companyId, activityId: report.activityId, taskId: report.taskId,
      })}`
      + `\nFailed network: ${JSON.stringify(report.failedNetwork.slice(-6))}`,
    );
  };

  // ── 1. Login ──────────────────────────────────────────────────────────
  const session = await loginAsQaAdmin(page, {
    requiredPermissions: [
      'leads:write', 'leads:convert', 'leads:read',
      'companies:write', 'companies:read',
      'activities:write', 'activities:read',
      'tasks:write', 'tasks:read',
    ],
  });
  report.token = session.token;
  const { username, password } = requireE2eQaCredentials();
  const apiLogin = await loginApi(request, username, password);
  report.token = apiLogin.token;

  // ── 2. Create Lead in Ofogh ──────────────────────────────────────────
  await page.goto('/ofogh');
  await expect(page.getByRole('button', { name: 'ثبت سرنخ خام' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'ثبت سرنخ خام' }).click();

  const createDlg = page.getByRole('dialog', { name: 'ثبت سرنخ خام' });
  await expect(createDlg).toBeVisible();
  await createDlg.getByLabel(/نام شرکت یا مجموعه/).fill(leadName);
  await createDlg.getByLabel(/نام شخص/).fill(personName);
  await createDlg.getByLabel(/موبایل/).fill(mobile);
  await createDlg.getByLabel(/منبع جذب/).fill(leadSource);

  const leadPostPromise = page.waitForResponse(
    (res) => res.url().includes('/leads') && !res.url().includes('/convert') && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await createDlg.getByRole('button', { name: 'ذخیره سرنخ' }).click();
  const leadPost = await leadPostPromise;
  if (leadPost.status() < 200 || leadPost.status() >= 300) await fail('Lead create HTTP', `${leadPost.status()}`);
  const leadBody = await leadPost.json();
  report.leadId = leadBody?.lead?.id || leadBody?.id;
  if (!report.leadId) await fail('Lead create missing id', JSON.stringify(leadBody));

  // Create modal onSaved auto-opens the lead detail modal.
  const detail = page.getByRole('dialog', { name: new RegExp(`سرنخ ${leadName}`) });
  await expect(detail).toBeVisible({ timeout: 15_000 });

  // ── 3. Create canonical Activity on the Raw Lead subject ────────────────
  await detail.locator('.ofoq-modal__note-input').fill(activityText);

  const activityPostPromise = page.waitForResponse(
    (res) => res.url().includes('/activities') && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await detail.getByRole('button', { name: 'ثبت پویش' }).click();
  const activityPost = await activityPostPromise;
  if (activityPost.status() < 200 || activityPost.status() >= 300) {
    await fail('Lead Activity create HTTP', `${activityPost.status()}`);
  }
  const activityBody = await activityPost.json();
  const activity = activityBody?.activity || activityBody;
  report.activityId = activity?.id;
  if (!report.activityId) await fail('Lead Activity create missing id', JSON.stringify(activityBody));
  if (String(activity.subjectType) !== 'RAW_LEAD' || String(activity.subjectId) !== String(report.leadId)) {
    await fail('Lead Activity subject mismatch', `${activity.subjectType}/${activity.subjectId}`);
  }

  await expect(detail.getByText('فعالیت‌ها')).toBeVisible();
  await expect(detail.getByText(activityText).first()).toBeVisible({ timeout: 20_000 });

  // ── 4. Create canonical Task on the Raw Lead subject (via API — no ─────
  //      Raw-Lead Task creation UI exists yet; see TASK_UI_RAW_LEAD_GAP).
  const taskCreate = await createTaskApi(request, report.token, {
    subjectType: 'RAW_LEAD',
    subjectId: report.leadId,
    title: taskTitle,
  });
  if (taskCreate.status < 200 || taskCreate.status >= 300) {
    await fail('Lead Task create HTTP', `${taskCreate.status} ${JSON.stringify(taskCreate.json)}`);
  }
  report.taskId = taskCreate.json?.task?.id;
  if (!report.taskId) await fail('Lead Task create missing id', JSON.stringify(taskCreate.json));

  // ── 5. Convert Lead → Customer (canonical flow) ─────────────────────────
  // Probe create_new first (Linka), fall back to link_existing against a
  // seeded canonical company — same designed backend path as Journey 002.
  {
    const probe = await request.fetch(
      `http://localhost:3100/api/v1/leads/${report.leadId}/convert`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${report.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        data: { nationalId },
        failOnStatusCode: false,
      },
    );
    const probeJson = await probe.json().catch(() => ({}));
    if (probe.ok() && probeJson.companyId) {
      report.companyId = probeJson.companyId;
      report.conversionMode = probeJson.conversionMode || 'create_new';
    }
  }

  if (!report.companyId) {
    const seeded = await createCompanyApi(request, report.token, {
      name: leadName,
      entityType: 'CUSTOMER',
      nationalId,
      activityDomain: 'بازرگانی آهن و فولاد',
      payload: { personType: 'legal', companyName: leadName, recordType: 'CUSTOMER' },
    });
    if (seeded.status < 200 || seeded.status >= 300) {
      await fail('Seed canonical Kanoon company for link_existing', `${seeded.status}`);
    }
    report.companyId = seeded.json?.company?.id;
    if (!report.companyId) await fail('Seed company missing id', JSON.stringify(seeded.json));

    await page.goto('/ofogh');
    const openDlg = page.getByRole('dialog').first();
    if (await openDlg.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape').catch(() => {});
    }
    const card = page.locator('.ofoq-lead-card--raw', { hasText: leadName });
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.click();
    const reopenedDetail = page.getByRole('dialog', { name: new RegExp(`سرنخ ${leadName}`) });
    await expect(reopenedDetail).toBeVisible({ timeout: 15_000 });
    await reopenedDetail.getByRole('button', { name: 'تبدیل به مخاطب' }).click();

    const convDlg = page.getByRole('dialog', { name: 'تبدیل به مخاطب' });
    await expect(convDlg).toBeVisible();
    await convDlg.getByLabel(/شناسه ملی/).fill(nationalId);

    const convertPromise = page.waitForResponse(
      (res) => res.url().includes(`/leads/${report.leadId}/convert`) && res.request().method() === 'POST',
      { timeout: 45_000 },
    );
    await convDlg.getByRole('button', { name: 'تایید تبدیل' }).click();
    const convertRes = await convertPromise;
    if (convertRes.status() < 200 || convertRes.status() >= 300) {
      await fail('Lead convert HTTP', `${convertRes.status()}`);
    }
    const convertBody = await convertRes.json();
    report.conversionMode = convertBody.conversionMode;
    report.companyId = convertBody.companyId || convertBody.company?.id || report.companyId;
  }

  // ── 6. Post-conversion lead state ───────────────────────────────────────
  const leadAfter = await getLead(request, report.token, report.leadId);
  const leadC = leadAfter.json?.lead;
  if (!leadC) await fail('Lead not retrievable after convert');
  if (String(leadC.status).toUpperCase() !== 'CONVERTED') {
    await fail('Lead status not CONVERTED', String(leadC.status));
  }
  if (String(leadC.convertedCompanyId) !== String(report.companyId)) {
    await fail(
      'Lead→Company reference mismatch after convert',
      `convertedCompanyId=${leadC.convertedCompanyId} vs companyId=${report.companyId}`,
    );
  }

  // ── 7. Lineage — Activity/Task not deleted, not duplicated ─────────────
  const activitiesGet = await getActivitiesForSubject(request, report.token, 'RAW_LEAD', report.leadId);
  expect(activitiesGet.status, 'GET Lead Activities').toBeGreaterThanOrEqual(200);
  expect(activitiesGet.status, 'GET Lead Activities').toBeLessThan(300);
  const matchedActivities = (activitiesGet.json?.items || []).filter((a) => a.description === activityText);
  if (matchedActivities.length !== 1) {
    await fail(
      'Lead Activity lineage broken (deleted or duplicated after conversion)',
      `count=${matchedActivities.length}`,
    );
  }
  expect(String(matchedActivities[0].id)).toBe(String(report.activityId));
  expect(String(matchedActivities[0].subjectId)).toBe(String(report.leadId));

  const tasksGet = await getTasksForSubject(request, report.token, 'RAW_LEAD', report.leadId);
  expect(tasksGet.status, 'GET Lead Tasks').toBeGreaterThanOrEqual(200);
  expect(tasksGet.status, 'GET Lead Tasks').toBeLessThan(300);
  const matchedTasks = (tasksGet.json?.items || []).filter((t) => t.title === taskTitle);
  if (matchedTasks.length !== 1) {
    await fail('Lead Task lineage broken (deleted or duplicated after conversion)', `count=${matchedTasks.length}`);
  }
  expect(String(matchedTasks[0].id)).toBe(String(report.taskId));

  // ── 8. Customer 360 discoverability (informational — LEAD_ACTIVITY_LINEAGE_GAP) ─
  await page.goto(`/kanoon/contact/${report.companyId}?tab=interactions`);
  await expect(page.getByText('پویش — تعاملات')).toBeVisible({ timeout: 30_000 });
  report.leadActivityVisibleOnCustomer360 = await page.getByText(activityText).first().isVisible().catch(() => false);

  await page.goto(`/kanoon/contact/${report.companyId}?tab=timeline`);
  await expect(page.getByText('تایم‌لاین وقایع')).toBeVisible({ timeout: 30_000 });
  report.leadTimelineVisibleOnCustomer360 = await page.getByText(activityText).first().isVisible().catch(() => false);

  // ── 9. Hard refresh — no duplicates introduced ──────────────────────────
  await page.reload({ waitUntil: 'networkidle' });
  const activitiesAfterRefresh = await getActivitiesForSubject(request, report.token, 'RAW_LEAD', report.leadId);
  const matchedAfterRefresh = (activitiesAfterRefresh.json?.items || []).filter((a) => a.description === activityText);
  if (matchedAfterRefresh.length !== 1) {
    await fail('Lead Activity duplicated after hard refresh', `count=${matchedAfterRefresh.length}`);
  }
  const tasksAfterRefresh = await getTasksForSubject(request, report.token, 'RAW_LEAD', report.leadId);
  const matchedTasksAfterRefresh = (tasksAfterRefresh.json?.items || []).filter((t) => t.title === taskTitle);
  if (matchedTasksAfterRefresh.length !== 1) {
    await fail('Lead Task duplicated after hard refresh', `count=${matchedTasksAfterRefresh.length}`);
  }

  // ── 10. Cleanup (soft archive) ──────────────────────────────────────────
  const cleanup = [];
  for (const [kind, id] of [
    ['task', report.taskId],
    ['activity', report.activityId],
    ['lead', report.leadId],
    ['company', report.companyId],
  ]) {
    if (!id) continue;
    const result = await archiveEntity(request, report.token, kind, id);
    cleanup.push({ kind, id, status: result.status });
  }

  console.log('[e2e-pooy-007] cleanup', JSON.stringify(cleanup));
  console.log('[e2e-pooy-007] PASS report', JSON.stringify({
    leadId: report.leadId,
    companyId: report.companyId,
    activityId: report.activityId,
    taskId: report.taskId,
    conversionMode: report.conversionMode,
    leadActivityVisibleOnCustomer360: report.leadActivityVisibleOnCustomer360,
    leadTimelineVisibleOnCustomer360: report.leadTimelineVisibleOnCustomer360,
  }));
});
