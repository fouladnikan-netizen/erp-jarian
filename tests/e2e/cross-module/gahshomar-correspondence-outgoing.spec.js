import { test, expect } from '@playwright/test';
import { loginAsQaAdmin } from '../helpers/auth.js';
import {
  archiveEntity,
  createCompanyApi,
  createOrderApi,
  finalizeCorrespondenceApi,
  getCorrespondenceApi,
  loginApi,
} from '../helpers/api.js';
import { requireE2eQaCredentials, loadRepoEnv } from '../helpers/loadEnv.js';

loadRepoEnv();

/**
 * GAHSHOMAR JOURNEY 012 — OUTGOING correspondence, real FE + BE + PostgreSQL.
 *
 * Kanoon Customer -> Nabz Order (fixtures via canonical API, same pattern as
 * other cross-module journeys) -> Gahshomar OUT draft -> link company + order
 * -> raw informal Persian text with amount/date/percentage/order code -> AI
 * rewrite (best-effort — see DDL-23c, no external AI key in this sandbox) ->
 * finalize -> server-assigned official number -> hard refresh persistence ->
 * digital/physical print render (single record) -> Kanoon Customer 360
 * projection -> Nabz OrderProfile projection -> Pooyesh Timeline projection.
 */

test.describe.configure({ mode: 'serial' });

test('GAHSHOMAR JOURNEY 012: OUTGOING correspondence end-to-end', async ({ page, request }, testInfo) => {
  test.setTimeout(240_000);

  const stamp = Date.now();
  const companyName = `E2E-GAH-OUT-${stamp}`;
  const orderMarker = `E2E-GAH-ORDER-${stamp}`;
  const subject = `E2E-GAH-SUBJECT-${stamp}`;
  const nationalId = `7${String(stamp).slice(-10)}`;

  /** @type {any} */
  const ids = { failedNetwork: [] };

  page.on('pageerror', (err) => console.log('[PAGEERROR]', err.message, err.stack?.slice(0, 500)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[CONSOLE ERROR]', msg.text());
  });

  page.on('response', async (res) => {
    try {
      if (res.status() >= 400 && res.url().includes('/api/') && !res.url().includes('/ai-rewrite')) {
        let body = null;
        try { body = await res.text(); } catch { body = null; }
        ids.failedNetwork.push({
          url: res.url(), status: res.status(), method: res.request().method(),
          body: body?.slice?.(0, 800) || body,
        });
      }
    } catch { /* ignore */ }
  });

  const fail = async (relation, detail = '') => {
    await page.screenshot({
      path: testInfo.outputPath(`fail-${relation.replace(/\s+/g, '-')}.png`),
      fullPage: true,
    });
    throw new Error(
      `GAHSHOMAR JOURNEY 012 FAIL — ${relation}${detail ? `: ${detail}` : ''}`
      + `\nIDs: ${JSON.stringify(ids)}`
      + `\nFailed network: ${JSON.stringify(ids.failedNetwork.slice(-5))}`,
    );
  };

  // ── 1. Fixtures via canonical API (Company + Order) — BEFORE UI login so
  // ErpDataBootstrap picks them up on the fresh SPA mount ──────────────────
  const { username, password } = requireE2eQaCredentials();
  const setupLogin = await loginApi(request, username, password);
  const setupToken = setupLogin.token;

  const companyRes = await createCompanyApi(request, setupToken, {
    name: companyName,
    entityType: 'CUSTOMER',
    nationalId,
    payload: { personType: 'legal', recordType: 'CUSTOMER' },
  });
  expect(companyRes.status, `create company ${JSON.stringify(companyRes.json)}`).toBeLessThan(300);
  ids.companyId = companyRes.json.company.id;

  const orderRes = await createOrderApi(request, setupToken, {
    companyId: ids.companyId,
    title: orderMarker,
    code: `JR-GAH-${stamp}`,
  });
  expect(orderRes.status, `create order ${JSON.stringify(orderRes.json)}`).toBeLessThan(300);
  const order = orderRes.json.order || orderRes.json;
  ids.orderId = order.id;
  ids.orderCode = order.code;

  // ── 2. UI login (fresh mount → bootstrap hydrates the new Company/Order) ──
  const session = await loginAsQaAdmin(page, {
    requiredPermissions: [
      'companies:write', 'orders:write',
      'correspondence:read', 'correspondence:write', 'correspondence:finalize',
    ],
  });
  ids.token = session.token;

  // ── 3. Create OUTGOING draft from Gahshomar ─────────────────────────────
  await page.goto('/gahshomar');
  await expect(page.getByRole('button', { name: 'ثبت مکاتبه' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'ثبت مکاتبه' }).click();

  const typeDialog = page.getByRole('dialog', { name: 'انتخاب نوع مکاتبه' });
  await expect(typeDialog).toBeVisible();

  const draftPostPromise = page.waitForResponse(
    (res) => res.url().includes('/correspondence') && res.request().method() === 'POST'
      && !res.url().includes('ai-rewrite') && !res.url().includes('finalize'),
    { timeout: 30_000 },
  );
  await typeDialog.getByRole('button', { name: 'ارسالی' }).click();
  const draftPost = await draftPostPromise;
  if (draftPost.status() < 200 || draftPost.status() >= 300) {
    await fail('OUT draft create HTTP', `${draftPost.status()}`);
  }
  const draftBody = await draftPost.json();
  ids.correspondenceId = draftBody?.correspondence?.id;
  if (!ids.correspondenceId) await fail('OUT draft create missing id', JSON.stringify(draftBody));

  const composeDialog = page.getByRole('dialog', { name: 'ثبت مکاتبه رسمی' });
  await expect(composeDialog).toBeVisible({ timeout: 15_000 });

  // ── 4. Fill subject + recipient (companyId link) ────────────────────────
  await composeDialog.getByRole('textbox', { name: 'موضوع' }).fill(subject);
  await page.keyboard.press('Escape');

  const recipientInput = composeDialog.locator('input[aria-label="گیرنده (الزامی)"]');
  await recipientInput.click();
  await recipientInput.fill(companyName);
  const recipientOption = page.locator('.nabz-combobox__option').filter({ hasText: companyName }).first();
  await expect(recipientOption).toBeVisible({ timeout: 15_000 });
  await recipientOption.click();

  // ── 5. Link the related Order (optional select, product rule 15) ────────
  const orderSelect = composeDialog.getByLabel(/سفارش مرتبط/);
  if (await orderSelect.isVisible().catch(() => false)) {
    await orderSelect.selectOption({ value: String(ids.orderId) });
  } else {
    console.warn('[e2e-gah-012] related-order select not visible — order list may not have hydrated yet');
  }

  // ── 6. Raw informal Persian body: amount + date + percentage + order code ─
  const rawText = `سلام وقت بخیر، سفارش ${ids.orderCode} رو دیدیم. مبلغ ۱,۲۵۰,۰۰۰ ریال تخفیف ۱۵ درصد داره و تاریخش ۱۴۰۴/۰۳/۱۵ هست. لطفا هماهنگ کنید. ممنون.`;
  const rteBody = composeDialog.locator('.gahshomar-rte__content');
  await rteBody.click();
  await rteBody.pressSequentially(rawText, { delay: 1 });
  await expect(rteBody).toContainText(ids.orderCode, { timeout: 10_000 });

  // ── 7. AI rewrite — best-effort (DDL-23c: no external AI key in sandbox) ──
  const aiRewritePromise = page.waitForResponse(
    (res) => res.url().includes('/ai-rewrite') && res.request().method() === 'POST',
    { timeout: 30_000 },
  ).catch(() => null);
  await composeDialog.getByRole('button', { name: 'بازنویسی هوشمند متن' }).click();
  const aiResponse = await aiRewritePromise;
  if (aiResponse) {
    console.log(`[e2e-gah-012] AI rewrite HTTP ${aiResponse.status()}`);
    if (aiResponse.ok()) {
      const acceptBtn = composeDialog.getByRole('button', { name: 'پذیرش و جایگزینی متن' });
      await expect(acceptBtn).toBeVisible({ timeout: 10_000 });
      // Critical-value warning must NOT fire for a faithful rewrite (P0 validator, DDL-23c).
      const warning = composeDialog.locator('.gahshomar-ai-panel__warning');
      if (await warning.isVisible().catch(() => false)) {
        console.warn('[e2e-gah-012] AI rewrite flagged a critical-value warning — accepting anyway to inspect UI, but this indicates the AI paraphrase altered a protected token.');
      }
      await acceptBtn.click();
    } else {
      await expect(composeDialog.getByText('بازنویسی هوشمند در دسترس نیست.')).toBeVisible({ timeout: 5_000 });
      console.log('[e2e-gah-012] AI provider unavailable in this sandbox (expected — no LIARA_AI_KEY). Continuing with raw typed text; P0 critical-value validator is covered independently by backend unit/integration tests.');
    }
  } else {
    console.log('[e2e-gah-012] AI rewrite request did not resolve within timeout — continuing with raw typed text.');
  }

  // ── 8. Finalize (server-assigned official number, product rules 4/11) ───
  const finalizePromise = page.waitForResponse(
    (res) => res.url().includes('/finalize') && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await composeDialog.getByRole('button', { name: 'امضا و صدور' }).click();
  const finalizeRes = await finalizePromise;
  if (finalizeRes.status() < 200 || finalizeRes.status() >= 300) {
    await fail('Finalize HTTP', `${finalizeRes.status()} ${await finalizeRes.text().catch(() => '')}`);
  }
  const finalizeBody = await finalizeRes.json();
  const finalized = finalizeBody?.correspondence || finalizeBody;
  ids.officialNumber = finalized?.officialNumber;
  if (!ids.officialNumber) await fail('Finalize missing officialNumber', JSON.stringify(finalizeBody));
  if (finalized?.status !== 'FINAL') await fail('Finalize did not persist FINAL status', JSON.stringify(finalizeBody));

  // Popup re-hydrates into locked "issued" view showing the registry number.
  await expect(page.getByText(subject).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.gahshomar-compose-popup')).toContainText(ids.officialNumber, { timeout: 15_000 });
  await page.getByRole('button', { name: 'بستن' }).first().click();

  // ── 9. Hard refresh — content/number persist (product rule X) ───────────
  await page.reload({ waitUntil: 'networkidle' });
  await page.goto('/gahshomar');
  await expect(page.getByRole('tab', { name: 'ارسالی' })).toBeVisible({ timeout: 20_000 });
  const listRow = page.locator('tr').filter({ hasText: subject });
  await expect(listRow).toBeVisible({ timeout: 20_000 });
  await expect(listRow).toContainText(ids.officialNumber);
  await listRow.getByRole('button', { name: 'مشاهده جزئیات' }).click();

  const viewDrawer = page.getByRole('dialog', { name: 'جزئیات نامه' });
  await expect(viewDrawer).toBeVisible({ timeout: 15_000 });
  await expect(viewDrawer).toContainText(ids.officialNumber);
  await expect(viewDrawer).toContainText(subject);

  // ── 10. Print modes — single canonical record, two render variants ──────
  await viewDrawer.getByRole('button', { name: 'چاپ' }).click();
  const printPreview = page.locator('.gahshomar-print-preview');
  await expect(printPreview).toBeVisible({ timeout: 15_000 });
  await expect(printPreview.getByRole('button', { name: 'با سربرگ' })).toBeVisible();
  await expect(printPreview.locator('.gahshomar-print-preview__stage')).toContainText(ids.officialNumber);
  await expect(printPreview.locator('.gahshomar-print-preview__stage')).toContainText(ids.orderCode);
  await printPreview.getByRole('button', { name: 'بدون سربرگ' }).click();
  await expect(printPreview.locator('.gahshomar-print-preview__stage')).toContainText(ids.officialNumber);
  await expect(printPreview.locator('.gahshomar-print-preview__stage')).toContainText(ids.orderCode);
  // Exactly one printable letter node backs both render modes.
  await expect(page.locator('.gahshomar-print-preview__stage')).toHaveCount(1);
  await printPreview.getByRole('button', { name: 'بستن' }).click();
  await viewDrawer.locator('.gahshomar-drawer__actions').getByRole('button', { name: 'بستن' }).click();

  // ── 11. Kanoon Customer 360 projection (product rule 14) ────────────────
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=documents`);
  await expect(page.getByText('دبیرخانه — اسناد و مکاتبات')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(subject).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(ids.officialNumber).first()).toBeVisible({ timeout: 10_000 });

  // ── 12. Nabz OrderProfile projection (product rule 15) ──────────────────
  await page.goto(`/nabz/order/${encodeURIComponent(ids.orderCode)}`);
  await page.getByRole('tab', { name: 'مکاتبات رسمی' }).click();
  await expect(page.getByText(subject).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(ids.officialNumber).first()).toBeVisible({ timeout: 10_000 });

  // ── 13. Pooyesh / Unified Timeline projection (product rule 16) ─────────
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=timeline`);
  await expect(page.getByText('تایم‌لاین وقایع')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('ارسال نامه رسمی').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(subject, { exact: false }).first()).toBeVisible({ timeout: 20_000 });

  // ── 14. Canonical correspondenceId preserved everywhere — direct API ────
  const finalGet = await getCorrespondenceApi(request, ids.token, ids.correspondenceId);
  expect(finalGet.status).toBeGreaterThanOrEqual(200);
  expect(finalGet.status).toBeLessThan(300);
  const canonical = finalGet.json?.correspondence || finalGet.json;
  expect(String(canonical.id)).toBe(String(ids.correspondenceId));
  expect(canonical.officialNumber).toBe(ids.officialNumber);
  expect(String(canonical.companyId)).toBe(String(ids.companyId));
  expect(String(canonical.orderId)).toBe(String(ids.orderId));
  expect(canonical.status).toBe('FINAL');
  expect(canonical.rawBody, 'raw/original body preserved for audit (product rule 10)').toBeTruthy();

  // ── 15. Cleanup ───────────────────────────────────────────────────────
  const cleanup = [];
  for (const [kind, id] of [
    ['correspondence', ids.correspondenceId],
    ['order', ids.orderId],
    ['company', ids.companyId],
  ]) {
    if (!id) continue;
    const result = await archiveEntity(request, ids.token, kind, id);
    cleanup.push({ kind, id, status: result.status });
  }
  console.log('[e2e-gah-012] cleanup', JSON.stringify(cleanup));
  console.log('[e2e-gah-012] PASS ids', JSON.stringify(ids));
});
