import { test, expect } from '@playwright/test';
import { loginAsQaAdmin } from '../helpers/auth.js';
import {
  archiveEntity,
  createCompanyApi,
  getCompany,
  getLead,
  listCompaniesByNationalId,
  listLeads,
  loginApi,
} from '../helpers/api.js';
import { requireE2eQaCredentials, loadRepoEnv } from '../helpers/loadEnv.js';

loadRepoEnv();

/**
 * CROSS-MODULE JOURNEY 002 — Ofogh Lead → Kanoon Customer Identity
 * Real FE + BE + Postgres. VITE_USE_MOCK_API=false. No Lead/Company mocks.
 *
 * Discovery notes (do not invent product rules):
 * - Lead has no nationalId; convert supplies it.
 * - create_new convert requires CompanyIdentityResolver (Linka when enabled).
 * - When Linka is unavailable, convert uses link_existing against a pre-seeded
 *   canonical Kanoon company (POST /companies) — designed backend path.
 */

test.describe.configure({ mode: 'serial' });

test('CROSS-MODULE JOURNEY 002: Ofogh Lead → Kanoon Customer', async ({ page, request }, testInfo) => {
  test.setTimeout(240_000);

  const stamp = Date.now();
  const leadName1 = `E2E-OFQ-${stamp}`;
  const leadName2 = `E2E-OFQ-${stamp}-B`;
  const personName = `شخص-${stamp}`;
  const mobile = `09${String(stamp).slice(-8).padStart(8, '0')}`;
  const leadSource = `E2E-OFQ-SRC-${stamp}`;
  const nationalId = `9${String(stamp).slice(-10)}`;

  /** @type {Record<string, any>} */
  const report = {
    leadId1: null,
    leadId2: null,
    companyId1: null,
    companyId2: null,
    conversionMode1: null,
    conversionMode2: null,
    createNewBlocked: null,
    customer360Gap: null,
    navigationGap: null,
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
      `CROSS-MODULE JOURNEY 002 FAIL — ${relation}${detail ? `: ${detail}` : ''}`
      + `\nIDs: ${JSON.stringify({
        leadId1: report.leadId1,
        leadId2: report.leadId2,
        companyId1: report.companyId1,
        companyId2: report.companyId2,
      })}`
      + `\nFailed network: ${JSON.stringify(report.failedNetwork.slice(-6))}`,
    );
  };

  // ── A. Preconditions ──────────────────────────────────────────────────
  const health = await request.get('http://localhost:3100/api/health');
  expect(health.ok()).toBeTruthy();
  const healthJson = await health.json();
  expect(healthJson.ok).toBe(true);
  expect(healthJson.db).toBe('up');

  expect(process.env.VITE_USE_MOCK_API, 'VITE_USE_MOCK_API must be false').toBe('false');

  const session = await loginAsQaAdmin(page, {
    requiredPermissions: [
      'leads:write',
      'leads:convert',
      'companies:write',
      'companies:read',
      'leads:read',
    ],
  });
  report.token = session.token;

  const { username, password } = requireE2eQaCredentials();
  const apiLogin = await loginApi(request, username, password);
  report.token = apiLogin.token;

  // ── B. Create Lead #1 in Ofogh ────────────────────────────────────────
  await page.goto('/ofogh');
  await expect(page.getByRole('button', { name: 'ثبت سرنخ خام' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'ثبت سرنخ خام' }).click();

  const createDlg = page.getByRole('dialog', { name: 'ثبت سرنخ خام' });
  await expect(createDlg).toBeVisible();
  await createDlg.getByLabel(/نام شرکت یا مجموعه/).fill(leadName1);
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
  report.leadId1 = leadBody?.lead?.id || leadBody?.id;
  if (!report.leadId1) {
    await failStep('Lead create missing id', JSON.stringify(leadBody));
  }

  await expect(createDlg).toBeHidden({ timeout: 15_000 });
  await expect(page.locator('.ofoq-lead-card--raw', { hasText: leadName1 })).toBeVisible({
    timeout: 20_000,
  });

  const leadGet1 = await getLead(request, report.token, report.leadId1);
  if (leadGet1.status < 200 || leadGet1.status >= 300 || !leadGet1.json?.lead) {
    await failStep('Lead missing on Backend after create', `${leadGet1.status}`);
  }

  // Hard refresh persistence
  await page.reload({ waitUntil: 'networkidle' });
  await page.goto('/ofogh');
  await expect(page.locator('.ofoq-lead-card--raw', { hasText: leadName1 })).toBeVisible({
    timeout: 30_000,
  });
  const leadAfterRefresh = await getLead(request, report.token, report.leadId1);
  if (!leadAfterRefresh.json?.lead) {
    await failStep('PERSISTENCE BUG', 'Lead toast/create succeeded but Lead gone after refresh');
  }

  // ── C. Capture Lead identity ──────────────────────────────────────────
  const leadSnap = leadAfterRefresh.json.lead;
  const leadIdentity = {
    leadId: leadSnap.id,
    companyName: leadSnap.companyName,
    personName: leadSnap.personName,
    mobile: leadSnap.mobile,
    nationalId: leadSnap.nationalId ?? null,
    leadSource: leadSnap.leadSource,
    status: leadSnap.status,
    createdAt: leadSnap.createdAt,
    assignee: leadSnap.payload?.assignee || null,
  };
  console.log('[e2e-ofq] lead identity', JSON.stringify(leadIdentity));
  expect(leadIdentity.nationalId, 'Lead model has no nationalId (expected)').toBeNull();

  // ── D. Convert — probe create_new, then link_existing ─────────────────
  // Probe: convert without existing company (exercises identity provider).
  {
    const probe = await request.fetch(
      `http://localhost:3100/api/v1/leads/${report.leadId1}/convert`,
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
      report.companyId1 = probeJson.companyId;
      report.conversionMode1 = probeJson.conversionMode || 'create_new';
      report.createNewBlocked = false;
    } else {
      report.createNewBlocked = {
        status: probe.status(),
        error: probeJson.error || probeJson.code || null,
        message: probeJson.message || null,
      };
      console.log('[e2e-ofq] create_new blocked', JSON.stringify(report.createNewBlocked));
    }
  }

  // If create_new failed (e.g. Linka unavailable), seed canonical Kanoon company
  // then convert via UI (link_existing) — no new business rule; designed backend path.
  if (!report.companyId1) {
    const seeded = await createCompanyApi(request, report.token, {
      name: leadName1,
      entityType: 'CUSTOMER',
      nationalId,
      activityDomain: 'بازرگانی آهن و فولاد',
      payload: {
        personType: 'legal',
        companyName: leadName1,
        recordType: 'CUSTOMER',
      },
    });
    if (seeded.status < 200 || seeded.status >= 300) {
      await failStep('Seed canonical Kanoon company for link_existing', `${seeded.status}`);
    }
    report.companyId1 = seeded.json?.company?.id;
    if (!report.companyId1) {
      await failStep('Seed company missing id', JSON.stringify(seeded.json));
    }

    await page.goto('/ofogh');
    // Prefer opening via card; if detail already open, reuse it.
    const openCard = page.locator('.ofoq-lead-card--raw', { hasText: leadName1 });
    await expect(openCard).toBeVisible({ timeout: 20_000 });
    await openCard.click();
    const detail = page.getByRole('dialog', { name: new RegExp(`سرنخ ${leadName1}`) });
    await expect(detail).toBeVisible({ timeout: 15_000 });
    await detail.getByRole('button', { name: 'تبدیل به مخاطب' }).click();

    const convDlg = page.getByRole('dialog', { name: 'تبدیل به مخاطب' });
    await expect(convDlg).toBeVisible();
    await convDlg.getByLabel(/شناسه ملی/).fill(nationalId);

    const convertPromise = page.waitForResponse(
      (res) => res.url().includes(`/leads/${report.leadId1}/convert`)
        && res.request().method() === 'POST',
      { timeout: 45_000 },
    );
    await convDlg.getByRole('button', { name: 'تایید تبدیل' }).click();
    const convertRes = await convertPromise;
    if (convertRes.status() < 200 || convertRes.status() >= 300) {
      await failStep('Lead convert HTTP', `${convertRes.status()}`);
    }
    const convertBody = await convertRes.json();
    report.conversionMode1 = convertBody.conversionMode;
    report.companyId1 = convertBody.companyId || convertBody.company?.id || report.companyId1;
    if (!report.companyId1) {
      await failStep('Convert missing companyId', JSON.stringify(convertBody));
    }
    if (report.conversionMode1 !== 'link_existing') {
      console.log('[e2e-ofq] unexpected conversionMode after seed', report.conversionMode1);
    }
  }

  // ── E/F. Single identity + lineage ────────────────────────────────────
  const leadConverted = await getLead(request, report.token, report.leadId1);
  const leadC = leadConverted.json?.lead;
  if (!leadC) {
    await failStep('CUSTOMER LINEAGE LOST', 'Lead not retrievable after convert');
  }
  if (String(leadC.status).toUpperCase() !== 'CONVERTED') {
    await failStep('Lead status not CONVERTED', String(leadC.status));
  }
  if (String(leadC.convertedCompanyId) !== String(report.companyId1)) {
    await failStep(
      'ARCHITECTURE VIOLATION: SINGLE CUSTOMER IDENTITY / lineage',
      `lead.convertedCompanyId=${leadC.convertedCompanyId} vs companyId=${report.companyId1}`,
    );
  }

  const companyGet = await getCompany(request, report.token, report.companyId1);
  const company = companyGet.json?.company;
  if (!company?.id) {
    await failStep('Canonical Customer not found in Kanoon', `${companyGet.status}`);
  }

  // ── G/H. Customer 360 Lead Origin + Kanoon → Ofogh navigation ─────────
  await page.goto(`/kanoon/contact/${report.companyId1}`);
  await expect(page.getByText(leadName1).first()).toBeVisible({ timeout: 30_000 });

  const originCard = page.getByTestId('customer-lead-origin');
  await expect(originCard).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('customer-lead-origin-source')).toContainText(leadSource);
  await expect(page.getByTestId('customer-lead-origin-name')).toContainText(leadName1);
  await expect(page.getByTestId('customer-lead-origin-id')).toHaveText(String(report.leadId1));
  await expect(page.getByTestId('customer-lead-origin-status')).toContainText('تبدیل');

  await page.getByTestId('customer-lead-origin-open-ofogh').click();
  await expect(page).toHaveURL(new RegExp(`/ofogh\\?leadId=${encodeURIComponent(report.leadId1)}`), {
    timeout: 20_000,
  });
  const ofoghDetail = page.getByRole('dialog', { name: new RegExp(`سرنخ ${leadName1}`) });
  await expect(ofoghDetail).toBeVisible({ timeout: 20_000 });
  await expect(ofoghDetail).toContainText(leadSource);

  // ── I. Hard refresh Customer Profile — origin + nav still work ────────
  await page.goto(`/kanoon/contact/${report.companyId1}`);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('customer-lead-origin')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('customer-lead-origin-id')).toHaveText(String(report.leadId1));
  await expect(page.getByTestId('customer-lead-origin-source')).toContainText(leadSource);

  await page.getByTestId('customer-lead-origin-open-ofogh').click();
  await expect(page).toHaveURL(new RegExp(`leadId=${encodeURIComponent(report.leadId1)}`), {
    timeout: 20_000,
  });
  await expect(page.getByRole('dialog', { name: new RegExp(`سرنخ ${leadName1}`) })).toBeVisible({
    timeout: 20_000,
  });

  const leadStill = await getLead(request, report.token, report.leadId1);
  const companyStill = await getCompany(request, report.token, report.companyId1);
  if (!leadStill.json?.lead || String(leadStill.json.lead.convertedCompanyId) !== String(report.companyId1)) {
    await failStep('Lead→Customer relation lost after hard refresh');
  }
  if (!companyStill.json?.company?.id) {
    await failStep('Customer missing after hard refresh');
  }

  // ── J. Duplicate protection — Lead #2 same nationalId ─────────────────
  await page.goto('/ofogh');
  // Close any open lead dialog from deep-link
  const openDlg = page.getByRole('dialog').first();
  if (await openDlg.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape').catch(() => {});
  }
  await page.getByRole('button', { name: 'ثبت سرنخ خام' }).click();
  const create2 = page.getByRole('dialog', { name: 'ثبت سرنخ خام' });
  await create2.getByLabel(/نام شرکت یا مجموعه/).fill(leadName2);
  await create2.getByLabel(/نام شخص/).fill(`${personName}-B`);
  await create2.getByLabel(/موبایل/).fill(`09${String(stamp + 1).slice(-8).padStart(8, '0')}`);
  await create2.getByLabel(/منبع جذب/).fill(leadSource);

  const lead2PostPromise = page.waitForResponse(
    (res) => res.url().includes('/leads')
      && !res.url().includes('/convert')
      && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await create2.getByRole('button', { name: 'ذخیره سرنخ' }).click();
  const lead2Post = await lead2PostPromise;
  if (lead2Post.status() < 200 || lead2Post.status() >= 300) {
    await failStep('Lead #2 create HTTP', `${lead2Post.status()}`);
  }
  report.leadId2 = (await lead2Post.json())?.lead?.id;
  if (!report.leadId2) {
    await failStep('Lead #2 missing id');
  }

  await expect(create2).toBeHidden({ timeout: 15_000 });
  // Create modal onSaved auto-opens detail — do not click the card under the overlay.
  const detail2 = page.getByRole('dialog', { name: new RegExp(`سرنخ ${leadName2}`) });
  await expect(detail2).toBeVisible({ timeout: 15_000 });
  await detail2.getByRole('button', { name: 'تبدیل به مخاطب' }).click();
  const conv2 = page.getByRole('dialog', { name: 'تبدیل به مخاطب' });
  await conv2.getByLabel(/شناسه ملی/).fill(nationalId);

  const convert2Promise = page.waitForResponse(
    (res) => res.url().includes(`/leads/${report.leadId2}/convert`)
      && res.request().method() === 'POST',
    { timeout: 45_000 },
  );
  await conv2.getByRole('button', { name: 'تایید تبدیل' }).click();
  const convert2Res = await convert2Promise;
  if (convert2Res.status() < 200 || convert2Res.status() >= 300) {
    await failStep('Lead #2 convert HTTP', `${convert2Res.status()}`);
  }
  const convert2Body = await convert2Res.json();
  report.companyId2 = convert2Body.companyId || convert2Body.company?.id;
  report.conversionMode2 = convert2Body.conversionMode;

  if (!report.companyId2) {
    await failStep('Lead #2 convert missing companyId', JSON.stringify(convert2Body));
  }
  if (String(report.companyId1) !== String(report.companyId2)) {
    await failStep(
      'P0 DUPLICATE CUSTOMER BUG',
      `companyId1=${report.companyId1} companyId2=${report.companyId2}`,
    );
  }
  if (report.conversionMode2 !== 'link_existing') {
    console.log('[e2e-ofq] Lead #2 conversionMode', report.conversionMode2);
  }

  // Origin must remain Lead #1 (earliest conversion), not last-write Lead #2
  await page.goto(`/kanoon/contact/${report.companyId1}`);
  await expect(page.getByTestId('customer-lead-origin-id')).toHaveText(String(report.leadId1), {
    timeout: 30_000,
  });
  await expect(page.getByTestId('customer-lead-related-count')).toBeVisible();
  report.primaryOriginRule = 'INTERIM: earliest convertedAt; PRIMARY LEAD ORIGIN RULE REQUIRED';

  // ── K. API proof ──────────────────────────────────────────────────────
  const nidMatches = await listCompaniesByNationalId(request, report.token, nationalId);
  if (nidMatches.matches.length !== 1) {
    await failStep(
      'P0 DUPLICATE CUSTOMER BUG',
      `Customer count for nationalId=${nationalId} is ${nidMatches.matches.length}`,
    );
  }

  const lead1Final = await getLead(request, report.token, report.leadId1);
  const lead2Final = await getLead(request, report.token, report.leadId2);
  expect(String(lead1Final.json.lead.convertedCompanyId)).toBe(String(report.companyId1));
  expect(String(lead2Final.json.lead.convertedCompanyId)).toBe(String(report.companyId1));

  const listed = await listLeads(request, report.token, { q: 'E2E-OFQ-' });
  const listedIds = (listed.json?.items || []).map((l) => l.id);
  expect(listedIds).toContain(report.leadId1);
  expect(listedIds).toContain(report.leadId2);

  // ── N. Cleanup (leads first, then company) ────────────────────────────
  const cleanup = [];
  for (const [kind, id] of [
    ['lead', report.leadId2],
    ['lead', report.leadId1],
    ['company', report.companyId1],
  ]) {
    if (!id) continue;
    const result = await archiveEntity(request, report.token, kind, id);
    cleanup.push({ kind, id, status: result.status });
  }

  console.log('[e2e-ofq] cleanup', JSON.stringify(cleanup));
  console.log('[e2e-ofq] PASS report', JSON.stringify({
    leadId1: report.leadId1,
    leadId2: report.leadId2,
    companyId1: report.companyId1,
    companyId2: report.companyId2,
    conversionMode1: report.conversionMode1,
    conversionMode2: report.conversionMode2,
    createNewBlocked: report.createNewBlocked,
    primaryOriginRule: report.primaryOriginRule,
    customer360Gap: null,
    navigationGap: null,
  }));
});
