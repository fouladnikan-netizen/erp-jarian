import { CURRENT_USER } from './constants';
import { getTodayJalali, getNowTimeFa } from './dateUtils';
import {
  STAGE_KAVOSH_ID,
  STAGE_MOZENE_ID,
  STAGE_PISHKESH_ID,
  getStageLabel,
} from './config';
import {
  GATEWAY_PHASES,
  GATEWAY_PHASE_META,
  GATEWAY_PHASE_ORDER,
} from './gatewayConfig';
import { getOrderGatewayPhase } from './gatewayService';
import {
  getEffectiveStageId,
  hasInquiryCompletionEvent,
} from './orderStageService';
import {
  completeOrderInquiries,
  completeOrderQuoting,
} from './inquiryService';
import {
  allLinesHaveSavedMargin,
  canCompleteOrderInquiries,
  canCompleteQuoting,
  getMissingTargetMessage,
  hasQuotingBlockers,
} from './quotingService';

let lifecycleEventIdCounter = 1;

export const GATEWAY_STAGE_ACTIONS = {
  [GATEWAY_PHASES.KAVOSH]: {
    label: 'تکمیل کاوش',
    nextPhase: GATEWAY_PHASES.MOZENE,
  },
  [GATEWAY_PHASES.MOZENE]: {
    label: 'تکمیل مظنه',
    nextPhase: GATEWAY_PHASES.PISHKESH,
  },
};

const ACTION_ID_TO_PHASE = {
  'complete-kavosh': GATEWAY_PHASES.KAVOSH,
  'complete-mozene': GATEWAY_PHASES.MOZENE,
};

function buildLifecycleEvent(order, fromStageId, toStageId, summary) {
  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  return {
    id: lifecycleEventIdCounter++,
    type: 'stage_advanced',
    at,
    by: CURRENT_USER,
    fromStageId,
    toStageId,
    fromStageLabel: getStageLabel(fromStageId),
    toStageLabel: getStageLabel(toStageId),
    summary,
  };
}

export function getGatewayCurrentStage(order) {
  return getEffectiveStageId(order);
}

export function gatewayStageToPhase(stageId) {
  if (stageId >= STAGE_PISHKESH_ID) return GATEWAY_PHASES.PISHKESH;
  if (stageId === STAGE_MOZENE_ID) return GATEWAY_PHASES.MOZENE;
  return GATEWAY_PHASES.KAVOSH;
}

export function phaseToGatewayStage(phase) {
  return GATEWAY_PHASE_META[phase]?.stageId ?? STAGE_KAVOSH_ID;
}

export function canAdvanceFromKavosh(order) {
  if (!(order.items || []).length) {
    return { ok: false, message: 'حداقل یک قلم کالا برای ادامه ثبت کنید.' };
  }
  if (!canCompleteOrderInquiries(order)) {
    return { ok: false, message: 'برای هر کالا حداقل یک استعلام ثبت کنید.' };
  }
  if (hasQuotingBlockers(order)) {
    return { ok: false, message: getMissingTargetMessage(order) };
  }
  return { ok: true };
}

export function canAdvanceFromMozene(order) {
  if (!canCompleteQuoting(order)) {
    if (hasQuotingBlockers(order)) {
      return { ok: false, message: getMissingTargetMessage(order) };
    }
    if (!allLinesHaveSavedMargin(order)) {
      return { ok: false, message: 'لطفاً برای تمام اقلام، حاشیه سود را ثبت کنید.' };
    }
    return { ok: false, message: 'تکمیل مظنه هنوز ممکن نیست.' };
  }
  return { ok: true };
}

export function canAdvanceGatewayPhase(order, phase) {
  if (getOrderGatewayPhase(order) !== phase) {
    return { ok: false, message: 'این اقدام فقط در مرحله فعال جاری مجاز است.' };
  }

  switch (phase) {
    case GATEWAY_PHASES.KAVOSH:
      return canAdvanceFromKavosh(order);
    case GATEWAY_PHASES.MOZENE:
      return canAdvanceFromMozene(order);
    default:
      return { ok: false, message: 'مرحله نامعتبر است.' };
  }
}

export function advanceKavoshToMozene(order) {
  const check = canAdvanceFromKavosh(order);
  if (!check.ok) return { order, accepted: false, error: check.message };

  const nextOrder = completeOrderInquiries(order);
  // stageId ممکن است از قبل مظنه باشد (داده ناسازگار) ولی رویداد تکمیل کاوش نباشد؛
  // موفقیت را با تکمیل واقعی می‌سنجیم نه فقط تغییر stageId.
  if (!hasInquiryCompletionEvent(nextOrder) || nextOrder.stageId < STAGE_MOZENE_ID) {
    return { order, accepted: false, error: 'تکمیل کاوش ممکن نیست.' };
  }

  return { order: nextOrder, accepted: true };
}

export function advanceMozeneToPishkesh(order) {
  const check = canAdvanceFromMozene(order);
  if (!check.ok) return { order, accepted: false, error: check.message };

  const nextOrder = completeOrderQuoting(order);
  const quotingDone = (nextOrder.events || []).some((e) => e.type === 'quoting_completed')
    || nextOrder.stageId >= STAGE_PISHKESH_ID;
  if (!quotingDone || nextOrder.stageId < STAGE_PISHKESH_ID) {
    return { order, accepted: false, error: 'صدور پیش‌فاکتور ممکن نیست.' };
  }

  return { order: nextOrder, accepted: true };
}

export function advanceGatewayPhase(order, phase) {
  switch (phase) {
    case GATEWAY_PHASES.KAVOSH:
      return advanceKavoshToMozene(order);
    case GATEWAY_PHASES.MOZENE:
      return advanceMozeneToPishkesh(order);
    default:
      return { order, accepted: false, error: 'مرحله‌ای برای پیشروی تعریف نشده است.' };
  }
}

export function executeGatewayHeaderAction(order, actionId) {
  const phase = ACTION_ID_TO_PHASE[actionId];
  if (!phase) return { order, accepted: false, error: 'اقدام نامعتبر است.' };
  return advanceGatewayPhase(order, phase);
}

export function sendProformaToCustomer(order) {
  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  return {
    ...order,
    proformaSentAt: at,
    events: [
      ...(order.events || []),
      {
        id: lifecycleEventIdCounter++,
        type: 'proforma_sent',
        at,
        by: CURRENT_USER,
        summary: `ارسال پیش‌فاکتور سفارش ${order.code} برای مشتری`,
      },
    ],
  };
}

export function getGatewayPhaseIndex(phase) {
  return GATEWAY_PHASE_ORDER.indexOf(phase);
}
