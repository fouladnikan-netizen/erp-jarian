import { test, expect } from '@playwright/test';
import {
  archiveEntity,
  createActivityApi,
  createCompanyApi,
  createTaskApi,
  loginApi,
  updateActivityApi,
  updateTaskApi,
} from '../helpers/api.js';
import { loadRepoEnv, requireE2eQaCredentials } from '../helpers/loadEnv.js';

loadRepoEnv();

/**
 * POOYESH JOURNEY 011 — RBAC / Ownership scoping for Activity + Task (Gap 4)
 * Direct API proof (independent of any FE affordance) against the REAL
 * running backend: a `sales`-role actor who is neither creator nor assignee
 * of a Task/Activity is blocked (403 OWNERSHIP_FORBIDDEN); the owner/assignee
 * and `admin` (elevated) can mutate it.
 *
 * Fixture users (backend/src/db/seed.js, non-production only):
 *   sales_b / SalesB123! (role: sales) — owner/assignee
 *   sales_c / SalesC123! (role: sales) — unauthorized third party
 *   admin   / Admin123!  (role: admin) — elevated bypass
 */

test.describe.configure({ mode: 'serial' });

test('POOYESH JOURNEY 011: Cross-user Task/Activity mutation blocked; owner and admin allowed', async ({ request }) => {
  test.setTimeout(120_000);

  requireE2eQaCredentials(); // ensures .env is loaded / QA env is configured
  const adminLogin = await loginApi(request, 'admin', 'Admin123!');
  const ownerLogin = await loginApi(request, 'sales_b', 'SalesB123!');
  const strangerLogin = await loginApi(request, 'sales_c', 'SalesC123!');

  const adminToken = adminLogin.token;
  const ownerToken = ownerLogin.token;
  const strangerToken = strangerLogin.token;
  const ownerId = ownerLogin.user?.id;
  expect(ownerId, 'sales_b user id missing from login response').toBeTruthy();

  const stamp = Date.now();
  const co = await createCompanyApi(request, adminToken, {
    name: `E2E-RBAC-${stamp}`,
    entityType: 'CUSTOMER',
  });
  expect(co.status, JSON.stringify(co.json)).toBe(201);
  const companyId = co.json.company.id;

  const cleanup = [];

  // ── Task ownership scoping ────────────────────────────────────────────
  const taskCreate = await createTaskApi(request, ownerToken, {
    subjectType: 'COMPANY',
    subjectId: companyId,
    title: `E2E-RBAC-TASK-${stamp}`,
    assignedTo: ownerId,
  });
  expect(taskCreate.status, JSON.stringify(taskCreate.json)).toBe(201);
  const taskId = taskCreate.json.task.id;
  cleanup.push(['task', taskId]);

  const strangerUpdateTask = await updateTaskApi(request, strangerToken, taskId, { title: 'تلاش برای دستکاری' });
  expect(strangerUpdateTask.status, JSON.stringify(strangerUpdateTask.json)).toBe(403);
  expect(strangerUpdateTask.json.error).toBe('OWNERSHIP_FORBIDDEN');

  const strangerCompleteTask = await request.fetch(
    `${process.env.E2E_API_BASE_URL || 'http://localhost:3100/api/v1'}/tasks/${taskId}/complete`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${strangerToken}` }, failOnStatusCode: false },
  );
  expect(strangerCompleteTask.status(), 'stranger complete Task').toBe(403);

  const ownerUpdateTask = await updateTaskApi(request, ownerToken, taskId, { title: 'ویرایش توسط مالک' });
  expect(ownerUpdateTask.status, JSON.stringify(ownerUpdateTask.json)).toBe(200);
  expect(ownerUpdateTask.json.task.title).toBe('ویرایش توسط مالک');

  const adminTaskCreate = await createTaskApi(request, ownerToken, {
    subjectType: 'COMPANY',
    subjectId: companyId,
    title: `E2E-RBAC-TASK-ADMIN-${stamp}`,
    assignedTo: ownerId,
  });
  expect(adminTaskCreate.status).toBe(201);
  const adminTestTaskId = adminTaskCreate.json.task.id;
  cleanup.push(['task', adminTestTaskId]);
  const adminUpdateTask = await updateTaskApi(request, adminToken, adminTestTaskId, { title: 'ویرایش توسط مدیر' });
  expect(adminUpdateTask.status, 'admin (elevated) can mutate a Task it neither created nor is assigned to').toBe(200);

  // ── Activity ownership scoping ────────────────────────────────────────
  const activityCreate = await createActivityApi(request, ownerToken, {
    subjectType: 'COMPANY',
    subjectId: companyId,
    activityType: 'note',
    note: `E2E-RBAC-ACTIVITY-${stamp}`,
    assignedTo: ownerId,
  });
  expect(activityCreate.status, JSON.stringify(activityCreate.json)).toBe(201);
  const activityId = activityCreate.json.activity.id;
  cleanup.push(['activity', activityId]);

  const strangerUpdateActivity = await updateActivityApi(request, strangerToken, activityId, { description: 'تلاش برای دستکاری' });
  expect(strangerUpdateActivity.status, JSON.stringify(strangerUpdateActivity.json)).toBe(403);
  expect(strangerUpdateActivity.json.error).toBe('OWNERSHIP_FORBIDDEN');

  const strangerCompleteActivity = await request.fetch(
    `${process.env.E2E_API_BASE_URL || 'http://localhost:3100/api/v1'}/activities/${activityId}/complete`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${strangerToken}` }, failOnStatusCode: false },
  );
  expect(strangerCompleteActivity.status(), 'stranger complete Activity').toBe(403);

  const ownerUpdateActivity = await updateActivityApi(request, ownerToken, activityId, { description: 'ویرایش توسط مالک' });
  expect(ownerUpdateActivity.status, JSON.stringify(ownerUpdateActivity.json)).toBe(200);

  const ownerCompleteActivity = await request.fetch(
    `${process.env.E2E_API_BASE_URL || 'http://localhost:3100/api/v1'}/activities/${activityId}/complete`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${ownerToken}` }, failOnStatusCode: false },
  );
  expect(ownerCompleteActivity.status(), 'owner can complete own Activity').toBe(200);

  const adminActivityCreate = await createActivityApi(request, ownerToken, {
    subjectType: 'COMPANY',
    subjectId: companyId,
    activityType: 'note',
    note: `E2E-RBAC-ACTIVITY-ADMIN-${stamp}`,
    assignedTo: ownerId,
  });
  expect(adminActivityCreate.status).toBe(201);
  const adminTestActivityId = adminActivityCreate.json.activity.id;
  cleanup.push(['activity', adminTestActivityId]);
  const adminUpdateActivity = await updateActivityApi(request, adminToken, adminTestActivityId, { description: 'ویرایش توسط مدیر' });
  expect(adminUpdateActivity.status, 'admin (elevated) can mutate an Activity it neither created nor is assigned to').toBe(200);

  // ── Cleanup ────────────────────────────────────────────────────────────
  for (const [kind, id] of cleanup) {
    await archiveEntity(request, adminToken, kind, id);
  }
  await archiveEntity(request, adminToken, 'company', companyId);
});
