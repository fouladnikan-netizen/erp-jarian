import { CURRENT_USER } from './constants';
import { ORDER_TABS, STAGE_PISHKESH_ID } from './config';
import { GATEWAY_PHASES } from './gatewayConfig';
import { enterPhase2FromDecision } from './phase2Service';
import {
  GATEWAY_DECISION_OUTCOMES,
  getCancelReasonLabel,
} from './gatewayDecisionConfig';

function formatDecisionTimestamp(date = new Date()) {
  const datePart = date.toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timePart = date.toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
}

export function hasGatewayDecision(order) {
  return Boolean(order.gatewayDecision?.outcome);
}

export function getGatewayDecision(order) {
  return order.gatewayDecision || null;
}

export function isGatewayDecisionEditable(order, orderPhase, viewPhase) {
  return viewPhase === GATEWAY_PHASES.PISHKESH
    && orderPhase === GATEWAY_PHASES.PISHKESH
    && !hasGatewayDecision(order)
    && order.status === ORDER_TABS.CURRENT
    && order.stageId === STAGE_PISHKESH_ID
    && Boolean(order.proforma?.signed);
}

export function getOrderDecisionLabel(order) {
  if (order.gatewayDecision?.outcome === GATEWAY_DECISION_OUTCOMES.SUCCESS) return 'موفق';
  if (order.gatewayDecision?.outcome === GATEWAY_DECISION_OUTCOMES.FAILED) return 'ناموفق';
  if (order.status === ORDER_TABS.SUCCESS) return 'موفق';
  if (order.status === ORDER_TABS.FAILED) return 'ناموفق';
  return null;
}

export function markGatewayDecisionSuccess(order, {
  paymentType,
  financeNotes,
  paymentTerms,
}) {
  const decidedAt = formatDecisionTimestamp();
  const withDecision = {
    ...order,
    gatewayDecision: {
      outcome: GATEWAY_DECISION_OUTCOMES.SUCCESS,
      paymentType,
      financeNotes: financeNotes?.trim() || '',
      paymentTerms: paymentTerms
        ? {
          dueDate: paymentTerms.dueDate || '',
          lcMonths: paymentTerms.lcMonths || '',
          daysAfterDelivery: paymentTerms.daysAfterDelivery || '',
          partialAmount: paymentTerms.partialAmount || '',
          document: paymentTerms.document || null,
        }
        : null,
      decidedAt,
      decidedBy: CURRENT_USER,
    },
    events: [
      ...(order.events || []),
      {
        id: Date.now(),
        type: 'order_decision_success',
        at: decidedAt,
        by: CURRENT_USER,
        summary: `تایید و فروش موفق — ورود به فاز عملیات (${paymentType})`,
      },
    ],
  };

  return enterPhase2FromDecision(withDecision, decidedAt);
}

export function markGatewayDecisionFailed(order, { cancelReason, cancelNotes }) {
  const decidedAt = formatDecisionTimestamp();
  const reasonLabel = getCancelReasonLabel(cancelReason);
  const failReason = cancelReason === 'other'
    ? (cancelNotes?.trim() || reasonLabel)
    : reasonLabel;

  return {
    ...order,
    status: ORDER_TABS.FAILED,
    failReason,
    gatewayDecision: {
      outcome: GATEWAY_DECISION_OUTCOMES.FAILED,
      cancelReason,
      cancelNotes: cancelNotes?.trim() || '',
      decidedAt,
      decidedBy: CURRENT_USER,
    },
    events: [
      ...(order.events || []),
      {
        id: Date.now(),
        type: 'order_decision_failed',
        at: decidedAt,
        by: CURRENT_USER,
        summary: `عدم موفقیت / لغو — ${failReason}`,
      },
    ],
  };
}
