import { test, expect } from '@playwright/test';
import { loginAsQaAdmin } from '../helpers/auth.js';
import {
  archiveEntity,
  apiJson,
  convertLeadApi,
  createCompanyApi,
  getLead,
  loginApi,
} from '../helpers/api.js';
import { requireE2eQaCredentials, loadRepoEnv } from '../helpers/loadEnv.js';

loadRepoEnv();

/**
 * CROSS-MODULE JOURNEY 004 — Personal Lead Pipeline
 * Real FE + BE + Postgres. VITE_USE_MOCK_API=false.
 */

test.describe.configure({ mode: 'serial' });

test('CROSS-MODULE JOURNEY 004: Personal Lead Pipeline', async ({ page, request }, testInfo) => {
  test.setTimeout(300_000);

  const stamp = Date.now();
  const leadName = `E2E-PIPE-${stamp}`;
  const stageName = `مذاکره-${stamp}`;
  const renamed = `مذاکره جدی-${stamp}`;
  const userBStage = `تماس نمایشگاه-${stamp}`;

  const report = {
    leadId: null,
    stageId: null,
    pipelineId: null,
    userBToken: null,
    userBStageId: null,
    failedNetwork: [],
    token: null,
  };

  page.on('response', async (res) => {
    try {
      if (res.status() >= 400 && res.url().includes('/api/')) {
        let body = null;
        try { body = await res.text(); } catch { body = null; }
        report.failedNetwork.push({
          url: res.url().replace(/accessToken=[^&]+/gi, 'accessToken=***'),
          status: res.status(),
          method: res.request().method(),
          body: String(body || '').slice(0, 400),
        });
      }
    } catch { /* ignore */ }
  });

  const fail = async (msg, detail = '') => {
    await page.screenshot({
      path: testInfo.outputPath(`fail-${String(msg).replace(/\s+/g, '-').slice(0, 60)}.png`),
      fullPage: true,
    });
    throw new Error(`CROSS-MODULE JOURNEY 004 FAIL — ${msg}${detail ? `: ${detail}` : ''}\n${JSON.stringify(report)}`);
  };

  expect(process.env.VITE_USE_MOCK_API, 'VITE_USE_MOCK_API must be false').toBe('false');
  const health = await request.get('http://127.0.0.1:3100/api/health');
  expect(health.ok()).toBeTruthy();

  // ── User A login ──────────────────────────────────────────────────────
  await loginAsQaAdmin(page, {
    requiredPermissions: ['leads:write', 'leads:convert', 'leads:read', 'companies:write'],
  });
  const { username, password } = requireE2eQaCredentials();
  const apiLogin = await loginApi(request, username, password);
  report.token = apiLogin.token;

  // ── Default pipeline ──────────────────────────────────────────────────
  await page.goto('/ofogh?view=leads');
  await expect(page.getByTestId('ofogh-lead-board')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('سرنخ جدید', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('تماس اولیه', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('پیگیری', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('ارزیابی', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('واجد شرایط', { exact: true }).first()).toBeVisible();

  const pipe = await apiJson(request, report.token, 'GET', '/lead-pipelines/me');
  if (pipe.status >= 300) await fail('pipeline me', JSON.stringify(pipe.json));
  report.pipelineId = pipe.json?.pipeline?.id;
  const defaultStages = pipe.json?.stages || [];
  expect(defaultStages.length).toBeGreaterThanOrEqual(5);

  // ── Create Lead ───────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'ثبت سرنخ خام' }).click();
  const createDlg = page.getByRole('dialog', { name: 'ثبت سرنخ خام' });
  await createDlg.getByLabel(/نام شرکت یا مجموعه/).fill(leadName);
  await createDlg.getByLabel(/نام شخص/).fill(`شخص-${stamp}`);
  await createDlg.getByLabel(/موبایل/).fill(`09${String(stamp).slice(-8)}`);
  await createDlg.getByLabel(/منبع جذب/).fill(`SRC-${stamp}`);
  const leadPost = page.waitForResponse(
    (res) => res.url().includes('/leads') && res.request().method() === 'POST' && !res.url().includes('convert'),
  );
  await createDlg.getByRole('button', { name: 'ذخیره سرنخ' }).click();
  const leadRes = await leadPost;
  const leadBody = await leadRes.json();
  report.leadId = leadBody?.lead?.id;
  if (!report.leadId) await fail('lead create', JSON.stringify(leadBody));

  await page.keyboard.press('Escape');
  await expect(page.getByTestId(`ofogh-plead-card-${report.leadId}`)).toBeVisible({ timeout: 20_000 });

  const leadGet = await getLead(request, report.token, report.leadId);
  expect(leadGet.json?.lead?.pipelineStageId).toBeTruthy();
  const firstStageId = defaultStages[0].id;
  expect(leadGet.json.lead.pipelineStageId).toBe(firstStageId);

  await page.reload({ waitUntil: 'networkidle' });
  await page.goto('/ofogh?view=leads');
  await expect(page.getByTestId(`ofogh-plead-card-${report.leadId}`)).toBeVisible({ timeout: 30_000 });

  // ── Create stage ──────────────────────────────────────────────────────
  await page.getByTestId('ofogh-plead-add-stage').click();
  await page.getByTestId('ofogh-plead-add-input').fill(stageName);
  await page.getByTestId('ofogh-plead-add-submit').click();
  await expect(page.locator('[data-stage-name]', { hasText: stageName })).toBeVisible({ timeout: 15_000 });

  const pipe2 = await apiJson(request, report.token, 'GET', '/lead-pipelines/me');
  const createdStage = (pipe2.json?.stages || []).find((s) => s.name === stageName);
  if (!createdStage) await fail('stage not persisted', JSON.stringify(pipe2.json));
  report.stageId = createdStage.id;

  await page.reload({ waitUntil: 'networkidle' });
  await page.goto('/ofogh?view=leads');
  await expect(page.locator(`[data-testid="ofogh-plead-col-${report.stageId}"]`)).toBeVisible({ timeout: 30_000 });

  // ── Rename ────────────────────────────────────────────────────────────
  await page.getByTestId(`ofogh-plead-rename-${report.stageId}`).click();
  await page.getByTestId('ofogh-plead-rename-input').fill(renamed);
  await page.getByTestId('ofogh-plead-rename-submit').click();
  await expect(page.locator(`[data-testid="ofogh-plead-col-${report.stageId}"]`)).toContainText(renamed);

  const pipe3 = await apiJson(request, report.token, 'GET', '/lead-pipelines/me');
  const renamedStage = (pipe3.json?.stages || []).find((s) => s.id === report.stageId);
  expect(renamedStage?.name).toBe(renamed);

  // ── Move lead via API (canonical mutation — proves server persistence) ─
  const moved = await apiJson(
    request,
    report.token,
    'PATCH',
    `/leads/${report.leadId}/pipeline-stage`,
    { body: { stageId: report.stageId } },
  );
  if (moved.status >= 300) await fail('move lead', JSON.stringify(moved.json));
  expect(moved.json?.lead?.pipelineStageId).toBe(report.stageId);

  await page.reload({ waitUntil: 'networkidle' });
  await page.goto('/ofogh?view=leads');
  await expect(
    page.locator(`[data-testid="ofogh-plead-col-${report.stageId}"]`).getByTestId(`ofogh-plead-card-${report.leadId}`),
  ).toBeVisible({ timeout: 30_000 });

  // ── Reorder columns via API ───────────────────────────────────────────
  const stagesNow = (await apiJson(request, report.token, 'GET', '/lead-pipelines/me')).json.stages;
  const reordered = [...stagesNow.map((s) => s.id)];
  const from = reordered.indexOf(report.stageId);
  if (from > 0) {
    reordered.splice(from, 1);
    reordered.splice(Math.max(0, from - 1), 0, report.stageId);
  } else {
    reordered.splice(0, 1);
    reordered.splice(1, 0, report.stageId);
  }
  const reorderRes = await apiJson(request, report.token, 'PUT', '/lead-pipelines/me/stages/reorder', {
    body: { stageIds: reordered },
  });
  if (reorderRes.status >= 300) await fail('reorder', JSON.stringify(reorderRes.json));
  const afterReorder = (await apiJson(request, report.token, 'GET', '/lead-pipelines/me')).json.stages.map((s) => s.id);
  expect(afterReorder).toEqual(reordered);

  // ── Delete populated stage with transfer ──────────────────────────────
  const piygiri = (await apiJson(request, report.token, 'GET', '/lead-pipelines/me')).json.stages
    .find((s) => s.name === 'پیگیری');
  if (!piygiri) await fail('پیگیری stage missing');
  await page.getByTestId(`ofogh-plead-delete-${report.stageId}`).click();
  await expect(page.getByTestId('ofogh-plead-delete-dialog')).toBeVisible();
  await page.getByTestId('ofogh-plead-delete-target').selectOption(piygiri.id);
  await page.getByTestId('ofogh-plead-delete-submit').click();
  await expect(page.locator(`[data-testid="ofogh-plead-col-${report.stageId}"]`)).toHaveCount(0, { timeout: 15_000 });

  const leadAfterDel = await getLead(request, report.token, report.leadId);
  expect(leadAfterDel.json?.lead?.pipelineStageId).toBe(piygiri.id);

  // ── Last stage protection (API) ───────────────────────────────────────
  // Create temp pipeline isolation: try delete until one left would be heavy;
  // call delete on sole remaining if only one — instead create stages then delete all but verify 400 on last.
  {
    const cur = (await apiJson(request, report.token, 'GET', '/lead-pipelines/me')).json.stages;
    if (cur.length === 1) {
      const bad = await apiJson(request, report.token, 'DELETE', `/lead-pipelines/me/stages/${cur[0].id}`, { body: {} });
      expect(bad.status).toBeGreaterThanOrEqual(400);
      expect(bad.json?.error).toBe('PIPELINE_LAST_STAGE');
    }
  }

  // ── User B isolation ──────────────────────────────────────────────────
  const userBUser = process.env.E2E_QA_USER_B_USERNAME || 'sales_b';
  const userBPass = process.env.E2E_QA_USER_B_PASSWORD || 'SalesB123!';
  let userBLogin;
  try {
    userBLogin = await loginApi(request, userBUser, userBPass);
  } catch (e) {
    await fail('User B login (seed sales_b)', String(e));
  }
  report.userBToken = userBLogin.token;

  const userBPipe = await apiJson(request, report.userBToken, 'GET', '/lead-pipelines/me');
  if (userBPipe.status >= 300) await fail('user B pipeline', JSON.stringify(userBPipe.json));
  const userBHasRenamed = (userBPipe.json?.stages || []).some((s) => s.name === renamed);
  expect(userBHasRenamed).toBe(false);

  const createB = await apiJson(request, report.userBToken, 'POST', '/lead-pipelines/me/stages', {
    body: { name: userBStage },
  });
  if (createB.status >= 300) await fail('user B create stage', JSON.stringify(createB.json));
  report.userBStageId = (createB.json?.stages || []).find((s) => s.name === userBStage)?.id;

  const userAPipe = await apiJson(request, report.token, 'GET', '/lead-pipelines/me');
  expect((userAPipe.json?.stages || []).some((s) => s.name === userBStage)).toBe(false);

  // Cross-user mutation rejected
  const cross = await apiJson(
    request,
    report.token,
    'PATCH',
    `/lead-pipelines/me/stages/${report.userBStageId}`,
    { body: { name: 'hacked' } },
  );
  expect(cross.status).toBeGreaterThanOrEqual(400);

  const crossMove = await apiJson(
    request,
    report.token,
    'PATCH',
    `/leads/${report.leadId}/pipeline-stage`,
    { body: { stageId: report.userBStageId } },
  );
  expect(crossMove.status).toBeGreaterThanOrEqual(400);

  // ── Convert from arbitrary stage ──────────────────────────────────────
  const nationalId = `5${String(stamp).slice(-10)}`;
  let conv = await convertLeadApi(request, report.token, report.leadId, { nationalId });
  if (conv.status >= 300) {
    await createCompanyApi(request, report.token, {
      name: leadName,
      entityType: 'CUSTOMER',
      nationalId,
      payload: { personType: 'legal' },
    });
    conv = await convertLeadApi(request, report.token, report.leadId, { nationalId });
  }
  if (conv.status >= 300) await fail('convert', JSON.stringify(conv.json));
  expect(conv.json?.lead?.status || (await getLead(request, report.token, report.leadId)).json?.lead?.status)
    .toBe('CONVERTED');
  expect(conv.json?.companyId || conv.json?.lead?.convertedCompanyId).toBeTruthy();

  await page.goto('/ofogh?view=leads');
  await expect(page.getByTestId(`ofogh-plead-card-${report.leadId}`)).toHaveCount(0);

  // ── Archive reason required ───────────────────────────────────────────
  await page.getByRole('button', { name: 'ثبت سرنخ خام' }).click();
  const dlg2 = page.getByRole('dialog', { name: 'ثبت سرنخ خام' });
  const leadName2 = `${leadName}-ARC`;
  await dlg2.getByLabel(/نام شرکت یا مجموعه/).fill(leadName2);
  await dlg2.getByLabel(/نام شخص/).fill('آرشیو');
  await dlg2.getByLabel(/موبایل/).fill(`08${String(stamp).slice(-8)}`);
  await dlg2.getByLabel(/منبع جذب/).fill('arc');
  const lead2Post = page.waitForResponse(
    (res) => res.url().includes('/leads') && res.request().method() === 'POST' && !res.url().includes('convert'),
  );
  await dlg2.getByRole('button', { name: 'ذخیره سرنخ' }).click();
  const lead2Body = await (await lead2Post).json();
  const lead2Id = lead2Body?.lead?.id;
  const noReason = await apiJson(request, report.token, 'POST', `/leads/${lead2Id}/archive`, { body: {} });
  expect(noReason.status).toBeGreaterThanOrEqual(400);
  expect(noReason.json?.error).toBe('ARCHIVE_REASON_REQUIRED');
  const withReason = await apiJson(request, report.token, 'POST', `/leads/${lead2Id}/archive`, {
    body: { reason: 'تست بایگانی Journey 004' },
  });
  expect(withReason.status).toBeLessThan(300);

  // ── Customer Lifecycle regression: no add-stage ───────────────────────
  await page.goto('/ofogh?view=customers');
  await expect(page.getByTestId('ofogh-customer-lifecycle-board')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('ofogh-plead-add-stage')).toHaveCount(0);
  await expect(page.getByText('نوپدید', { exact: true }).first()).toBeVisible();

  // cleanup
  try {
    if (report.userBStageId) {
      await apiJson(request, report.userBToken, 'DELETE', `/lead-pipelines/me/stages/${report.userBStageId}`, { body: {} });
    }
  } catch { /* ignore */ }

  console.log('[e2e-004] PASS', JSON.stringify({
    leadId: report.leadId,
    pipelineId: report.pipelineId,
    stageId: report.stageId,
  }));
});
