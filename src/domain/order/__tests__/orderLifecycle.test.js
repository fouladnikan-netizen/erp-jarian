import { describe, it, expect } from 'vitest';
import {
  STAGE,
  ORDER_STATUS,
  ORDER_CLOSURE,
  normalizeStageId,
  normalizeStatus,
  normalizeClosure,
  isPhase2Committed,
  resolveOrderViewTab,
  evaluateStageTransition,
  evaluateStatusTransition,
  evaluateClosureTransition,
  evaluateOrderLifecyclePatch,
  evaluateArchiveAllowed,
  canEnterMozeneStage,
} from '../orderLifecycle.js';
import {
  CANONICAL_VAT_RATE,
  splitInclusiveUnitPrice,
  buildQuotationTaxSnapshot,
  validateTaxSnapshotAgainstPolicy,
} from '../taxPolicy.js';

describe('orderLifecycle normalize (DDL-18B)', () => {
  it('maps aliases and legacy tajhiz', () => {
    expect(normalizeStageId('inquiry')).toBe(STAGE.KAVOSH);
    expect(normalizeStageId(6)).toBe(STAGE.RAHESPAR);
    expect(normalizeStatus('open')).toBe(ORDER_STATUS.CURRENT);
    expect(normalizeClosure('CLOSED')).toBe(ORDER_CLOSURE.CLOSED);
  });

  it('derives UI four views', () => {
    expect(resolveOrderViewTab({ status: 'current' })).toBe('current');
    expect(resolveOrderViewTab({ status: 'success', closure: 'open' })).toBe('success');
    expect(resolveOrderViewTab({ status: 'failed' })).toBe('failed');
    expect(resolveOrderViewTab({ status: 'success', saranjam: { archivedAt: 'x', locked: true } })).toBe('closed');
  });
});

describe('orderLifecycle stage matrix (DDL-18B)', () => {
  const readyMozene = { inquiryCompletedAt: '1404/01/01', items: [{ inquiries: [{ id: 1 }] }] };
  const committed = { phase2EnteredAt: '1404/01/01', gatewayDecision: { outcome: 'success' }, closure: 'open' };

  it('allows phase1 1↔3', () => {
    expect(evaluateStageTransition({ fromStage: 1, toStage: 3, status: 'current', order: {} }).ok).toBe(true);
  });
  it('rejects mozene without completion', () => {
    const r = evaluateStageTransition({ fromStage: 1, toStage: 2, status: 'current', order: { items: [] } });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('ORDER_MOZENE_LOCKED');
  });
  it('allows mozene when unlocked', () => {
    expect(canEnterMozeneStage(readyMozene)).toBe(true);
  });
  it('rejects phase2 stage while CURRENT', () => {
    const r = evaluateStageTransition({ fromStage: 3, toStage: 4, status: 'current', order: committed });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('ORDER_PHASE2_COMMITMENT_REQUIRED');
  });
  it('allows phase2 jumps when SUCCESS + OPEN', () => {
    expect(evaluateStageTransition({ fromStage: 4, toStage: 8, status: 'success', order: committed }).ok).toBe(true);
  });
  it('locks stage when CLOSED', () => {
    expect(evaluateStageTransition({
      fromStage: 8, toStage: 5, status: 'success',
      order: { ...committed, closure: 'closed', saranjam: { archivedAt: 'x', locked: true } },
    }).ok).toBe(false);
  });
  it('locks stage when failed', () => {
    expect(evaluateStageTransition({ fromStage: 2, toStage: 1, status: 'failed', order: {} }).ok).toBe(false);
  });
});

describe('orderLifecycle outcome + closure (DDL-18B)', () => {
  it('current→success requires gateway commitment (not saranjam)', () => {
    expect(evaluateStatusTransition({
      fromStatus: 'current', toStatus: 'success', fromStage: 3, toStage: 4,
      order: { gatewayDecision: { outcome: 'success' }, phase2EnteredAt: 'now' },
    }).ok).toBe(true);
    expect(evaluateStatusTransition({
      fromStatus: 'current', toStatus: 'success', fromStage: 8, toStage: 8,
      order: { saranjam: { archivedAt: 'x', locked: true } },
    }).code).toBe('ORDER_COMPLETION_REJECTED');
  });
  it('success outcome is terminal; final close uses closure', () => {
    expect(evaluateStatusTransition({
      fromStatus: 'success', toStatus: 'current', fromStage: 8, toStage: 3, order: {},
    }).ok).toBe(false);
    expect(evaluateClosureTransition({
      fromClosure: 'open', toClosure: 'closed', status: 'success',
      order: { saranjam: { archivedAt: 'x', locked: true } },
    }).ok).toBe(true);
  });
  it('failed is terminal', () => {
    expect(evaluateStatusTransition({
      fromStatus: 'failed', toStatus: 'current', fromStage: 1, toStage: 1,
      order: { failReason: 'قیمت' },
    }).ok).toBe(false);
  });
  it('current→failed requires failReason', () => {
    expect(evaluateStatusTransition({
      fromStatus: 'current', toStatus: 'failed', fromStage: 1, toStage: 1, order: {},
    }).code).toBe('ORDER_FAIL_REASON_REQUIRED');
  });
});

describe('orderLifecycle PATCH + archive + tax', () => {
  it('evaluateArchiveAllowed incomplete saranjam', () => {
    expect(evaluateArchiveAllowed({
      saranjam: { items: [{ invoiceUploaded: false }], salesInvoiceIssued: false },
    }).ok).toBe(false);
  });
  it('PATCH gateway enter ⇒ SUCCESS + OPEN', () => {
    const r = evaluateOrderLifecyclePatch({
      currentStageId: 3, currentStatus: 'current', currentClosure: 'open',
      nextStageId: 4, nextStatus: 'success', nextClosure: 'open',
      orderView: {
        gatewayDecision: { outcome: 'success' }, phase2EnteredAt: 'now',
        proforma: { signed: true }, closure: 'open',
      },
    });
    expect(r.ok).toBe(true);
    expect(r.nextStatus).toBe('success');
    expect(r.nextClosure).toBe('open');
  });
  it('VAT-inclusive formal never adds 10% on top', () => {
    const split = splitInclusiveUnitPrice({ sellingPriceInclVat: 800_000, qty: 1 });
    expect(split.ok).toBe(true);
    expect(split.grandTotal).toBe(800_000);
    expect(split.unitExVat).toBe(Math.round(800_000 / (1 + CANONICAL_VAT_RATE)));
    const snap = buildQuotationTaxSnapshot({
      saleType: 'رسمی', isOfficial: true,
      lines: [{ sellingPriceInclVat: 800_000, qty: 1, supplyType: 'رسمی' }],
    });
    expect(snap.ok).toBe(true);
    expect(snap.snapshot.grandTotal).toBe(800_000);
    const tamper = validateTaxSnapshotAgainstPolicy(
      { quotingSnapshot: { ...snap.snapshot, grandTotal: 880_000 } },
      snap.snapshot,
    );
    expect(tamper.ok).toBe(false);
    expect(tamper.code).toBe('TAX_TAMPER_REJECTED');
  });
});
