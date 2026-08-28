import { test, expect } from '@playwright/test';
import { loginAsQaAdmin } from '../helpers/auth.js';
import {
  archiveEntity,
  createCompanyApi,
  createCorrespondenceApi,
  finalizeCorrespondenceApi,
  getCorrespondenceApi,
  loginApi,
} from '../helpers/api.js';
import { requireE2eQaCredentials, loadRepoEnv } from '../helpers/loadEnv.js';

loadRepoEnv();

/**
 * GAHSHOMAR JOURNEY 013 — INCOMING correspondence, real FE + BE + PostgreSQL.
 *
 * 1) Backend-level negative proof: finalize an INCOMING draft with no
 *    attachment → 422 ATTACHMENT_REQUIRED (product rule 3/13, P0).
 * 2) Real UI flow: FE guard blocks submit without a file; attach the
 *    original document; submit → server-assigned official number → hard
 *    refresh persistence → attachment metadata → Kanoon Customer 360
 *    projection → Timeline event.
 */

test.describe.configure({ mode: 'serial' });

test('GAHSHOMAR JOURNEY 013: INCOMING correspondence end-to-end', async ({ page, request }, testInfo) => {
  test.setTimeout(240_000);

  const stamp = Date.now();
  const companyName = `E2E-GAH-IN-${stamp}`;
  const subject = `E2E-GAH-IN-SUBJECT-${stamp}`;
  const nationalId = `8${String(stamp).slice(-10)}`;
  const fileName = `letter-${stamp}.pdf`;

  /** @type {any} */
  const ids = { failedNetwork: [] };

  page.on('response', async (res) => {
    try {
      if (res.status() >= 400 && res.url().includes('/api/') && !res.url().includes('/finalize')) {
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
      `GAHSHOMAR JOURNEY 013 FAIL — ${relation}${detail ? `: ${detail}` : ''}`
      + `\nIDs: ${JSON.stringify(ids)}`
      + `\nFailed network: ${JSON.stringify(ids.failedNetwork.slice(-5))}`,
    );
  };

  // ── 1. Fixtures via canonical API — BEFORE UI login ──────────────────────
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

  // ── 2. Backend-level negative proof: ATTACHMENT_REQUIRED (product rule 3/13, P0) ─
  const negDraft = await createCorrespondenceApi(request, setupToken, {
    direction: 'INCOMING',
    subject: `${subject}-NEG`,
    companyId: ids.companyId,
  });
  expect(negDraft.status, `create INCOMING draft ${JSON.stringify(negDraft.json)}`).toBeLessThan(300);
  const negId = negDraft.json.correspondence.id;

  const negFinalize = await finalizeCorrespondenceApi(request, setupToken, negId, {
    finalBody: 'با سلام، قیمت ورق را اعلام فرمایید.',
  });
  expect(negFinalize.status, 'finalize without attachment must be rejected').toBe(422);
  expect(negFinalize.json?.error).toBe('ATTACHMENT_REQUIRED');
  await archiveEntity(request, setupToken, 'correspondence', negId);

  // ── 3. UI login (fresh mount → bootstrap hydrates the new Company) ───────
  const session = await loginAsQaAdmin(page, {
    requiredPermissions: [
      'companies:write',
      'correspondence:read', 'correspondence:write', 'correspondence:finalize',
    ],
  });
  ids.token = session.token;

  // ── 4. Create INCOMING draft from Gahshomar UI ───────────────────────────
  await page.goto('/gahshomar');
  await expect(page.getByRole('button', { name: 'ثبت مکاتبه' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'ثبت مکاتبه' }).click();

  const typeDialog = page.getByRole('dialog', { name: 'انتخاب نوع مکاتبه' });
  await expect(typeDialog).toBeVisible();

  const draftPostPromise = page.waitForResponse(
    (res) => res.url().includes('/correspondence') && res.request().method() === 'POST'
      && !res.url().includes('finalize'),
    { timeout: 30_000 },
  );
  await typeDialog.getByRole('button', { name: 'دریافتی' }).click();
  const draftPost = await draftPostPromise;
  if (draftPost.status() < 200 || draftPost.status() >= 300) {
    await fail('IN draft create HTTP', `${draftPost.status()}`);
  }
  const draftBody = await draftPost.json();
  ids.correspondenceId = draftBody?.correspondence?.id;
  if (!ids.correspondenceId) await fail('IN draft create missing id', JSON.stringify(draftBody));

  const composeDialog = page.getByRole('dialog', { name: 'ثبت نامه دریافتی' });
  await expect(composeDialog).toBeVisible({ timeout: 15_000 });

  // ── 5. Fill required incoming fields (sender/subject/date/signatory) ────
  await composeDialog.getByLabel('موضوع نامه').fill(subject);

  const senderInput = composeDialog.locator('input[aria-label="شرکت فرستنده نامه (الزامی)"]');
  await senderInput.click();
  await senderInput.fill(companyName);
  const senderOption = page.locator('.nabz-combobox__option').filter({ hasText: companyName }).first();
  await expect(senderOption).toBeVisible({ timeout: 15_000 });
  await senderOption.click();

  await composeDialog.getByLabel('شخص امضاکننده نامه').fill('مدیر بازرگانی');

  // ── 6. Attempt FINAL WITHOUT attachment — FE guard must block (defense in depth) ─
  await composeDialog.getByRole('button', { name: 'ثبت نامه دریافتی' }).click();
  await expect(composeDialog.getByText('فایل نامه را بارگذاری کنید.')).toBeVisible({ timeout: 5_000 });

  // ── 7. Attach the original document, then submit again ──────────────────
  await composeDialog.locator('input.gahshomar-compose__file-input').setInputFiles({
    name: fileName,
    mimeType: 'application/pdf',
    buffer: Buffer.from(`%PDF-1.4 E2E-GAH-013 ${stamp}`),
  });
  await expect(composeDialog.getByText(fileName)).toBeVisible({ timeout: 5_000 });

  const finalizePromise = page.waitForResponse(
    (res) => res.url().includes('/finalize') && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await composeDialog.getByRole('button', { name: 'ثبت نامه دریافتی' }).click();
  const finalizeRes = await finalizePromise;
  if (finalizeRes.status() < 200 || finalizeRes.status() >= 300) {
    await fail('IN finalize HTTP', `${finalizeRes.status()} ${await finalizeRes.text().catch(() => '')}`);
  }
  const finalizeBody = await finalizeRes.json();
  const finalized = finalizeBody?.correspondence || finalizeBody;
  ids.officialNumber = finalized?.officialNumber;
  if (!ids.officialNumber) await fail('IN finalize missing officialNumber', JSON.stringify(finalizeBody));
  if (finalized?.status !== 'FINAL') await fail('IN finalize did not persist FINAL status', JSON.stringify(finalizeBody));

  await expect(page.getByText(subject).first()).toBeVisible({ timeout: 15_000 });
  // Incoming compose popup auto-closes back to the list on successful finalize
  // (unlike OUTGOING, which stays open showing the locked/issued view) — close
  // it explicitly only if it is still around.
  const stillOpenDialog = page.getByRole('dialog').getByRole('button', { name: /^بستن$/ }).first();
  if (await stillOpenDialog.isVisible().catch(() => false)) {
    await stillOpenDialog.click();
  }

  // ── 8. Hard refresh — attachment + metadata persist (product rule X) ────
  await page.reload({ waitUntil: 'networkidle' });
  await page.goto('/gahshomar');
  await page.getByRole('tab', { name: 'دریافتی' }).click();
  const listRow = page.locator('tr').filter({ hasText: subject });
  await expect(listRow).toBeVisible({ timeout: 20_000 });
  await expect(listRow).toContainText(ids.officialNumber);
  await listRow.getByRole('button', { name: 'مشاهده جزئیات' }).click();

  const viewDrawer = page.getByRole('dialog', { name: 'جزئیات نامه' });
  await expect(viewDrawer).toBeVisible({ timeout: 15_000 });
  await expect(viewDrawer).toContainText(ids.officialNumber);
  await expect(viewDrawer).toContainText(subject);
  await expect(viewDrawer).toContainText(fileName);
  await viewDrawer.locator('.gahshomar-drawer__actions').getByRole('button', { name: /^بستن$/ }).click();

  // ── 9. Kanoon Customer 360 projection (product rule 14) ─────────────────
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=documents`);
  await expect(page.getByText('دبیرخانه — اسناد و مکاتبات')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(subject).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(ids.officialNumber).first()).toBeVisible({ timeout: 10_000 });

  // ── 10. Timeline event for IN (product rule 16) ──────────────────────────
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=timeline`);
  await expect(page.getByText('تایم‌لاین وقایع')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('دریافت نامه رسمی').first()).toBeVisible({ timeout: 20_000 });

  // ── 11. Canonical record + attachment metadata — direct API proof ───────
  const finalGet = await getCorrespondenceApi(request, ids.token, ids.correspondenceId);
  expect(finalGet.status).toBeGreaterThanOrEqual(200);
  expect(finalGet.status).toBeLessThan(300);
  const canonical = finalGet.json?.correspondence || finalGet.json;
  expect(canonical.status).toBe('FINAL');
  expect(canonical.officialNumber).toBe(ids.officialNumber);
  expect(String(canonical.companyId)).toBe(String(ids.companyId));
  expect(Array.isArray(canonical.attachments) && canonical.attachments.length, 'attachment persisted').toBeGreaterThan(0);
  expect(canonical.attachments[0].fileName).toBe(fileName);

  // ── 12. Cleanup ───────────────────────────────────────────────────────
  const cleanup = [];
  for (const [kind, id] of [
    ['correspondence', ids.correspondenceId],
    ['company', ids.companyId],
  ]) {
    if (!id) continue;
    const result = await archiveEntity(request, ids.token, kind, id);
    cleanup.push({ kind, id, status: result.status });
  }
  console.log('[e2e-gah-013] cleanup', JSON.stringify(cleanup));
  console.log('[e2e-gah-013] PASS ids', JSON.stringify(ids));
});
