import { CURRENT_USER } from './constants';
import { ORDER_TABS } from './config';
import {
  STAGE_PARVANE_ID,
  STAGE_RAHESPAR_ID,
  STAGE_SARANJAM_ID,
  STAGE_TADAROK_ID,
  LEGACY_STAGE_TAJHIZ_ID,
  getStageLabel,
  isActivePhase2Stage,
  isPhase2Stage,
} from './config';
import { getTodayJalali, getNowTimeFa } from './dateUtils';
import {
  OPERATIONAL_PHASE_META,
  OPERATIONAL_PHASE_ORDER,
  OPERATIONAL_PHASES,
} from './phase2Config';

let phase2EventIdCounter = 1;

export function getOperationalPhaseIndex(phase) {
  return OPERATIONAL_PHASE_ORDER.indexOf(phase);
}

export function getOrderOperationalPhase(order) {
  const stageId = order.stageId || STAGE_PARVANE_ID;
  if (stageId >= STAGE_SARANJAM_ID) return OPERATIONAL_PHASES.SARANJAM;
  if (stageId === STAGE_RAHESPAR_ID || stageId === LEGACY_STAGE_TAJHIZ_ID) {
    return OPERATIONAL_PHASES.RAHESPAR;
  }
  if (stageId === STAGE_TADAROK_ID) return OPERATIONAL_PHASES.TADAROK;
  return OPERATIONAL_PHASES.PARVANE;
}

export function operationalPhaseToStageId(phase) {
  return OPERATIONAL_PHASE_META[phase]?.stageId ?? STAGE_PARVANE_ID;
}

export function operationalStageToPhase(stageId) {
  const match = OPERATIONAL_PHASE_ORDER.find(
    (phase) => OPERATIONAL_PHASE_META[phase].stageId === stageId,
  );
  return match || OPERATIONAL_PHASES.PARVANE;
}

export function isOrderInPhase2(order) {
  return order.status === ORDER_TABS.SUCCESS && isPhase2Stage(order.stageId);
}

/** فاز ۲ فقط پس از «موفق / تایید و فروش» در مرحله تصمیم نمایش داده می‌شود. */
export function shouldShowOperationalPhases(order) {
  return order.status === ORDER_TABS.SUCCESS;
}

export function getOperationalStepState(orderPhase, viewPhase, phase) {
  const orderIndex = getOperationalPhaseIndex(orderPhase);
  const phaseIndex = getOperationalPhaseIndex(phase);

  if (phaseIndex > orderIndex) {
    return { status: 'future', clickable: false };
  }
  if (phase === viewPhase) {
    return { status: 'active', clickable: true };
  }
  return { status: 'completed', clickable: true };
}

export function getOperationalStepStateForProfile(orderPhase, viewPhase, phase, { viewMode }) {
  const orderIndex = getOperationalPhaseIndex(orderPhase);
  const phaseIndex = getOperationalPhaseIndex(phase);

  if (viewMode === 'gateway') {
    if (phaseIndex <= orderIndex) {
      return { status: 'completed', clickable: true };
    }
    return { status: 'future', clickable: false };
  }
  return getOperationalStepState(orderPhase, viewPhase, phase);
}

function buildPhase2Event(order, fromStageId, toStageId, summary) {
  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  return {
    id: phase2EventIdCounter++,
    type: 'phase2_stage_advanced',
    at,
    by: CURRENT_USER,
    fromStageId,
    toStageId,
    fromStageLabel: getStageLabel(fromStageId),
    toStageLabel: getStageLabel(toStageId),
    summary,
  };
}

export function enterPhase2FromDecision(order, decidedAt) {
  const nextStageId = STAGE_PARVANE_ID;
  return {
    ...order,
    status: ORDER_TABS.SUCCESS,
    stageId: nextStageId,
    phase2EnteredAt: decidedAt,
    events: [
      ...(order.events || []),
      {
        id: phase2EventIdCounter++,
        type: 'phase2_entered',
        at: decidedAt,
        by: CURRENT_USER,
        toStageId: nextStageId,
        toStageLabel: getStageLabel(nextStageId),
        summary: `ورود سفارش ${order.code} به فاز عملیات و تحقق — ${getStageLabel(nextStageId)}`,
      },
    ],
  };
}

export function tryChangePhase2Stage(order, targetStageId) {
  if (order.status !== ORDER_TABS.SUCCESS) {
    return {
      order,
      accepted: false,
      reason: 'تغییر مرحله عملیاتی فقط برای سفارشات موفق مجاز است.',
    };
  }

  if (!isActivePhase2Stage(targetStageId)) {
    return {
      order,
      accepted: false,
      reason: 'مرحله هدف در فاز عملیاتی معتبر نیست.',
    };
  }

  const fromStageId = order.stageId === LEGACY_STAGE_TAJHIZ_ID
    ? STAGE_RAHESPAR_ID
    : order.stageId;

  if (targetStageId === fromStageId) {
    return {
      order: order.stageId === LEGACY_STAGE_TAJHIZ_ID
        ? { ...order, stageId: STAGE_RAHESPAR_ID }
        : order,
      accepted: true,
    };
  }

  const nextOrder = {
    ...order,
    stageId: targetStageId,
    events: [
      ...(order.events || []),
      buildPhase2Event(
        order,
        fromStageId,
        targetStageId,
        `تغییر مرحله عملیاتی سفارش ${order.code} از «${getStageLabel(fromStageId)}» به «${getStageLabel(targetStageId)}»`,
      ),
    ],
  };

  return { order: nextOrder, accepted: true };
}

export function canDropOnPhase2KanbanStage(order, targetStageId) {
  if (order.status !== ORDER_TABS.SUCCESS) return false;
  if (!isActivePhase2Stage(targetStageId)) return false;
  const currentId = order.stageId === LEGACY_STAGE_TAJHIZ_ID
    ? STAGE_RAHESPAR_ID
    : order.stageId;
  return targetStageId !== currentId;
}

export function advanceToNextOperationalPhase(order) {
  const currentPhase = getOrderOperationalPhase(order);
  const currentIndex = getOperationalPhaseIndex(currentPhase);
  if (currentIndex >= OPERATIONAL_PHASE_ORDER.length - 1) {
    return {
      order,
      accepted: false,
      reason: 'سفارش در مرحله سرانجام قرار دارد.',
    };
  }
  const nextPhase = OPERATIONAL_PHASE_ORDER[currentIndex + 1];
  return tryChangePhase2Stage(order, operationalPhaseToStageId(nextPhase));
}

export function advanceOperationalPhase(order, phase) {
  const targetStageId = operationalPhaseToStageId(phase);
  return tryChangePhase2Stage(order, targetStageId);
}
