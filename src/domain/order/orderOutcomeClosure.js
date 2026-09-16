/**
 * Order lifecycle SSOT — stage / outcome / closure — DDL-18(B) CANONICAL.
 * Do NOT revert to DDL-18(A). SUCCESS ≠ CLOSED. Purchase = becoming SUCCESS.
 */

export const ORDER_CLOSURE = Object.freeze({ OPEN: 'open', CLOSED: 'closed' });


export const ORDER_STATUS = Object.freeze({
  CURRENT: 'current',
  SUCCESS: 'success',
  FAILED: 'failed',
});

export const STAGE = Object.freeze({
  KAVOSH: 1,
  MOZENE: 2,
  PISHKESH: 3,
  PARVANE: 4,
  TADAROK: 5,
  LEGACY_TAJHIZ: 6,
  RAHESPAR: 7,
  SARANJAM: 8,
});

export const PHASE1_STAGE_IDS = Object.freeze([STAGE.KAVOSH, STAGE.MOZENE, STAGE.PISHKESH]);
export const PHASE2_STAGE_IDS = Object.freeze([
  STAGE.PARVANE,
  STAGE.TADAROK,
  STAGE.RAHESPAR,
  STAGE.SARANJAM,
]);

export const MOZENE_LOCKED_MESSAGE =
  'ورود به مرحله مظنه فقط پس از تکمیل استعلام همه سطرها و کلیک دکمه «تکمیل کاوش» امکان‌پذیر است.';

export const ORDER_RULE_MESSAGES = Object.freeze({
  INVALID_ORDER_STAGE_TRANSITION:
    'انتقال سفارش از این مرحله به مرحله انتخاب‌شده مجاز نیست.',
  INVALID_ORDER_STATUS_TRANSITION:
    'تغییر وضعیت سفارش به مقدار انتخاب‌شده مجاز نیست.',
  ORDER_MOZENE_LOCKED: MOZENE_LOCKED_MESSAGE,
  ORDER_COMPLETION_REJECTED:
    'شرایط لازم برای تکمیل / تایید فروش سفارش برقرار نیست.',
  ORDER_FAIL_REASON_REQUIRED:
    'برای بستن ناموفق سفارش، علت شکست الزامی است.',
  ORDER_ARCHIVE_GATES_INCOMPLETE:
    'بایگانی سفارش فقط پس از تکمیل دروازه‌های سرانجام (فاکتورها و تسویه) مجاز است.',
  ORDER_STAGE_UNKNOWN: 'شناسه مرحله سفارش نامعتبر است.',
  ORDER_STATUS_UNKNOWN: 'وضعیت سفارش نامعتبر است.',
  ORDER_PHASE2_COMMITMENT_REQUIRED:
    'ورود به فاز عملیات فقط پس از تایید دروازه / ماشه مجاز است.',
});

const STAGE_ALIASES = Object.freeze({
  inquiry: STAGE.KAVOSH,
  kavosh: STAGE.KAVOSH,
  quoting: STAGE.MOZENE,
  mozene: STAGE.MOZENE,
  proforma: STAGE.PISHKESH,
  pishkesh: STAGE.PISHKESH,
  parvane: STAGE.PARVANE,
  tadarok: STAGE.TADAROK,
  tajhiz: STAGE.RAHESPAR,
  rahespar: STAGE.RAHESPAR,
  saranjam: STAGE.SARANJAM,
  complete: STAGE.SARANJAM,
});

const STATUS_ALIASES = Object.freeze({
  open: ORDER_STATUS.CURRENT,
  current: ORDER_STATUS.CURRENT,
  success: ORDER_STATUS.SUCCESS,
  failed: ORDER_STATUS.FAILED,
});

function fail(code, details = {}) {
  return {
    ok: false,
    code,
    message: ORDER_RULE_MESSAGES[code] || code,
    details,
  };
}

function ok(extra = {}) {
  return { ok: true, ...extra };
}

/** @returns {number|null} */
export function normalizeStageId(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const n = Math.trunc(raw);
    if (n === STAGE.LEGACY_TAJHIZ) return STAGE.RAHESPAR;
    if (PHASE1_STAGE_IDS.includes(n) || PHASE2_STAGE_IDS.includes(n)) return n;
    return null;
  }
  const s = String(raw).trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(STAGE_ALIASES, s)) {
    return STAGE_ALIASES[s];
  }
  const n = Number(s);
  if (Number.isFinite(n)) return normalizeStageId(n);
  return null;
}

/** Persist as string for TEXT stage_id column */
export function stageIdToStorage(stageId) {
  const n = normalizeStageId(stageId);
  return n == null ? null : String(n);
}

/** @returns {string|null} */
export function normalizeStatus(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(STATUS_ALIASES, s)) {
    return STATUS_ALIASES[s];
  }
  return null;
}
const CLOSURE_ALIASES = Object.freeze({ open: 'open', closed: 'closed' });
export function normalizeClosure(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(CLOSURE_ALIASES, s)) return CLOSURE_ALIASES[s];
  return null;
}
function isSaranjamFinallyClosedLocal(order = {}) {
  const saranjam = order.saranjam || {};
  return Boolean(saranjam.archivedAt || saranjam.locked || order.archivedAt);
}
export function resolveClosure(order = {}) {
  const explicit = normalizeClosure(order.closure);
  if (explicit) return explicit;
  if (isSaranjamFinallyClosedLocal(order)) return ORDER_CLOSURE.CLOSED;
  return ORDER_CLOSURE.OPEN;
}
export function isOrderClosed(order = {}) {
  return resolveClosure(order) === ORDER_CLOSURE.CLOSED;
}
export function resolveOrderViewTab(order = {}) {
  const outcome = normalizeStatus(order.status) || ORDER_STATUS.CURRENT;
  const closure = resolveClosure(order);
  if (outcome === ORDER_STATUS.FAILED) return 'failed';
  if (outcome === ORDER_STATUS.SUCCESS && closure === ORDER_CLOSURE.CLOSED) return 'closed';
  if (outcome === ORDER_STATUS.SUCCESS) return 'success';
  return 'current';
}

export function isPhase1Stage(stageId) {
  const n = normalizeStageId(stageId);
  return n != null && PHASE1_STAGE_IDS.includes(n);
}

export function isPhase2Stage(stageId) {
  const n = normalizeStageId(stageId);
  return n != null && (PHASE2_STAGE_IDS.includes(n) || n === STAGE.LEGACY_TAJHIZ);
}

export function isActivePhase2Stage(stageId) {
  const n = normalizeStageId(stageId);
  return n != null && PHASE2_STAGE_IDS.includes(n);
}

/**
 * DDL-18(B) Phase-2 commitment signal — independent of status=success.
 * status=success is reserved for final Successful Purchase close.
 */
export function isPhase2Committed(order = {}) {
  if (normalizeStatus(order.status) === ORDER_STATUS.SUCCESS) return true;
  if (order.phase2EnteredAt) return true;
  if (String(order.gatewayDecision?.outcome || '').toLowerCase() === 'success') return true;
  return false;
}

export function hasInquiryCompletionEvent(order = {}) {
  if (order.proformaUpdate) return false;
  return Boolean(order.inquiryCompletedAt)
    || (order.events || []).some((event) => event.type === 'inquiry_order_completed');
}

/** Mirror of quotingService.canCompleteOrderInquiries — items only */
export function canCompleteOrderInquiries(order = {}) {
  const items = order.items || [];
  if (!items.length) return false;

  const baseline = order.proformaUpdate?.baselineInquiryIds;
  if (baseline) {
    return items.every((item, index) => {
      const prior = new Set(baseline[index] || baseline[String(index)] || []);
      return (item.inquiries || []).some((inq) => !prior.has(inq.id));
    });
  }

  return items.every((item) => (item.inquiries || []).length > 0);
}

export function canEnterMozeneStage(order = {}) {
  return canCompleteOrderInquiries(order) && hasInquiryCompletionEvent(order);
}

/**
 * Settlement archive gates — mirror SaranjamTab.evaluateSaranjamGates (strict UI).
 */
export function evaluateSaranjamArchiveGates(saranjam = {}) {
  const items = saranjam.items || [];
  const supplierLedgers = saranjam.supplierLedgers || saranjam.supplierPayments || [];
  const allPurchaseInvoicesUploaded = items.length > 0
    && items.every((item) => item.invoiceUploaded);
  const salesInvoiceIssued = Boolean(saranjam.salesInvoiceIssued);
  const customerBalanceZero = Number(saranjam.customerBalanceRial ?? 0) === 0;
  const allSupplierBalancesZero = supplierLedgers.length > 0
    && supplierLedgers.every((s) => Number(s.balanceRial ?? s.balance ?? 0) === 0);

  const canArchive = allPurchaseInvoicesUploaded
    && salesInvoiceIssued
    && customerBalanceZero
    && allSupplierBalancesZero;

  return {
    allPurchaseInvoicesUploaded,
    salesInvoiceIssued,
    customerBalanceZero,
    allSupplierBalancesZero,
    canArchive,
  };
}

function isSaranjamFinallyClosed(order = {}) {
  const saranjam = order.saranjam || {};
  return Boolean(saranjam.archivedAt || saranjam.locked || order.archivedAt);
}

/**
 * Allowed stage transitions (DDL-18B).
 *
 * Phase1 (current, not Phase-2 committed): among {1,3} free; →2 if mozene unlocked.
 * Phase2 (current + committed): active phase2 ↔ active phase2; return → پیش‌کش allowed.
 * SUCCESS (final close): stage locked.
 * FAILED: locked.
 */
export function evaluateStageTransition({
  fromStage,
  toStage,
  status,
  order = {},
} = {}) {
  const from = normalizeStageId(fromStage);
  const to = normalizeStageId(toStage);
  const st = normalizeStatus(status) || ORDER_STATUS.CURRENT;

  if (from == null || to == null) {
    return fail('ORDER_STAGE_UNKNOWN', { from: fromStage, to: toStage });
  }
  if (from === to) return ok({ from, to, status: st });

  if (st === ORDER_STATUS.FAILED) {
    return fail('INVALID_ORDER_STAGE_TRANSITION', { from, to, status: st });
  }

  if (resolveClosure(order) === ORDER_CLOSURE.CLOSED) {
    return fail('INVALID_ORDER_STAGE_TRANSITION', { from, to, status: st, reason: 'closed_locked' });
  }
  const committed = isPhase2Committed({ ...order, status: st });
  if (committed && st === ORDER_STATUS.SUCCESS) {
    if (isActivePhase2Stage(to)) {
      return ok({ from, to, status: st, phase2: true });
    }
    // Return to پیش‌کش (clear commitment expected in same PATCH payload)
    if (to === STAGE.PISHKESH) {
      return ok({ from, to, status: st, kind: 'parvane_return' });
    }
    return fail('INVALID_ORDER_STAGE_TRANSITION', {
      from,
      to,
      status: st,
      reason: 'invalid_phase2_target',
    });
  }

  if (isPhase2Stage(to)) {
    return fail('ORDER_PHASE2_COMMITMENT_REQUIRED', {
      from, to, status: st,
      reason: st === ORDER_STATUS.CURRENT ? 'phase2_requires_success_outcome' : 'phase2_requires_commitment',
    });
  }

  // Phase1
  if (to === STAGE.MOZENE) {
    if (!canEnterMozeneStage(order)) {
      return fail('ORDER_MOZENE_LOCKED', { from, to, status: st });
    }
    return ok({ from, to, status: st });
  }

  if (!isPhase1Stage(to)) {
    return fail('INVALID_ORDER_STAGE_TRANSITION', { from, to, status: st });
  }

  return ok({ from, to, status: st });
}

/**
 * Status lifecycle (DDL-18B).
 *
 * current → success = final Successful Purchase (saranjam closed)
 * current → failed  = unsuccessful close (reason required; phase1 or phase2)
 * success / failed  = terminal (no reopen)
 */
export function evaluateStatusTransition({
  fromStatus,
  toStatus,
  fromStage,
  toStage,
  order = {},
} = {}) {
  const from = normalizeStatus(fromStatus);
  const to = normalizeStatus(toStatus);
  const stageFrom = normalizeStageId(fromStage);
  const stageTo = normalizeStageId(toStage ?? fromStage);

  if (from == null || to == null) {
    return fail('ORDER_STATUS_UNKNOWN', { from: fromStatus, to: toStatus });
  }
  if (from === to) return ok({ from, to, stageFrom, stageTo });

  if (from === ORDER_STATUS.FAILED) {
    return fail('INVALID_ORDER_STATUS_TRANSITION', {
      from,
      to,
      reason: 'terminal',
    });
  }

  if (from === ORDER_STATUS.SUCCESS) {
    return fail('INVALID_ORDER_STATUS_TRANSITION', {
      from,
      to,
      reason: 'terminal_success',
    });
  }

  if (from === ORDER_STATUS.CURRENT && to === ORDER_STATUS.SUCCESS) {
    const committed = String(order.gatewayDecision?.outcome || '').toLowerCase() === 'success'
      || Boolean(order.phase2EnteredAt);
    if (!committed) {
      return fail('ORDER_COMPLETION_REJECTED', {
        from, to, stageFrom, stageTo, reason: 'gateway_commitment_required',
      });
    }
    return ok({ from, to, stageFrom, stageTo, closure: ORDER_CLOSURE.OPEN, kind: 'successful_purchase' });
  }

  if (from === ORDER_STATUS.CURRENT && to === ORDER_STATUS.FAILED) {
    const reason = String(
      order.failReason
      || order.failureReason
      || order.gatewayDecision?.failReason
      || order.gatewayDecision?.cancelReason
      || '',
    ).trim();
    if (!reason) {
      return fail('ORDER_FAIL_REASON_REQUIRED', {
        from,
        to,
        reason: 'fail_reason_required',
      });
    }
    return ok({ from, to, stageFrom, stageTo, kind: 'fail' });
  }

  return fail('INVALID_ORDER_STATUS_TRANSITION', { from, to });
}

export function evaluateClosureTransition({ fromClosure, toClosure, status, order = {} } = {}) {
  const from = normalizeClosure(fromClosure) || ORDER_CLOSURE.OPEN;
  const to = normalizeClosure(toClosure);
  const st = normalizeStatus(status) || ORDER_STATUS.CURRENT;
  if (to == null) return fail('ORDER_CLOSURE_UNKNOWN', { from: fromClosure, to: toClosure });
  if (from === to) return ok({ from, to, status: st });
  if (from === ORDER_CLOSURE.CLOSED) return fail('INVALID_ORDER_CLOSURE_TRANSITION', { from, to, reason: 'closed_terminal' });
  if (to === ORDER_CLOSURE.CLOSED) {
    if (st !== ORDER_STATUS.SUCCESS) return fail('INVALID_ORDER_CLOSURE_TRANSITION', { from, to, status: st, reason: 'closure_requires_success_outcome' });
    if (!isSaranjamFinallyClosed(order) && !isSaranjamFinallyClosedLocal(order)) {
      return fail('ORDER_ARCHIVE_GATES_INCOMPLETE', { from, to, reason: 'saranjam_final_close_required' });
    }
    return ok({ from, to, status: st, kind: 'final_close' });
  }
  return fail('INVALID_ORDER_CLOSURE_TRANSITION', { from, to });
}

/**
 * Full PATCH guard: validate stage/status/closure changes against current row + patch.
 * @returns {{ ok: true, nextStage: string, nextStatus: string, audits: object[] } | { ok: false, code, message, details }}
 */
export function evaluateOrderLifecyclePatch({
  currentStageId, currentStatus, currentClosure, nextStageId, nextStatus, nextClosure, orderView = {},
} = {}) {
  const fromStage = normalizeStageId(currentStageId) ?? STAGE.KAVOSH;
  const fromStatus = normalizeStatus(currentStatus) ?? ORDER_STATUS.CURRENT;
  const fromClosure = normalizeClosure(currentClosure) ?? resolveClosure({ ...orderView, status: fromStatus, closure: currentClosure });
  const stageProvided = nextStageId !== undefined && nextStageId !== null && nextStageId !== '';
  const statusProvided = nextStatus !== undefined && nextStatus !== null && nextStatus !== '';
  const closureProvided = nextClosure !== undefined && nextClosure !== null && nextClosure !== '';
  let toStage = stageProvided ? normalizeStageId(nextStageId) : fromStage;
  let toStatus = statusProvided ? normalizeStatus(nextStatus) : fromStatus;
  let toClosure = closureProvided ? normalizeClosure(nextClosure) : fromClosure;

  if (stageProvided && toStage == null) {
    return fail('ORDER_STAGE_UNKNOWN', { to: nextStageId });
  }
  if (statusProvided && toStatus == null) {
    return fail('ORDER_STATUS_UNKNOWN', { to: nextStatus });
  }

  if (!closureProvided && fromClosure === ORDER_CLOSURE.OPEN
    && (isSaranjamFinallyClosed(orderView) || isSaranjamFinallyClosedLocal(orderView))
    && !isSaranjamFinallyClosed({ saranjam: orderView._previousSaranjam, archivedAt: orderView._previousArchivedAt })) {
    toClosure = ORDER_CLOSURE.CLOSED;
  }
  if (statusProvided && fromStatus === ORDER_STATUS.CURRENT && toStatus === ORDER_STATUS.SUCCESS && !stageProvided) toStage = STAGE.PARVANE;
  if (toClosure === ORDER_CLOSURE.CLOSED && fromClosure === ORDER_CLOSURE.OPEN && !stageProvided) toStage = STAGE.SARANJAM;
  const audits = [];
  const viewForRules = { ...orderView, status: toStatus, closure: toClosure };
  if (toStatus !== fromStatus) {
    const st = evaluateStatusTransition({ fromStatus, toStatus, fromStage, toStage, order: viewForRules });
    if (!st.ok) return st;
    audits.push({ action: st.kind === 'successful_purchase' ? 'order.complete' : 'order.status_change', from: fromStatus, to: toStatus });
  }
  if (toClosure !== fromClosure) {
    const cl = evaluateClosureTransition({ fromClosure, toClosure, status: toStatus, order: viewForRules });
    if (!cl.ok) return cl;
    audits.push({ action: 'order.closure_change', from: fromClosure, to: toClosure });
  }
  if (toStage !== fromStage) {
    const st = evaluateStageTransition({ fromStage, toStage, status: toStatus, order: viewForRules });
    if (!st.ok) return st;
    audits.push({ action: 'order.stage_change', from: fromStage, to: toStage });
  }
  return ok({ nextStage: String(toStage), nextStatus: toStatus, nextClosure: toClosure, fromStage, fromStatus, fromClosure, audits });
}

export function evaluateArchiveAllowed(orderView = {}) {
  const saranjam = orderView.saranjam;
  if (!saranjam || typeof saranjam !== 'object') {
    return ok({ skipped: true });
  }
  if (saranjam.archivedAt || saranjam.locked) {
    return ok({ alreadyArchived: true });
  }
  const started = Boolean(
    (saranjam.items && saranjam.items.length)
    || saranjam.salesInvoiceIssued
    || (saranjam.customerPayments && saranjam.customerPayments.length)
    || (saranjam.supplierPayments && saranjam.supplierPayments.length),
  );
  if (!started) return ok({ skipped: true });

  const gates = evaluateSaranjamArchiveGates(saranjam);
  if (!gates.canArchive) {
    return fail('ORDER_ARCHIVE_GATES_INCOMPLETE', { gates });
  }
  return ok({ gates });
}

export function buildOrderViewFromRow(row, patch = {}) {
  const basePayload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
  const patchPayload = patch.payload && typeof patch.payload === 'object' ? patch.payload : {};
  const payload = { ...basePayload, ...patchPayload };
  return {
    ...payload,
    stageId: patch.stageId !== undefined ? patch.stageId : row?.stage_id,
    status: patch.status !== undefined ? patch.status : row?.status,
    closure: patchPayload.closure !== undefined ? patchPayload.closure : (payload.closure ?? null),
    items: payload.items || [],
    inquiryCompletedAt: payload.inquiryCompletedAt ?? null,
    events: payload.events || [],
    proforma: payload.proforma,
    proformaUpdate: payload.proformaUpdate,
    gatewayDecision: Object.prototype.hasOwnProperty.call(patchPayload, 'gatewayDecision')
      ? patchPayload.gatewayDecision
      : payload.gatewayDecision,
    phase2EnteredAt: Object.prototype.hasOwnProperty.call(patchPayload, 'phase2EnteredAt')
      ? patchPayload.phase2EnteredAt
      : payload.phase2EnteredAt,
    quoting: payload.quoting,
    saranjam: payload.saranjam,
    archivedAt: payload.archivedAt ?? null,
    failReason: payload.failReason ?? payload.failureReason ?? null,
    failureReason: payload.failureReason ?? payload.failReason ?? null,
  };
}

export default {
  ORDER_STATUS, ORDER_CLOSURE, STAGE, normalizeStageId, normalizeStatus, normalizeClosure,
  stageIdToStorage, isPhase2Committed, resolveClosure, isOrderClosed, resolveOrderViewTab,
  evaluateStageTransition, evaluateStatusTransition, evaluateClosureTransition,
  evaluateOrderLifecyclePatch, evaluateArchiveAllowed, canEnterMozeneStage,
  evaluateSaranjamArchiveGates, buildOrderViewFromRow, ORDER_RULE_MESSAGES,
};
