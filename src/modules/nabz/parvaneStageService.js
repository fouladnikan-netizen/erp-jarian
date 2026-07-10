import { CURRENT_USER } from './constants';
import { ORDER_TABS, STAGE_PARVANE_ID, STAGE_PISHKESH_ID } from './config';
import { getTodayJalali, getNowTimeFa } from './dateUtils';
import { getCustomerPreview } from './customers';
import { calculateQuotingPreview } from './inquiryService';
import { getOrderFinanceRecords } from './operationalRecordsService';
import { formatAmountRial } from './orderCode';
import { OPERATIONAL_PHASES } from './phase2Config';
import { advanceOperationalPhase, getOrderOperationalPhase } from './phase2Service';
import { getTargetInquiry } from './quotingService';
import { getSupplierName } from './suppliers';

export function isParvaneStageLive(order, operationalViewPhase) {
  return order.status === ORDER_TABS.SUCCESS
    && order.stageId === STAGE_PARVANE_ID
    && getOrderOperationalPhase(order) === OPERATIONAL_PHASES.PARVANE
    && operationalViewPhase === OPERATIONAL_PHASES.PARVANE;
}

export function getParvanePaymentBadge(order) {
  const records = getOrderFinanceRecords(order);
  const hasPrepayment = records.some(
    (record) => (record.type || '').includes('پیش') && record.status !== 'در انتظار وصول',
  );
  const decisionPayment = order.gatewayDecision?.paymentType || '';

  if (hasPrepayment || decisionPayment.includes('پیش')) {
    return { label: 'پیش‌پرداخت دریافت شد', kind: 'success' };
  }
  if (decisionPayment.includes('نقد') || decisionPayment.includes('اعتبار')) {
    return { label: decisionPayment, kind: 'info' };
  }
  return { label: 'در انتظار تسویه', kind: 'pending' };
}

export function getParvaneCreditStatus(order) {
  const customer = getCustomerPreview(order.customerId);
  if (!customer) {
    return { label: 'اطلاعات مشتری در کانون یافت نشد', kind: 'neutral' };
  }
  const label = customer.behavioralLabel
    ? `وضعیت اعتبار: ${customer.behavioralLabel}`
    : 'وضعیت اعتبار: نامشخص';
  const kind = (customer.behavioralLabel || '').includes('ممتاز')
    || (customer.behavioralLabel || '').includes('خوب')
    ? 'good'
    : 'neutral';
  return { label, kind };
}

export function getParvaneOrderTotal(order) {
  const preview = calculateQuotingPreview(order);
  return preview.orderTotal;
}

export function getParvaneItemsRows(order) {
  return (order.items || []).map((item, index) => {
    const target = getTargetInquiry(item);
    const qtyLabel = item.qty != null
      ? `${item.qty.toLocaleString('fa-IR')} ${item.unit || ''}`.trim()
      : '—';
    return {
      id: index,
      name: item.name || '—',
      specs: item.description || item.weight || '—',
      qty: qtyLabel,
      supplier: target ? getSupplierName(target.supplierId) : '—',
    };
  });
}

export function issueParvaneSupplyPermit(order, driverNotes = '') {
  const trimmed = driverNotes.trim();
  const withNotes = {
    ...order,
    parvaneDriverNotes: trimmed,
    events: [
      ...(order.events || []),
      {
        id: Date.now(),
        type: 'parvane_issued',
        at: `${getTodayJalali()} · ${getNowTimeFa()}`,
        by: CURRENT_USER,
        summary: trimmed
          ? `صدور پروانه تأمین — ${trimmed}`
          : 'صدور پروانه تأمین و ارجاع به کاشف',
      },
    ],
  };
  return advanceOperationalPhase(withNotes, OPERATIONAL_PHASES.TADAROK);
}

export function returnParvaneToPishkesh(order, driverNotes = '') {
  const trimmed = driverNotes.trim();
  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  return {
    order: {
      ...order,
      status: ORDER_TABS.CURRENT,
      stageId: STAGE_PISHKESH_ID,
      parvaneRejectionNotes: trimmed,
      events: [
        ...(order.events || []),
        {
          id: Date.now() + 1,
          type: 'parvane_returned',
          at,
          by: CURRENT_USER,
          summary: trimmed
            ? `عودت از پروانه به پیش‌کش — ${trimmed}`
            : 'عدم تایید پروانه — عودت به پیش‌کش',
        },
      ],
    },
    accepted: true,
  };
}
