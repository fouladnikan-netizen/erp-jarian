import { test, expect } from '@playwright/test';
import {
  archiveEntity,
  createCompanyApi,
  createOrderApi,
  getOrderApi,
  loginApi,
  patchOrderApi,
} from '../helpers/api.js';
import { requireE2eQaCredentials, loadRepoEnv } from '../helpers/loadEnv.js';
import {
  CANONICAL_VAT_RATE,
  splitInclusiveUnitPrice,
  buildQuotationTaxSnapshot,
} from '../../../src/domain/order/taxPolicy.js';

loadRepoEnv();

/**
 * Formal / Informal pricing + VAT policy (DDL-18B).
 * Market prices VAT-inclusive; BE authoritative validate/recompute.
 */

test('Nabz formal/informal pricing + tax tamper + supplier gate', async ({ request }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const { username, password } = requireE2eQaCredentials();
  const { token } = await loginApi(request, username, password);

  // Canonical inclusive math — 800k incl ≠ 880k
  const split = splitInclusiveUnitPrice({ sellingPriceInclVat: 800_000, qty: 1 });
  expect(split.ok).toBe(true);
  expect(split.grandTotal).toBe(800_000);
  expect(split.unitExVat).toBe(Math.round(800_000 / (1 + CANONICAL_VAT_RATE)));
  expect(split.grandTotal).not.toBe(880_000);

  const formalSnap = buildQuotationTaxSnapshot({
    isOfficial: true,
    lines: [{ sellingPriceInclVat: 800_000, qty: 1, supplyType: 'رسمی' }],
  });
  expect(formalSnap.ok).toBe(true);
  expect(formalSnap.snapshot.grandTotal).toBe(800_000);
  expect(formalSnap.snapshot.vatAmount).toBe(800_000 - formalSnap.snapshot.subtotalExVat);

  const informalSnap = buildQuotationTaxSnapshot({
    isOfficial: false,
    saleType: 'غیررسمی',
    lines: [{ sellingPriceInclVat: 800_000, qty: 1, supplyType: 'غیررسمی' }],
  });
  expect(informalSnap.ok).toBe(true);
  expect(informalSnap.snapshot.vatAmount).toBe(0);
  expect(informalSnap.snapshot.grandTotal).toBe(800_000);

  const moghayer = buildQuotationTaxSnapshot({
    isOfficial: true,
    lines: [{ sellingPriceInclVat: 100, qty: 1, supplyType: 'مغایرت' }],
  });
  expect(moghayer.ok).toBe(false);
  expect(moghayer.code).toBe('TAX_MOGHAYER_UNALLOCATED');

  const co = await createCompanyApi(request, token, {
    name: `E2E-NABZ-VAT-${stamp}`,
    entityType: 'CUSTOMER',
    nationalId: `4${String(stamp).slice(-10)}`,
    payload: { personType: 'legal', recordType: 'CUSTOMER' },
  });
  expect(co.status).toBeLessThan(300);
  const companyId = co.json.company.id;

  const formal = await createOrderApi(request, token, {
    companyId,
    title: `E2E-NABZ-FORMAL-${stamp}`,
    code: `JR-VAT-F-${stamp}`,
    payload: {
      saleType: 'رسمی',
      isOfficial: true,
      items: [{
        name: 'ورق تست',
        qty: 1,
        unit: 'تن',
        unitPrice: 800_000,
        sellingPriceInclVat: 800_000,
        supplyType: 'رسمی',
      }],
      quotingSnapshot: formalSnap.snapshot,
    },
  });
  expect(formal.status).toBeLessThan(300);
  const formalId = formal.json.order.id;
  const fPayload = formal.json.order.payload || {};
  expect(fPayload.quotingSnapshot?.grandTotal).toBe(800_000);
  expect(fPayload.quotingSnapshot?.vatRate).toBe(0.1);

  const informal = await createOrderApi(request, token, {
    companyId,
    title: `E2E-NABZ-INFORMAL-${stamp}`,
    code: `JR-VAT-I-${stamp}`,
    payload: {
      saleType: 'غیررسمی',
      isOfficial: false,
      items: [{
        name: 'نبشی',
        qty: 1,
        unitPrice: 800_000,
        sellingPriceInclVat: 800_000,
        supplyType: 'غیررسمی',
      }],
      quotingSnapshot: informalSnap.snapshot,
    },
  });
  expect(informal.status).toBeLessThan(300);
  expect(informal.json.order.payload?.quotingSnapshot?.vatAmount).toBe(0);

  // Persist + hard refresh
  const f2 = await getOrderApi(request, token, formalId);
  expect(f2.json.order.payload.quotingSnapshot?.grandTotal).toBe(800_000);

  // Tax tamper reject
  const tamper = await patchOrderApi(request, token, formalId, {
    version: f2.json.order.version,
    payload: {
      ...f2.json.order.payload,
      items: f2.json.order.payload.items,
      quotingSnapshot: {
        vatRate: 0.1,
        economicTotal: 800_000,
        grandTotal: 880_000,
        vatAmount: 80_000,
      },
    },
  });
  expect(tamper.status).toBe(409);
  expect(String(tamper.json?.error || '')).toMatch(/TAX_TAMPER/);

  // Supplier-only gate
  const sup = await createCompanyApi(request, token, {
    name: `E2E-NABZ-SUP-${stamp}`,
    entityType: 'SUPPLIER',
    nationalId: `5${String(stamp).slice(-10)}`,
    payload: { personType: 'legal', recordType: 'SUPPLIER' },
  });
  expect(sup.status).toBeLessThan(300);
  const blocked = await createOrderApi(request, token, {
    companyId: sup.json.company.id,
    title: `E2E-NABZ-SUP-ORD-${stamp}`,
    code: `JR-VAT-S-${stamp}`,
  });
  expect(blocked.status).toBe(409);
  expect(String(blocked.json?.error || '')).toMatch(/ORDER_SUPPLIER_ONLY/);

  // BOTH allowed
  const both = await createCompanyApi(request, token, {
    name: `E2E-NABZ-BOTH-${stamp}`,
    entityType: 'BOTH',
    nationalId: `6${String(stamp).slice(-10)}`,
    payload: { personType: 'legal', recordType: 'CUSTOMER' },
  });
  expect(both.status).toBeLessThan(300);
  const bothOrd = await createOrderApi(request, token, {
    companyId: both.json.company.id,
    title: `E2E-NABZ-BOTH-ORD-${stamp}`,
    code: `JR-VAT-B-${stamp}`,
  });
  expect(bothOrd.status).toBeLessThan(300);

  console.log('[e2e-nabz-pricing] PASS', JSON.stringify({
    formalId,
    companyId,
    roundingRule: formalSnap.snapshot.roundingRule,
    moghayer: 'PRODUCT DECISION REQUIRED — MOGHAYER ALLOCATION RULES',
  }));

  await archiveEntity(request, token, 'order', formalId).catch(() => {});
  await archiveEntity(request, token, 'order', informal.json.order.id).catch(() => {});
  await archiveEntity(request, token, 'order', bothOrd.json.order.id).catch(() => {});
  await archiveEntity(request, token, 'company', companyId).catch(() => {});
  await archiveEntity(request, token, 'company', sup.json.company.id).catch(() => {});
  await archiveEntity(request, token, 'company', both.json.company.id).catch(() => {});
});
