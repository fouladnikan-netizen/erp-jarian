import { test, expect } from '@playwright/test';
import { loginAsQaAdmin } from '../helpers/auth.js';
import {
  archiveEntity,
  createActivityApi,
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
 * POOYESH JOURNEY 010 — Lead → Customer lineage projection (Gap 3)
 * Pre-conversion Ofogh Lead Activities/Tasks are PROJECTED (not copied/re-keyed)
 * onto Kanoon's Customer 360 timeline, alongside a conversion marker and the
 * lead source, merged chronologically with post-conversion Company Activities.
 * Real FE + BE + Postgres. VITE_USE_MOCK_API=false. No mocks.
 */

test.describe.configure({ mode: 'serial' });

test('POOYESH JOURNEY 010: Lead pre-conversion history projected onto Customer 360', async ({ page, request }, testInfo) => {
  test.setTimeout(240_000);

  const stamp = Date.now();
  const leadName = `E2E-LINEAGE-${stamp}`;
  const personName = `شخص-${stamp}`;
  const mobile = `09${String(stamp).slice(-8).padStart(8, '0')}`;
  const leadSource = `E2E-LINEAGE-SRC-${stamp}`;
  const activityText1 = `E2E-LINEAGE-ACT1-${stamp}`;
  const activityText2 = `E2E-LINEAGE-ACT2-${stamp}`;
  const leadTaskTitle = `E2E-LINEAGE-TASK-${stamp}`;
  const postConversionActivityText = `E2E-LINEAGE-POSTCONV-${stamp}`;
  const nationalId = `9${String(stamp).slice(-10)}`;

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
      `POOYESH JOURNEY 010 FAIL — ${relation}${detail ? `: ${detail}` : ''}`
      + `\nIDs: ${JSON.stringify(ids)}`
      + `\nFailed network: ${JSON.stringify(ids.failedNetwork.slice(-6))}`,
    );
  };

  // ── 1. Login ─────────────────────────────────────────────────────────
  await loginAsQaAdmin(page, {
    requiredPermissions: [
      'leads:write', 'leads:convert', 'leads:read',
      'companies:write', 'companies:read',
      'activities:write', 'activities:read',
      'tasks:write', 'tasks:read',
    ],
  });
  const { username, password } = requireE2eQaCredentials();
  const apiLogin = await loginApi(request, username, password);
  ids.token = apiLogin.token;

  // ── 2. Create Lead (Ofogh) ──────────────────────────────────────────────
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
  ids.leadId = (await leadPost.json())?.lead?.id;
  if (!ids.leadId) await fail('Lead create missing id');

  const detail = page.getByRole('dialog', { name: new RegExp(`سرنخ ${leadName}`) });
  await expect(detail).toBeVisible({ timeout: 15_000 });

  // ── 3. Two Activities on the Lead (RAW_LEAD subject) ─────────────────────
  for (const text of [activityText1, activityText2]) {
    await detail.locator('.ofoq-modal__note-input').fill(text);
    const activityPostPromise = page.waitForResponse(
      (res) => res.url().includes('/activities') && res.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await detail.getByRole('button', { name: 'ثبت پویش' }).click();
    const activityPost = await activityPostPromise;
    if (activityPost.status() < 200 || activityPost.status() >= 300) {
      await fail('Lead Activity create HTTP', `${activityPost.status()}`);
    }
  }
  await expect(detail.getByText(activityText1).first()).toBeVisible({ timeout: 20_000 });
  await expect(detail.getByText(activityText2).first()).toBeVisible({ timeout: 20_000 });

  // ── 4. One Task on the Lead (via API — no Raw-Lead Task creation UI yet) ─
  const taskCreate = await createTaskApi(request, ids.token, {
    subjectType: 'RAW_LEAD',
    subjectId: ids.leadId,
    title: leadTaskTitle,
  });
  if (taskCreate.status < 200 || taskCreate.status >= 300) await fail('Lead Task create HTTP', `${taskCreate.status}`);
  ids.leadTaskId = taskCreate.json?.task?.id;
  if (!ids.leadTaskId) await fail('Lead Task create missing id');

  // ── 5. Convert Lead → Customer ───────────────────────────────────────────
  {
    const probe = await request.fetch(`http://localhost:3100/api/v1/leads/${ids.leadId}/convert`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ids.token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      data: { nationalId },
      failOnStatusCode: false,
    });
    const probeJson = await probe.json().catch(() => ({}));
    if (probe.ok() && probeJson.companyId) {
      ids.companyId = probeJson.companyId;
    }
  }

  if (!ids.companyId) {
    const seeded = await createCompanyApi(request, ids.token, {
      name: leadName,
      entityType: 'CUSTOMER',
      nationalId,
      activityDomain: 'بازرگانی آهن و فولاد',
      payload: { personType: 'legal', companyName: leadName, recordType: 'CUSTOMER' },
    });
    if (seeded.status < 200 || seeded.status >= 300) await fail('Seed canonical company for link_existing', `${seeded.status}`);
    ids.companyId = seeded.json?.company?.id;

    await page.goto('/ofogh');
    if (await page.getByRole('dialog').first().isVisible().catch(() => false)) {
      await page.keyboard.press('Escape').catch(() => {});
    }
    const card = page.locator('.ofoq-lead-card--raw', { hasText: leadName });
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.click();
    const reopened = page.getByRole('dialog', { name: new RegExp(`سرنخ ${leadName}`) });
    await expect(reopened).toBeVisible({ timeout: 15_000 });
    await reopened.getByRole('button', { name: 'تبدیل به مخاطب' }).click();
    const convDlg = page.getByRole('dialog', { name: 'تبدیل به مخاطب' });
    await expect(convDlg).toBeVisible();
    await convDlg.getByLabel(/شناسه ملی/).fill(nationalId);
    const convertPromise = page.waitForResponse(
      (res) => res.url().includes(`/leads/${ids.leadId}/convert`) && res.request().method() === 'POST',
      { timeout: 45_000 },
    );
    await convDlg.getByRole('button', { name: 'تایید تبدیل' }).click();
    const convertRes = await convertPromise;
    if (convertRes.status() < 200 || convertRes.status() >= 300) await fail('Lead convert HTTP', `${convertRes.status()}`);
    const convertBody = await convertRes.json();
    ids.companyId = convertBody.companyId || convertBody.company?.id || ids.companyId;
  }

  // ── 6. Lead still exists/readable, CONVERTED, not deleted ───────────────
  const leadAfter = await getLead(request, ids.token, ids.leadId);
  const leadC = leadAfter.json?.lead;
  if (!leadC) await fail('Lead not retrievable after convert');
  if (String(leadC.status).toUpperCase() !== 'CONVERTED') await fail('Lead status not CONVERTED', String(leadC.status));
  ids.convertedAt = leadC.convertedAt;

  // ── 7-10. Customer 360 timeline shows lead history + source + conversion ─
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=timeline`);
  await expect(page.getByText('تایم‌لاین وقایع')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(activityText1).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(activityText2).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(leadTaskTitle).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('سرنخ به مشتری تبدیل شد').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(new RegExp(leadSource)).first()).toBeVisible({ timeout: 20_000 });

  // ── 11. Post-conversion Company Activity ─────────────────────────────────
  // NOTE: Lead-converted companies are always personType='legal'
  // (leadService.js), and the FE customer-completion gate requires >=1
  // relatedPerson before allowing a new Activity via the MagicInput UI.
  // Discovered while building this journey: `relatedPersons` has NO real
  // backend persistence (no column/endpoint on `companies` — grep confirms
  // ContactPersonModal's SERVER_FIRST PATCH round-trips through the real
  // API, which silently drops the field since the schema doesn't know it),
  // so this FE-only gate can never be resolved against the real backend
  // today — an existing gap orthogonal to Gap 1-4, reported separately
  // below. Using the canonical Activity API directly here to prove Gap 3's
  // actual claim (unified chronological timeline ordering).
  const postAct = await createActivityApi(request, ids.token, {
    subjectType: 'COMPANY',
    subjectId: ids.companyId,
    activityType: 'note',
    note: postConversionActivityText,
  });
  if (postAct.status < 200 || postAct.status >= 300) {
    await fail('Post-conversion Activity create HTTP', `${postAct.status} ${JSON.stringify(postAct.json)}`);
  }
  ids.postConversionActivityId = postAct.json?.activity?.id;

  // ── 12. Unified chronological timeline: post-conv newest, lead-era older ─
  await page.goto(`/kanoon/contact/${ids.companyId}?tab=timeline`);
  await expect(page.getByText('تایم‌لاین وقایع')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(postConversionActivityText).first()).toBeVisible({ timeout: 20_000 });
  const cards = page.locator('.kprofile-timeline__item');
  const texts = await cards.allTextContents();
  const idxPost = texts.findIndex((t) => t.includes(postConversionActivityText));
  const idxConversion = texts.findIndex((t) => t.includes('سرنخ به مشتری تبدیل شد'));
  const idxAct1 = texts.findIndex((t) => t.includes(activityText1));
  const idxAct2 = texts.findIndex((t) => t.includes(activityText2));
  if ([idxPost, idxConversion, idxAct1, idxAct2].some((i) => i < 0)) {
    await fail('Timeline missing an expected event', JSON.stringify({ idxPost, idxConversion, idxAct1, idxAct2 }));
  }
  if (!(idxPost < idxConversion && idxConversion < idxAct1 && idxConversion < idxAct2)) {
    await fail(
      'Timeline chronological order wrong (post-conversion must be newest, pre-conversion events must sort after the conversion marker)',
      JSON.stringify({ idxPost, idxConversion, idxAct1, idxAct2 }),
    );
  }

  // ── 13. No duplicate Activity rows — none re-keyed from RAW_LEAD→COMPANY ─
  const leadActivities = await getActivitiesForSubject(request, ids.token, 'RAW_LEAD', ids.leadId);
  const leadActivityMatches = (leadActivities.json?.items || []).filter((a) => a.description === activityText1 || a.description === activityText2);
  if (leadActivityMatches.length !== 2) await fail('Lead-era Activity rows re-keyed or duplicated', `count=${leadActivityMatches.length}`);
  const companyActivities = await getActivitiesForSubject(request, ids.token, 'COMPANY', ids.companyId);
  const companyActivityMatches = (companyActivities.json?.items || []).filter((a) => a.description === postConversionActivityText);
  if (companyActivityMatches.length !== 1) await fail('Post-conversion Activity not exactly one row', `count=${companyActivityMatches.length}`);
  // The lead-era activities must NOT also show up under the Company subject (no re-keying/copy).
  const companyActivityGhosts = (companyActivities.json?.items || []).filter((a) => a.description === activityText1 || a.description === activityText2);
  if (companyActivityGhosts.length !== 0) await fail('Lead-era Activity leaked into Company subject (re-key/copy regression)', `count=${companyActivityGhosts.length}`);

  const leadTasksAfter = await getTasksForSubject(request, ids.token, 'RAW_LEAD', ids.leadId);
  const leadTaskMatches = (leadTasksAfter.json?.items || []).filter((t) => t.id === ids.leadTaskId);
  if (leadTaskMatches.length !== 1) await fail('Lead Task lineage broken', `count=${leadTaskMatches.length}`);

  // ── 14. Hard refresh — lineage still renders ────────────────────────────
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByText(activityText1).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(activityText2).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(leadTaskTitle).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('سرنخ به مشتری تبدیل شد').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(postConversionActivityText).first()).toBeVisible({ timeout: 20_000 });

  // ── 15. Cleanup ──────────────────────────────────────────────────────────
  const cleanup = [];
  for (const [kind, id] of [
    ['activity', ids.postConversionActivityId],
    ['task', ids.leadTaskId],
    ['lead', ids.leadId],
    ['company', ids.companyId],
  ]) {
    if (!id) continue;
    const result = await archiveEntity(request, ids.token, kind, id);
    cleanup.push({ kind, id, status: result.status });
  }
  console.log('[e2e-lineage-010] cleanup', JSON.stringify(cleanup));
  console.log('[e2e-lineage-010] PASS report', JSON.stringify(ids));
});
