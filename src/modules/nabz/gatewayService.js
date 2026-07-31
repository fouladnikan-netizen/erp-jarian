import { CURRENT_USER } from './constants';
import { getTodayJalali, getNowTimeFa } from './dateUtils';
import { getEffectiveStageId, isMozeneStage } from './orderStageService';
import {
  STAGE_KAVOSH_ID,
  STAGE_MOZENE_ID,
  STAGE_PISHKESH_ID,
} from './config';
import {
  GATEWAY_PHASE_ORDER,
  GATEWAY_PHASES,
} from './gatewayConfig';
import { applyQuotingToOrder, getOrderQuoting } from './quotingService';

const SENSITIVE_ITEM_FIELDS = ['name', 'qty', 'description'];

const FIELD_LABELS = {
  name: 'شرح کالا',
  qty: 'مقدار',
  description: 'توضیحات',
};

let gatewayEventId = 9000;

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

export function getSensitiveItemFieldChanges(item, patch) {
  if (!item || !patch) return [];
  return SENSITIVE_ITEM_FIELDS.filter((field) => {
    if (!(field in patch)) return false;
    const next = patch[field];
    const prev = item[field];
    if (field === 'qty') {
      return Number(prev) !== Number(next);
    }
    return String(prev ?? '').trim() !== String(next ?? '').trim();
  });
}

export function shouldWipeInquiriesOnItemEdit(order, itemIndex, patch) {
  if (!isMozeneStage(order)) return false;
  const item = order.items?.[itemIndex];
  if (!item) return false;
  const changed = getSensitiveItemFieldChanges(item, patch);
  if (!changed.length) return false;
  return (item.inquiries || []).length > 0;
}

function wipeItemInquiries(item) {
  const next = { ...item, inquiries: [] };
  delete next.targetInquiryId;
  return next;
}

/**
 * ویرایش قلم؛ در مرحله مظنه با تغییر فیلدهای حساس، استعلام‌ها پاک و در لاگ ثبت می‌شود.
 * نام مشتری و سایر بخش‌های سفارش دست‌نخورده می‌مانند.
 */
export function updateGatewayOrderItemWithSensitivity(
  order,
  itemIndex,
  patch,
  {
    wipeConfirmed = false,
    forceWipe = false,
    changedFields: changedFieldsOverride = null,
    by = CURRENT_USER,
  } = {},
) {
  const item = order.items?.[itemIndex];
  if (!item) return order;

  const changedFields = (changedFieldsOverride && changedFieldsOverride.length)
    ? changedFieldsOverride
    : getSensitiveItemFieldChanges(item, patch);
  const needsWipe = (forceWipe || isMozeneStage(order))
    && changedFields.length > 0
    && (item.inquiries || []).length > 0;

  if (needsWipe && !wipeConfirmed) {
    return order;
  }

  let items = (order.items || []).map((row, index) => {
    if (index !== itemIndex) return row;
    const merged = { ...row, ...patch };
    return needsWipe ? wipeItemInquiries(merged) : merged;
  });

  let nextOrder = { ...order, items };

  if (needsWipe) {
    const quoting = getOrderQuoting(order);
    const lineMargins = { ...quoting.lineMargins };
    delete lineMargins[itemIndex];
    nextOrder = {
      ...nextOrder,
      quoting: { ...quoting, lineMargins },
    };

    const fieldLabels = changedFields.map((f) => FIELD_LABELS[f] || f).join('، ');
    const event = {
      id: gatewayEventId++,
      type: 'inquiry_prices_reset',
      at: `${getTodayJalali()} · ${getNowTimeFa()}`,
      by,
      itemIndex,
      itemName: (patch.name ?? item.name) || '—',
      changedFields,
      summary: `کاربر ${by} در مرحله مظنه، ${fieldLabels} را تغییر داد و قیمت‌های استعلامی توسط سیستم بازنشانی شدند.`,
    };
    nextOrder = {
      ...nextOrder,
      events: [...(order.events || []), event],
    };
    nextOrder = applyQuotingToOrder(nextOrder);
  }

  return nextOrder;
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
