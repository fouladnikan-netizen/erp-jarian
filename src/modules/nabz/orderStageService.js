import { getCurrentUser } from './constants';
import { getTodayJalali, getNowTimeFa } from './dateUtils';
import {
  PHASE1_STAGES,
  ALL_STAGES,
  STAGE_KAVOSH_ID,
  STAGE_MOZENE_ID,
  STAGE_PISHKESH_ID,
  STAGE_RAHESPAR_ID,
  LEGACY_STAGE_TAJHIZ_ID,
  ORDER_TABS,
  getStageLabel,
  isPhase1Stage,
  isPhase2Stage,
} from './config';
import { canCompleteOrderInquiries } from './quotingService';
import { getOrderDecisionLabel } from './gatewayDecisionService';
import { canDropOnPhase2KanbanStage, tryChangePhase2Stage, shouldShowOperationalPhases } from './phase2Service';
import { applyRevisionReturn, markRevisionResolved } from './services/revisionService';
import {
  evaluateStageTransition,
  MOZENE_LOCKED_MESSAGE as LIFECYCLE_MOZENE_LOCKED_MESSAGE,
} from '../../domain/order/orderLifecycle.js';

export const ORDER_DISPLAY_STATUS = {
  ANNOUNCING: 'در حال اعلام',
  EXPLORING: 'کاوش',
};

/** UX mirror — authority = Backend orderLifecycle / orderService */
export const MOZENE_LOCKED_MESSAGE = LIFECYCLE_MOZENE_LOCKED_MESSAGE;

let stageEventIdCounter = 1;

export function hasAnyInquiry(order) {
  return (order.items || []).some((item) => (item.inquiries || []).length > 0);
}

export function hasInquiryOnAllLines(order) {
  const items = order.items || [];
  if (!items.length) return false;
  return items.every((item) => (item.inquiries || []).length > 0);
}

export function hasInquiryCompletionEvent(order) {
  // پس از به‌روزرسانی پیش‌فاکتور، تا «تکمیل کاوش» دوباره، رویدادهای قبلی را حساب نکن
  if (order.proformaUpdate) return false;
  return Boolean(order.inquiryCompletedAt)
    || (order.events || []).some((event) => event.type === 'inquiry_order_completed');
}

export function canEnterMozeneStage(order) {
  return canCompleteOrderInquiries(order) && hasInquiryCompletionEvent(order);
}

export function isMozeneEarned(order) {
  return order.stageId === STAGE_MOZENE_ID && canEnterMozeneStage(order);
}

export function getEffectiveStageId(order) {
  if (order.stageId === STAGE_MOZENE_ID && !canEnterMozeneStage(order)) {
    return STAGE_KAVOSH_ID;
  }
  // تجهیز حذف شد؛ سفارش‌های قدیمی به رهسپار نگاشت می‌شوند
  if (order.stageId === LEGACY_STAGE_TAJHIZ_ID) {
    return STAGE_RAHESPAR_ID;
  }
  return order.stageId;
}

export function getOrderDisplayStatus(order) {
  if (order?.saranjam?.archivedAt || order?.saranjam?.locked || order?.archivedAt) {
    return 'بایگانی‌شده';
  }

  if (order?.revisionRequired) {
    return 'نیاز به بازنگری';
  }

  const decisionLabel = getOrderDecisionLabel(order);
  if (decisionLabel) return decisionLabel;

  const items = order.items || [];

  if (!items.length || !hasAnyInquiry(order)) {
    return ORDER_DISPLAY_STATUS.ANNOUNCING;
  }

  const effectiveId = getEffectiveStageId(order);

  // وضعیت نمایشی همان مرحلهٔ مؤثر کانبان است (برگشت عمدی به کاوش را مظنه نشان نده)
  if (effectiveId >= STAGE_MOZENE_ID) {
    return getStageLabel(effectiveId);
  }

  return ORDER_DISPLAY_STATUS.EXPLORING;
}

export function getOrderDisplayStatusKind(order) {
  if (order?.saranjam?.archivedAt || order?.saranjam?.locked || order?.archivedAt) {
    return 'archived';
  }

  if (order?.revisionRequired) {
    return 'revision';
  }

  const decisionLabel = getOrderDecisionLabel(order);
  if (decisionLabel === 'موفق') return 'success';
  if (decisionLabel === 'ناموفق') return 'failed';

  const label = getOrderDisplayStatus(order);
  if (label === ORDER_DISPLAY_STATUS.ANNOUNCING) return 'pending';
  if (label === ORDER_DISPLAY_STATUS.EXPLORING || label === 'کاوش') return 'kavosh';
  if (label === 'مظنه') return 'mozene';
  if (label === 'پیش‌کش') return 'pishkesh';
  return 'stage';
}

export function isMozeneStage(order) {
  return getEffectiveStageId(order) === STAGE_MOZENE_ID;
}

export function shouldShowQuotingSection(order) {
  return isMozeneStage(order);
}

export function isPishkeshStage(order) {
  return getEffectiveStageId(order) === STAGE_PISHKESH_ID;
}

export function shouldShowPishkeshTabs(order) {
  return isPishkeshStage(order);
}

export function canSelectStageInList(order, stageId) {
  if (stageId === STAGE_MOZENE_ID) return false;
  if (stageId === order.stageId) return true;
  if (!isPhase1Stage(stageId)) return false;
  return true;
}

export function canDropOnKanbanStage(order, targetStageId) {
  if (order.status === ORDER_TABS.FAILED) return false;
  if (order.saranjam?.archivedAt || order.saranjam?.locked || order.closure === 'closed') {
    return false;
  }
  // DDL-18(B): SUCCESS+OPEN on Phase-2 board; CURRENT on Phase-1 board
  if (order.status === ORDER_TABS.SUCCESS || shouldShowOperationalPhases(order) || isPhase2Stage(targetStageId)) {
    return canDropOnPhase2KanbanStage(order, targetStageId);
  }
  if (targetStageId === STAGE_MOZENE_ID) return false;
  if (!isPhase1Stage(targetStageId)) return false;
  return targetStageId !== getEffectiveStageId(order);
}

function buildStageAdvancedEvent(order, targetStageId) {
  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  const fromLabel = getStageLabel(order.stageId);
  const toLabel = getStageLabel(targetStageId);

  return {
    id: stageEventIdCounter++,
    type: 'stage_advanced',
    at,
    by: getCurrentUser(),
    fromStageId: order.stageId,
    toStageId: targetStageId,
    fromStageLabel: fromLabel,
    toStageLabel: toLabel,
    summary: `تغییر مرحله سفارش ${order.code} از «${fromLabel}» به «${toLabel}»`,
  };
}

export function normalizeOrderStage(order) {
  const effectiveStageId = getEffectiveStageId(order);
  if (order.stageId === effectiveStageId) return order;
  return { ...order, stageId: effectiveStageId };
}

export function tryChangeOrderStage(order, targetStageId) {
  const current = normalizeOrderStage(order);

  if (targetStageId === current.stageId) {
    return { order: current, accepted: true };
  }

  // Manual mozene entry is always locked in UX — advance via «تکمیل کاوش» only.
  // Backend still allows 1→2 when inquiryCompletedAt + inquiries present (API path).
  if (targetStageId === STAGE_MOZENE_ID) {
    return {
      order: current,
      accepted: false,
      reason: MOZENE_LOCKED_MESSAGE,
      code: 'ORDER_MOZENE_LOCKED',
    };
  }

  // UX mirror of Backend stage machine (authority remains API)
  const gate = evaluateStageTransition({
    fromStage: current.stageId,
    toStage: targetStageId,
    status: order.status,
    order: current,
  });
  if (!gate.ok) {
    return {
      order: current,
      accepted: false,
      reason: gate.message || MOZENE_LOCKED_MESSAGE,
      code: gate.code,
    };
  }

  if (shouldShowOperationalPhases(order) || isPhase2Stage(targetStageId)) {
    return tryChangePhase2Stage(current, targetStageId);
  }

  const nextOrder = {
    ...current,
    stageId: targetStageId,
    events: [...(current.events || []), buildStageAdvancedEvent(current, targetStageId)],
  };

  // برگشت به کاوش: تکمیل کاوش قبلی باطل می‌شود تا دوباره بتوان استعلام ثبت/ویرایش کرد
  if (targetStageId === STAGE_KAVOSH_ID && current.stageId > STAGE_KAVOSH_ID) {
    nextOrder.inquiryCompletedAt = null;
  }

  // Backward stage move → Revision Engine (no new lifecycle status)
  if (targetStageId < current.stageId) {
    const withRevision = applyRevisionReturn(nextOrder, {
      fromStageId: current.stageId,
      toStageId: targetStageId,
      reasonCode: 'OTHER',
      reasonText: `بازگشت دستی از «${getStageLabel(current.stageId)}» به «${getStageLabel(targetStageId)}»`,
    });
    return { order: withRevision, accepted: true };
  }

  // Forward progress clears needs-revision flag
  if (targetStageId > current.stageId && current.revisionRequired) {
    return { order: markRevisionResolved(nextOrder, 'PENDING'), accepted: true };
  }

  return { order: nextOrder, accepted: true };
}

export function getManualStageOptions(order) {
  return PHASE1_STAGES.map((stage) => ({
    ...stage,
    disabled: !canSelectStageInList(order, stage.id),
    locked: stage.id === STAGE_MOZENE_ID,
  }));
}

export function buildStatusHistory(order) {
  if (order.statusHistory?.length) {
    return order.statusHistory.filter(
      (entry) => entry.stageId !== LEGACY_STAGE_TAJHIZ_ID,
    );
  }

  const effectiveStageId = getEffectiveStageId(order);
  const stages = ALL_STAGES.filter((stage) => stage.id <= effectiveStageId);
  const entries = [];

  stages.forEach((stage, index) => {
    const isCurrent = stage.id === effectiveStageId;
    const offset = stages.length - 1 - index;
    entries.push({
      stageId: stage.id,
      stageLabel: isCurrent
        ? getOrderDisplayStatus(order)
        : stage.label,
      at: isCurrent
        ? `${order.registeredDate} · ${order.registeredTime}`
        : offset === 1
          ? 'پیش از ثبت فعلی'
          : `${offset} مرحله قبل`,
      isCurrent,
    });
  });

  return entries;
}
