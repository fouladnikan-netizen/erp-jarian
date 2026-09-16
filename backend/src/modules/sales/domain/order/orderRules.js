/**
 * Backend Order rule enforcement — throws AppError.
 * Pure logic SSOT: src/domain/order/orderOutcomeClosure.js (DDL-18B)
 */
import { appError } from '../../../../lib/errors.js';
import {
  evaluateOrderLifecyclePatch,
  evaluateArchiveAllowed,
  normalizeStageId,
  normalizeStatus,
  normalizeClosure,
  resolveClosure,
  stageIdToStorage,
  buildOrderViewFromRow,
  ORDER_STATUS,
  ORDER_CLOSURE,
  STAGE,
} from '../../../../../../src/domain/order/orderOutcomeClosure.js';

export {
  normalizeStageId,
  normalizeStatus,
  normalizeClosure,
  resolveClosure,
  stageIdToStorage,
  buildOrderViewFromRow,
  ORDER_STATUS,
  ORDER_CLOSURE,
  STAGE,
};

function throwRule(result) {
  const status = result.code === 'ORDER_STAGE_UNKNOWN'
    || result.code === 'ORDER_STATUS_UNKNOWN'
    || result.code === 'ORDER_CLOSURE_UNKNOWN'
    ? 400
    : 409;
  throw appError(result.code, result.message, status, result.details);
}

export function assertOrderLifecycleUpdate(row, patch = {}) {
  const orderView = buildOrderViewFromRow(row, patch);
  const nextSaranjam = orderView.saranjam;
  const prevSaranjam = row.payload?.saranjam;
  const locking = Boolean(nextSaranjam?.archivedAt || nextSaranjam?.locked || orderView.archivedAt);
  const wasLocked = Boolean(prevSaranjam?.archivedAt || prevSaranjam?.locked || row.payload?.archivedAt);
  const fromClosure = resolveClosure(buildOrderViewFromRow(row, {}));

  let effectivePatch = { ...patch };
  const patchPayload = patch.payload && typeof patch.payload === 'object' ? { ...patch.payload } : null;

  if (locking && !wasLocked && normalizeStatus(row.status) === ORDER_STATUS.SUCCESS) {
    effectivePatch = {
      ...patch,
      payload: {
        ...(row.payload || {}),
        ...(patchPayload || {}),
        closure: ORDER_CLOSURE.CLOSED,
      },
      status: patch.status !== undefined && patch.status !== null && patch.status !== ''
        ? patch.status
        : ORDER_STATUS.SUCCESS,
      stageId: patch.stageId !== undefined ? patch.stageId : STAGE.SARANJAM,
    };
  }

  const result = evaluateOrderLifecyclePatch({
    currentStageId: row.stage_id,
    currentStatus: row.status,
    currentClosure: fromClosure,
    nextStageId: effectivePatch.stageId,
    nextStatus: effectivePatch.status,
    nextClosure: effectivePatch.payload?.closure,
    orderView: {
      ...buildOrderViewFromRow(row, effectivePatch),
      _previousSaranjam: prevSaranjam,
      _previousArchivedAt: row.payload?.archivedAt,
    },
  });
  if (!result.ok) throwRule(result);

  if (locking && !wasLocked) {
    const arch = evaluateArchiveAllowed({
      ...orderView,
      saranjam: { ...nextSaranjam, archivedAt: null, locked: false },
    });
    if (!arch.ok) throwRule(arch);
  }

  const basePayload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const incomingPayload = effectivePatch.payload && typeof effectivePatch.payload === 'object'
    ? effectivePatch.payload
    : null;
  const mergedPayload = incomingPayload
    ? { ...basePayload, ...incomingPayload, closure: result.nextClosure }
    : (result.nextClosure !== fromClosure
      ? { ...basePayload, closure: result.nextClosure }
      : null);

  return {
    stageId: result.nextStage,
    status: result.nextStatus,
    payload: mergedPayload,
    audits: result.audits || [],
  };
}

export function assertOrderArchiveAllowed(row) {
  const orderView = buildOrderViewFromRow(row, {});
  const result = evaluateArchiveAllowed(orderView);
  if (!result.ok) throwRule(result);
  return result;
}

export function normalizeCreateDefaults(data) {
  const stageId = stageIdToStorage(data.stageId ?? STAGE.KAVOSH) || String(STAGE.KAVOSH);
  const status = normalizeStatus(data.status ?? ORDER_STATUS.CURRENT) || ORDER_STATUS.CURRENT;
  const payload = data.payload && typeof data.payload === 'object' ? { ...data.payload } : {};
  if (!normalizeClosure(payload.closure)) {
    payload.closure = ORDER_CLOSURE.OPEN;
  }
  return { ...data, stageId, status, payload };
}

export default {
  assertOrderLifecycleUpdate,
  assertOrderArchiveAllowed,
  normalizeCreateDefaults,
};
