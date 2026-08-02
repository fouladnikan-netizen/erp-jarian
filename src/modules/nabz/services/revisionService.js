/**
 * Nabz adapter for the domain Revision Engine.
 * Maps Nabz stageId ↔ domain OrderStatus and applies returns without new lifecycle states.
 */

import {
  clearRevisionRequired,
  getLatestRevision,
  isRevisionRequired,
  recordStageReturn,
} from '../../../domain/order/revisionEngine';
import { REVISION_REASON_LABELS } from '../../../domain/order/revision.constants';
import { CURRENT_USER } from '../constants';
import {
  STAGE_KAVOSH_ID,
  STAGE_MOZENE_ID,
  STAGE_PISHKESH_ID,
  STAGE_PARVANE_ID,
  STAGE_TADAROK_ID,
  STAGE_RAHESPAR_ID,
  STAGE_SARANJAM_ID,
  getStageLabel,
} from '../config';
import { getTodayJalali, getNowTimeFa } from '../dateUtils';

/** @typedef {import('../../domain/order/order.enums').OrderStatus} OrderStatus */
/** @typedef {import('../../domain/order/revision.enums').RevisionReasonCode} RevisionReasonCode */

/**
 * @param {number} stageId
 * @returns {import('../../domain/order/order.enums').OrderStatus}
 */
export function stageIdToOrderStatus(stageId) {
  switch (stageId) {
    case STAGE_KAVOSH_ID:
      return 'INQUIRY';
    case STAGE_MOZENE_ID:
      return 'PRICING';
    case STAGE_PISHKESH_ID:
      return 'PROFORMA';
    case STAGE_PARVANE_ID:
    case STAGE_TADAROK_ID:
      return 'PURCHASE';
    case STAGE_RAHESPAR_ID:
      return 'LOADING';
    case STAGE_SARANJAM_ID:
      return 'COMPLETED';
    default:
      return 'INQUIRY';
  }
}

/**
 * Apply Revision Engine on a return-to-previous-stage.
 * Caller already mutated stageId / pipeline bucket; this only adds revision metadata + event.
 *
 * @param {object} order
 * @param {{
 *   fromStageId: number,
 *   toStageId: number,
 *   reasonCode: RevisionReasonCode,
 *   reasonText?: string,
 *   returnedBy?: string,
 *   changesSummary?: string,
 * }} input
 */
export function applyRevisionReturn(order, input) {
  const reasonCode = input.reasonCode;
  if (!reasonCode) {
    throw new Error('applyRevisionReturn: reasonCode is required');
  }

  const returnedBy = input.returnedBy || CURRENT_USER;
  const previousStage = stageIdToOrderStatus(input.fromStageId);
  const returnedToStage = stageIdToOrderStatus(input.toStageId);
  const reasonLabel = REVISION_REASON_LABELS[reasonCode] || reasonCode;
  const reasonText = input.reasonText?.trim() || '';
  const fromLabel = getStageLabel(input.fromStageId);
  const toLabel = getStageLabel(input.toStageId);
  const changesSummary =
    input.changesSummary?.trim()
    || `عودت از «${fromLabel}» به «${toLabel}» — ${reasonLabel}${reasonText ? ` — ${reasonText}` : ''}`;

  const withRevision = recordStageReturn(order, {
    returnedBy,
    reasonCode,
    reasonText: reasonText || undefined,
    previousStage,
    returnedToStage,
    changesSummary,
  });

  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  const latest = getLatestRevision(withRevision);

  return {
    ...withRevision,
    events: [
      ...(withRevision.events || []),
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        type: 'revision_required',
        at,
        by: returnedBy,
        summary: changesSummary,
        revisionId: latest?.id,
        reasonCode,
        previousStage,
        returnedToStage,
      },
    ],
  };
}

export function markRevisionResolved(order, nextDecision = 'PENDING') {
  if (!isRevisionRequired(order)) return order;
  const cleared = clearRevisionRequired(order, nextDecision);
  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  return {
    ...cleared,
    events: [
      ...(cleared.events || []),
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        type: 'revision_cleared',
        at,
        by: CURRENT_USER,
        summary: 'رفع نیاز به بازنگری — ادامه گردش کار',
      },
    ],
  };
}

export function getRevisionBannerModel(order) {
  if (!isRevisionRequired(order)) return null;
  const latest = getLatestRevision(order);
  if (!latest) {
    return {
      title: 'نیاز به بازنگری',
      reasonLabel: null,
      reasonText: null,
      summary: 'این سفارش برای اصلاح به مرحله فعلی بازگردانده شده است.',
    };
  }
  return {
    title: 'نیاز به بازنگری',
    reasonLabel: REVISION_REASON_LABELS[latest.reasonCode] || latest.reasonCode,
    reasonText: latest.reasonText || null,
    summary: latest.changesSummary,
    returnedBy: latest.returnedBy,
    returnedAt: latest.returnedAt,
  };
}

export function orderNeedsRevisionWarning(order) {
  return isRevisionRequired(order);
}

export { getLatestRevision, isRevisionRequired, REVISION_REASON_LABELS };
