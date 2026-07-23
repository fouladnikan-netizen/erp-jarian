import { CURRENT_USER } from './constants';
import { getTodayJalali, getNowTimeFa } from './dateUtils';
import {
  PHASE1_STAGES,
  STAGE_KAVOSH_ID,
  STAGE_MOZENE_ID,
  STAGE_PISHKESH_ID,
  ORDER_TABS,
  getStageLabel,
  isPhase1Stage,
  isPhase2Stage,
} from './config';
import { canCompleteOrderInquiries } from './quotingService';
import { getOrderDecisionLabel } from './gatewayDecisionService';
import { canDropOnPhase2KanbanStage, tryChangePhase2Stage } from './phase2Service';

export const ORDER_DISPLAY_STATUS = {
  ANNOUNCING: 'در حال اعلام',
  EXPLORING: 'کاوش',
};

export const MOZENE_LOCKED_MESSAGE =
  'ورود به مرحله مظنه فقط پس از تکمیل استعلام همه سطرها و کلیک دکمه «تکمیل کاوش» امکان‌پذیر است.';

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
  return order.stageId;
}

export function getOrderDisplayStatus(order) {
  const decisionLabel = getOrderDecisionLabel(order);
  if (decisionLabel) return decisionLabel;

  const items = order.items || [];

  if (!items.length || !hasAnyInquiry(order)) {
    return ORDER_DISPLAY_STATUS.ANNOUNCING;
  }

  const effectiveId = getEffectiveStageId(order);

  // After inquiry completion, always show the live Kanban stage
  // (fixes stuck «مظنه» label when stageId has already advanced to پیش‌کش+)
  if (effectiveId >= STAGE_MOZENE_ID || canEnterMozeneStage(order)) {
    if (canEnterMozeneStage(order) && effectiveId < STAGE_MOZENE_ID) {
      return getStageLabel(STAGE_MOZENE_ID);
    }
    return getStageLabel(effectiveId);
  }

  return ORDER_DISPLAY_STATUS.EXPLORING;
}

export function getOrderDisplayStatusKind(order) {
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
  if (order.status === ORDER_TABS.SUCCESS) {
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
    by: CURRENT_USER,
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

  if (order.status === ORDER_TABS.SUCCESS || isPhase2Stage(targetStageId)) {
    return tryChangePhase2Stage(current, targetStageId);
  }

  if (targetStageId === STAGE_MOZENE_ID) {
    return {
      order: current,
      accepted: false,
      reason: MOZENE_LOCKED_MESSAGE,
    };
  }

  if (!isPhase1Stage(targetStageId)) {
    return {
      order: current,
      accepted: false,
      reason: 'تغییر به این مرحله در فاز جاری مجاز نیست.',
    };
  }

  const nextOrder = {
    ...current,
    stageId: targetStageId,
    events: [...(current.events || []), buildStageAdvancedEvent(current, targetStageId)],
  };

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
  if (order.statusHistory?.length) return order.statusHistory;

  const effectiveStageId = getEffectiveStageId(order);
  const entries = [];

  for (let id = 1; id <= effectiveStageId; id += 1) {
    const isCurrent = id === effectiveStageId;
    const offset = effectiveStageId - id;
    entries.push({
      stageId: id,
      stageLabel: id === effectiveStageId
        ? getOrderDisplayStatus(order)
        : getStageLabel(id),
      at: isCurrent
        ? `${order.registeredDate} · ${order.registeredTime}`
        : offset === 1
          ? 'پیش از ثبت فعلی'
          : `${offset} مرحله قبل`,
      isCurrent,
    });
  }

  return entries;
}
