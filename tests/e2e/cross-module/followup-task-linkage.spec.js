import { test, expect } from '@playwright/test';
import { loginAsQaAdmin } from '../helpers/auth.js';
import {
  archiveEntity,
  createCompanyApi,
  getActivitiesForSubject,
  getTasksForSubject,
  loginApi,
  updateActivityApi,
} from '../helpers/api.js';
import { requireE2eQaCredentials, loadRepoEnv } from '../helpers/loadEnv.js';

loadRepoEnv();

/**
 * POOYESH JOURNEY 009 — Follow-up → canonical Task linkage (Gap 2)
 * Recording an Activity with a future follow-up date atomically creates a
 * linked canonical Pooyesh Task (source_activity_id). Idempotent: re-saving
 * the same follow-up must not create a duplicate Task.
 * Real FE + BE + Postgres. VITE_USE_MOCK_API=false. No mocks.
 */

test.describe.configure({ mode: 'serial' });

test('POOYESH JOURNEY 009: Activity follow-up creates/links exactly one canonical Task', async ({ page, request }, testInfo) => {
  test.setTimeout(240_000);

  const stamp = Date.now();
  const companyName = `E2E-FUP-${stamp}`;
  const nationalId = `9${String(stamp).slice(-10)}`;
  const activityText = `E2E-FUP-ACTIVITY-${stamp}`;
  const expectedTaskTitle = `پیگیری: ${activityText}`;

  /** @type {any} */
  const ids = { failedNetwork: [] };

  page.on('response', async (res) => {
    try {
      if (res.status() >= 400 && res.url().includes('/api/')) {
        let body = null;
        try { body = await res.text(); } catch { body = null; }
        ids.failedNetwork.push({ url: res.url(), status: res.status(), method: res.request().method(), body: String(body || '').slice(0, 600) });
      }
    } catch { /* ignore */ }
  });

  const fail = async (relation, detail = '') => {
    await page.screenshot({ path: testInfo.outputPath(`fail-${relation.replace(/\s+/g, '-').slice(0, 80)}.png`), fullPage: true });
    throw new Error(
      `POOYESH JOURNEY 009 FAIL — ${relation}${detail ? `: ${detail}` : ''}`
      + `\nIDs: ${JSON.stringify(ids)}`
      + `\nFailed network: ${JSON.stringify(ids.failedNetwork.slice(-6))}`,
    );
  };

  // ── 1. Login ─────────────────────────────────────────────────────────
  await loginAsQaAdmin(page, {
    requiredPermissions: ['activities:write', 'activities:read', 'tasks:read', 'companies:write'],
  });
  const { username, password } = requireE2eQaCredentials();
  const apiLogin = await loginApi(request, username, password);
  ids.token = apiLogin.token;

  // ── 2. Create canonical Customer ────────────────────────────────────────
  const mobile = `09${String(stamp).slice(-8).padStart(8, '0')}`;
  const co = await createCompanyApi(request, ids.token, {
    name: companyName,
    entityType: 'CUSTOMER',
    nationalId,
    activityDomain: 'بازرگانی آهن و فولاد',
    // Natural person IS the contact — no relatedPersons required for the
    // completeness gate, so an Activity can be created immediately.
    payload: { personType: 'natural', personName: companyName, mobile, recordType: 'CUSTOMER' },
  });
  if (co.status < 200 || co.status >= 300) await fail('Company create HTTP', `${co.status}`);
  ids.companyId = co.json?.company?.id;
  if (!ids.companyId) await fail('Company create missing id', JSON.stringify(co.json));

  // ── 3. Record an Activity with a future follow-up date via the real UI ──
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=interactions`);
  await expect(page.getByText('پویش — تعاملات')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /ثبت فعالیت جدید/ }).click();
  await page.locator('.kprofile-magic__textarea').fill(activityText);

  await page.locator('.kprofile-magic__date .jalali-date-picker__trigger').click();
  const todayCell = page.locator('.jalali-date-picker__day.is-today');
  await expect(todayCell).toBeVisible({ timeout: 10_000 });
  const tomorrowCell = todayCell.locator('xpath=following-sibling::button[1]');
  await tomorrowCell.click();

  const activityPostPromise = page.waitForResponse(
    (res) => res.url().includes('/activities') && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'ثبت فعالیت' }).click();
  const activityPost = await activityPostPromise;
  if (activityPost.status() < 200 || activityPost.status() >= 300) {
    await fail('Activity create HTTP', `${activityPost.status()}`);
  }
  const activity = (await activityPost.json())?.activity;
  ids.activityId = activity?.id;
  if (!ids.activityId) await fail('Activity create missing id', JSON.stringify(activity));
  if (!activity?.dueAt) await fail('Activity missing dueAt (follow-up not persisted)');

  // ── 4. Activity exists via API ──────────────────────────────────────────
  const activitiesGet = await getActivitiesForSubject(request, ids.token, 'COMPANY', ids.companyId);
  expect(activitiesGet.status).toBeGreaterThanOrEqual(200);
  const matchedActivities = (activitiesGet.json?.items || []).filter((a) => a.id === ids.activityId);
  if (matchedActivities.length !== 1) await fail('Activity not retrievable via API', `count=${matchedActivities.length}`);

  // ── 5/6/7. Exactly ONE canonical Task, same subject, linkage queryable ──
  const tasksGet1 = await getTasksForSubject(request, ids.token, 'COMPANY', ids.companyId);
  expect(tasksGet1.status).toBeGreaterThanOrEqual(200);
  const linkedTasks1 = (tasksGet1.json?.items || []).filter((t) => String(t.sourceActivityId) === String(ids.activityId));
  if (linkedTasks1.length !== 1) await fail('Expected exactly ONE linked Task after Activity create', `count=${linkedTasks1.length}`);
  ids.taskId = linkedTasks1[0].id;
  if (String(linkedTasks1[0].subjectType) !== 'COMPANY' || String(linkedTasks1[0].subjectId) !== String(ids.companyId)) {
    await fail('Linked Task subject mismatch', JSON.stringify(linkedTasks1[0]));
  }
  if (linkedTasks1[0].title !== expectedTaskTitle) {
    await fail('Linked Task title mismatch', `${linkedTasks1[0].title} !== ${expectedTaskTitle}`);
  }

  // ── 8. Task appears in Pooyesh Task board UI ────────────────────────────
  await expect(page.getByTestId('pooyesh-task-item').filter({ hasText: expectedTaskTitle })).toBeVisible({ timeout: 20_000 });

  // ── 9. Task appears in Calendar ──────────────────────────────────────────
  await page.goto('/pooyesh');
  await expect(page.getByText(expectedTaskTitle).first()).toBeVisible({ timeout: 30_000 });

  // ── 10. Customer 360 timeline shows it ───────────────────────────────────
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=timeline`);
  await expect(page.getByText('تایم‌لاین وقایع')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(expectedTaskTitle).first()).toBeVisible({ timeout: 20_000 });

  // ── 11. Hard refresh — persistence, still exactly one Task ──────────────
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByText(expectedTaskTitle).first()).toBeVisible({ timeout: 20_000 });
  const tasksAfterRefresh = await getTasksForSubject(request, ids.token, 'COMPANY', ids.companyId);
  const linkedAfterRefresh = (tasksAfterRefresh.json?.items || []).filter((t) => String(t.sourceActivityId) === String(ids.activityId));
  if (linkedAfterRefresh.length !== 1) await fail('Task duplicated/lost after hard refresh', `count=${linkedAfterRefresh.length}`);

  // ── 12. Retry the idempotent follow-up path — NO duplicate Task ─────────
  // Re-trigger the same activityService.updateActivity → syncFollowUpTask
  // path with the SAME dueAt (simulates retry/reload of the same save).
  const retryUpdate = await updateActivityApi(request, ids.token, ids.activityId, { dueAt: activity.dueAt });
  if (retryUpdate.status < 200 || retryUpdate.status >= 300) {
    await fail('Activity follow-up retry update HTTP', `${retryUpdate.status} ${JSON.stringify(retryUpdate.json)}`);
  }
  const tasksAfterRetry = await getTasksForSubject(request, ids.token, 'COMPANY', ids.companyId);
  const linkedAfterRetry = (tasksAfterRetry.json?.items || []).filter((t) => String(t.sourceActivityId) === String(ids.activityId));
  if (linkedAfterRetry.length !== 1) await fail('Duplicate Task created on idempotent retry', `count=${linkedAfterRetry.length}`);
  if (String(linkedAfterRetry[0].id) !== String(ids.taskId)) {
    await fail('Retry created a DIFFERENT Task instead of updating the linked one', JSON.stringify(linkedAfterRetry[0]));
  }

  // ── 13. Cleanup ──────────────────────────────────────────────────────────
  const cleanup = [];
  for (const [kind, id] of [['task', ids.taskId], ['activity', ids.activityId], ['company', ids.companyId]]) {
    if (!id) continue;
    const result = await archiveEntity(request, ids.token, kind, id);
    cleanup.push({ kind, id, status: result.status });
  }
  console.log('[e2e-followup-009] cleanup', JSON.stringify(cleanup));
  console.log('[e2e-followup-009] PASS report', JSON.stringify({ companyId: ids.companyId, activityId: ids.activityId, taskId: ids.taskId }));
});
