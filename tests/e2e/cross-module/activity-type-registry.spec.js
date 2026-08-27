import { test, expect } from '@playwright/test';
import { loginAsQaAdmin } from '../helpers/auth.js';
import {
  archiveEntity,
  createCompanyApi,
  createOrderApi,
  loginApi,
} from '../helpers/api.js';
import { requireE2eQaCredentials, loadRepoEnv } from '../helpers/loadEnv.js';

loadRepoEnv();

/**
 * POOYESH JOURNEY 008 — Shirazeh-driven Activity Type Registry (Gap 1)
 * Create a canonical Activity Type via the real Shirazeh UI, then verify the
 * SAME registry entry is offered on the Kanoon (Customer), Ofogh (Lead), and
 * Nabz (Order CRM) activity-creation surfaces. Deactivate it and verify a
 * historical Activity created with it remains fully readable everywhere,
 * while it disappears from new-activity pickers.
 * Real FE + BE + Postgres. VITE_USE_MOCK_API=false. No mocks.
 */

test.describe.configure({ mode: 'serial' });

test('POOYESH JOURNEY 008: Activity Type Registry — one source, three surfaces', async ({ page, request }, testInfo) => {
  test.setTimeout(240_000);

  const stamp = Date.now();
  const typeKey = `e2e_${stamp}`;
  const typeLabel = `نوعِ‌آزمایش-${stamp}`;
  const companyName = `E2E-ATYPE-${stamp}`;
  const nationalId = `9${String(stamp).slice(-10)}`;
  const historicalActivityText = `E2E-ATYPE-HIST-${stamp}`;

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
      `POOYESH JOURNEY 008 FAIL — ${relation}${detail ? `: ${detail}` : ''}`
      + `\nIDs: ${JSON.stringify(ids)}`
      + `\nFailed network: ${JSON.stringify(ids.failedNetwork.slice(-6))}`,
    );
  };

  // ── 1. Login (admin: users:admin needed for registry CRUD) ─────────────
  await loginAsQaAdmin(page, {
    requiredPermissions: ['users:admin', 'activities:read', 'activities:write', 'companies:write', 'orders:write'],
  });
  const { username, password } = requireE2eQaCredentials();
  const apiLogin = await loginApi(request, username, password);
  ids.token = apiLogin.token;

  // ── 2. Create the Activity Type via the real Shirazeh UI ───────────────
  await page.goto('/shirazeh/activity-types');
  await expect(page.getByRole('heading', { name: 'انواع فعالیت پویش' })).toBeVisible({ timeout: 30_000 });
  await page.locator('.shirazeh-atypes__input').first().fill(typeLabel);
  await page.locator('.shirazeh-atypes__input--key').fill(typeKey);

  const createPostPromise = page.waitForResponse(
    (res) => res.url().includes('/activity-types') && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'افزودن نوع' }).click();
  const createPost = await createPostPromise;
  if (createPost.status() < 200 || createPost.status() >= 300) {
    await fail('Activity Type create HTTP', `${createPost.status()}`);
  }
  const createdBody = await createPost.json();
  ids.typeKey = createdBody?.activityType?.key || typeKey;
  await expect(page.locator('tr', { hasText: typeLabel })).toBeVisible({ timeout: 15_000 });

  // ── 3. Kanoon Customer surface — same registry entry offered ────────────
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

  await page.goto(`/kanoon/contact/${ids.companyId}?tab=interactions`);
  await expect(page.getByText('پویش — تعاملات')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /ثبت فعالیت جدید/ }).click();
  const pooyeshTablist = page.getByRole('tablist', { name: 'نوع فعالیت پویش' });
  await expect(pooyeshTablist).toBeVisible({ timeout: 15_000 });
  await expect(pooyeshTablist.getByRole('tab', { name: typeLabel })).toBeVisible({ timeout: 15_000 });

  // Use it to create a historical Activity (needed for the deactivation check below).
  await pooyeshTablist.getByRole('tab', { name: typeLabel }).click();
  await page.locator('.kprofile-magic__textarea').fill(historicalActivityText);
  const histActivityPostPromise = page.waitForResponse(
    (res) => res.url().includes('/activities') && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'ثبت فعالیت' }).click();
  const histActivityPost = await histActivityPostPromise;
  if (histActivityPost.status() < 200 || histActivityPost.status() >= 300) {
    await fail('Historical Activity create HTTP', `${histActivityPost.status()}`);
  }
  const histActivity = (await histActivityPost.json())?.activity;
  ids.activityId = histActivity?.id;
  if (String(histActivity?.activityType) !== ids.typeKey) {
    await fail('Historical Activity activityType mismatch', String(histActivity?.activityType));
  }
  await expect(page.getByText(historicalActivityText).first()).toBeVisible({ timeout: 20_000 });

  // ── 4. Ofogh Lead surface — same registry entry offered ─────────────────
  await page.goto('/ofogh');
  await expect(page.getByRole('button', { name: 'ثبت سرنخ خام' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'ثبت سرنخ خام' }).click();
  const leadDlg = page.getByRole('dialog', { name: 'ثبت سرنخ خام' });
  await expect(leadDlg).toBeVisible();
  const leadCompanyName = `E2E-ATYPE-LEAD-${stamp}`;
  await leadDlg.getByLabel(/نام شرکت یا مجموعه/).fill(leadCompanyName);
  await leadDlg.getByLabel(/نام شخص/).fill(`شخص-${stamp}`);
  await leadDlg.getByLabel(/موبایل/).fill(`09${String(stamp).slice(-8).padStart(8, '0')}`);
  await leadDlg.getByLabel(/منبع جذب/).fill(`E2E-SRC-${stamp}`);

  const leadPostPromise = page.waitForResponse(
    (res) => res.url().includes('/leads') && !res.url().includes('/convert') && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await leadDlg.getByRole('button', { name: 'ذخیره سرنخ' }).click();
  const leadPost = await leadPostPromise;
  if (leadPost.status() < 200 || leadPost.status() >= 300) await fail('Lead create HTTP', `${leadPost.status()}`);
  ids.leadId = (await leadPost.json())?.lead?.id;

  const leadDetail = page.getByRole('dialog', { name: new RegExp(`سرنخ ${leadCompanyName}`) });
  await expect(leadDetail).toBeVisible({ timeout: 15_000 });
  const ofoghTablist = leadDetail.getByRole('tablist', { name: 'نوع فعالیت' });
  await expect(ofoghTablist).toBeVisible({ timeout: 15_000 });
  await expect(ofoghTablist.getByRole('tab', { name: typeLabel })).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('Escape').catch(() => {});

  // ── 5. Nabz Order CRM surface — same registry entry offered ─────────────
  const ord = await createOrderApi(request, ids.token, { companyId: ids.companyId, title: `E2E-ATYPE-ORDER-${stamp}` });
  if (ord.status < 200 || ord.status >= 300) await fail('Order create HTTP', `${ord.status} ${JSON.stringify(ord.json)}`);
  ids.orderCode = ord.json?.order?.code || ord.json?.code;
  if (!ids.orderCode) await fail('Order create missing code', JSON.stringify(ord.json));

  await page.goto(`/nabz/order/${encodeURIComponent(ids.orderCode)}`);
  await page.getByRole('tab', { name: 'میثاق' }).click();
  await expect(page.getByRole('heading', { name: 'ثبت فعالیت و برنامه پیگیری' })).toBeVisible({ timeout: 20_000 });
  const nabzTablist = page.getByRole('tablist', { name: 'نوع تعامل' });
  await expect(nabzTablist).toBeVisible({ timeout: 15_000 });
  await expect(nabzTablist.getByRole('tab', { name: typeLabel })).toBeVisible({ timeout: 15_000 });

  // ── 6. Hard refresh — registry entry still persisted/offered ───────────
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=interactions`);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByText(historicalActivityText).first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /ثبت فعالیت جدید/ }).click();
  await expect(page.getByRole('tablist', { name: 'نوع فعالیت پویش' }).getByRole('tab', { name: typeLabel })).toBeVisible({ timeout: 15_000 });

  // ── 7. Deactivate in Shirazeh — historical Activity stays readable, ─────
  //      but the type disappears from NEW-activity pickers.
  await page.goto('/shirazeh/activity-types');
  await expect(page.getByRole('heading', { name: 'انواع فعالیت پویش' })).toBeVisible({ timeout: 30_000 });
  const row = page.locator('tr', { hasText: typeLabel });
  const deactivatePromise = page.waitForResponse(
    (res) => res.url().includes(`/activity-types/${ids.typeKey}/deactivate`) && res.request().method() === 'PATCH',
    { timeout: 30_000 },
  );
  await row.getByLabel('غیرفعال‌سازی').click();
  const deactivateRes = await deactivatePromise;
  if (deactivateRes.status() < 200 || deactivateRes.status() >= 300) {
    await fail('Activity Type deactivate HTTP', `${deactivateRes.status()}`);
  }
  await expect(row.getByText('غیرفعال')).toBeVisible({ timeout: 15_000 });

  await page.goto(`/kanoon/contact/${ids.companyId}?tab=interactions`);
  await expect(page.getByText('پویش — تعاملات')).toBeVisible({ timeout: 30_000 });
  // Historical Activity with the now-deactivated type still renders fully.
  await expect(page.getByText(historicalActivityText).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(typeLabel).first()).toBeVisible({ timeout: 20_000 });
  // But the picker for NEW activities no longer offers it.
  await page.getByRole('button', { name: /ثبت فعالیت جدید/ }).click();
  await expect(page.getByRole('tablist', { name: 'نوع فعالیت پویش' }).getByRole('tab', { name: typeLabel })).toHaveCount(0);

  // ── 8. Cleanup (soft archive / restore state) ───────────────────────────
  const cleanup = [];
  for (const [kind, id] of [
    ['activity', ids.activityId],
    ['order', ids.orderCode],
    ['lead', ids.leadId],
    ['company', ids.companyId],
  ]) {
    if (!id) continue;
    const result = await archiveEntity(request, ids.token, kind, id);
    cleanup.push({ kind, id, status: result.status });
  }
  console.log('[e2e-atype-008] cleanup', JSON.stringify(cleanup));
  console.log('[e2e-atype-008] PASS report', JSON.stringify({ typeKey: ids.typeKey, companyId: ids.companyId, leadId: ids.leadId, orderCode: ids.orderCode, activityId: ids.activityId }));
});
