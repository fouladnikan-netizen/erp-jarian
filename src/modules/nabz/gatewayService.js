import { getEffectiveStageId } from './orderStageService';
import {
  STAGE_KAVOSH_ID,
  STAGE_MOZENE_ID,
  STAGE_PISHKESH_ID,
} from './config';
import {
  GATEWAY_PHASE_ORDER,
  GATEWAY_PHASES,
} from './gatewayConfig';

export function getOrderGatewayPhase(order) {
  const stageId = getEffectiveStageId(order);
  if (!isPhase1OnlyStage(stageId)) {
    return GATEWAY_PHASES.PISHKESH;
  }
  if (stageId === STAGE_PISHKESH_ID) return GATEWAY_PHASES.PISHKESH;
  if (stageId === STAGE_MOZENE_ID) return GATEWAY_PHASES.MOZENE;
  return GATEWAY_PHASES.KAVOSH;
}

function isPhase1OnlyStage(stageId) {
  return stageId <= STAGE_PISHKESH_ID;
}

const READ_ONLY_VIEW_PHASES = new Set();

export function getGatewayPhaseIndex(phase) {
  return GATEWAY_PHASE_ORDER.indexOf(phase);
}

export function getGatewayStepState(orderPhase, viewPhase, phase) {
  const orderIndex = getGatewayPhaseIndex(orderPhase);
  const phaseIndex = getGatewayPhaseIndex(phase);

  if (phaseIndex > orderIndex) {
    return { status: 'future', clickable: false };
  }
  if (phase === viewPhase) {
    return { status: 'active', clickable: true };
  }
  return { status: 'completed', clickable: true };
}

export function getGatewayStepStateForProfile(orderPhase, viewPhase, phase, { isSuccess, viewMode }) {
  if (!isSuccess) {
    return getGatewayStepState(orderPhase, viewPhase, phase);
  }
  if (viewMode === 'operations') {
    return { status: 'completed', clickable: true };
  }
  if (phase === viewPhase) {
    return { status: 'active', clickable: true };
  }
  return { status: 'completed', clickable: true };
}

export function isGatewayPhaseReadOnly(orderPhase, viewPhase) {
  if (READ_ONLY_VIEW_PHASES.has(viewPhase) && viewPhase !== orderPhase) return true;
  return getGatewayPhaseIndex(viewPhase) < getGatewayPhaseIndex(orderPhase);
}

export function isGatewayActivePhase(orderPhase, viewPhase) {
  return viewPhase === orderPhase;
}

export function isGatewayLivePhase(orderPhase, viewPhase) {
  return isGatewayActivePhase(orderPhase, viewPhase);
}

export function shouldShowGatewayFinancialSummary(viewPhase) {
  return viewPhase === GATEWAY_PHASES.MOZENE
    || viewPhase === GATEWAY_PHASES.PISHKESH;
}

export function updateGatewayOrderItem(order, itemIndex, patch) {
  const items = (order.items || []).map((item, index) => (
    index === itemIndex ? { ...item, ...patch } : item
  ));
  return { ...order, items };
}

export function removeGatewayOrderItem(order, itemIndex) {
  return {
    ...order,
    items: (order.items || []).filter((_, index) => index !== itemIndex),
  };
}

export function removeGatewayInquiry(order, itemIndex, inquiryId) {
  const items = (order.items || []).map((item, index) => {
    if (index !== itemIndex) return item;
    const inquiries = (item.inquiries || []).filter((inq) => inq.id !== inquiryId);
    const next = { ...item, inquiries };
    if (item.targetInquiryId === inquiryId) {
      const { targetInquiryId, ...rest } = next;
      return rest;
    }
    return next;
  });
  return { ...order, items };
}
