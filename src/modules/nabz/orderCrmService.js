import { CURRENT_USER, CURRENT_USER_ROLE } from './constants';
import { CRM_ACTIVITY_TYPES, CRM_ROLE_LABELS, CRM_ACTIVITY_META } from './orderCrmConfig';

let activityIdCounter = 5000;

const SAMPLE_ACTIVITIES = [
  {
    id: 1,
    type: CRM_ACTIVITY_TYPES.CALL,
    author: 'حسین کریمی',
    roleLabel: 'شوالیه',
    createdAt: '۱۴۰۵/۰۱/۱۰ · ۰۹:۳۰',
    body: 'تماس با آقای محمدی از واحد خرید. تایید اولیه مقدار تیرآهن و نبشی انجام شد. @کاشف لطفاً استعلام قیمت را تا فردا تکمیل کنید.',
    mentions: ['کاشف'],
    followUp: {
      date: '۱۴۰۵/۰۱/۱۱',
      time: '۱۰:۰۰',
      actionType: 'تماس مجدد',
      title: 'پیگیری نتیجه استعلام',
      assignee: 'کاشف',
      completed: false,
    },
  },
  {
    id: 2,
    type: CRM_ACTIVITY_TYPES.NOTE,
    author: 'محمد رضایی',
    roleLabel: 'کارشناس مشتری',
    createdAt: '۱۴۰۵/۰۱/۱۰ · ۱۴:۱۵',
    body: 'مشتری تحویل دو هفته‌ای را ترجیح می‌دهد. پیش‌فاکتور رسمی درخواست شده است.',
    mentions: [],
    followUp: null,
  },
  {
    id: 3,
    type: CRM_ACTIVITY_TYPES.MESSAGE,
    author: 'علی رضایی',
    roleLabel: 'شوالیه',
    createdAt: '۱۴۰۵/۰۱/۱۱ · ۱۱:۴۵',
    body: 'پیش‌فاکتور برای مشتری ارسال شد. @شوالیه لطفاً پیگیری تایید را انجام دهید.',
    mentions: ['شوالیه'],
    followUp: {
      date: '۱۴۰۵/۰۱/۱۲',
      time: '۱۶:۰۰',
      actionType: 'پیگیری پرداخت',
      title: 'پیگیری تایید پیش‌فاکتور',
      assignee: 'شوالیه',
      completed: false,
    },
  },
];

function formatActivityTimestamp(date = new Date()) {
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

function parseMentions(text) {
  const matches = text.match(/@([\u0600-\u06FFa-zA-Z]+)/g) || [];
  return [...new Set(matches.map((token) => token.slice(1)))];
}

export function getOrderCrmActivities(order) {
  if (order.crmActivities?.length) return order.crmActivities;
  return SAMPLE_ACTIVITIES;
}

export function getRoleLabel(role = CURRENT_USER_ROLE) {
  return CRM_ROLE_LABELS[role] || role;
}

export function createCrmActivity({
  type,
  body,
  author = CURRENT_USER,
  roleLabel = getRoleLabel(),
  followUp = null,
  payment = null,
}) {
  const trimmedBody = String(body || '').trim();
  const normalizedPayment = type === CRM_ACTIVITY_TYPES.PAYMENT && payment
    ? {
      amountRial: Number(payment.amountRial) || 0,
      date: String(payment.date || '').trim(),
      receiptFileName: String(payment.receiptFileName || '').trim(),
      receiptFileDataUrl: payment.receiptFileDataUrl || '',
      receiptMimeType: payment.receiptMimeType || '',
    }
    : null;

  return {
    id: activityIdCounter++,
    type,
    author,
    roleLabel,
    createdAt: formatActivityTimestamp(),
    body: trimmedBody || (normalizedPayment ? 'دریافت وجه' : ''),
    mentions: parseMentions(trimmedBody),
    followUp: followUp ? { ...followUp, completed: false } : null,
    payment: normalizedPayment,
  };
}

function buildCustomerPaymentFromActivity(activity) {
  if (activity?.type !== CRM_ACTIVITY_TYPES.PAYMENT || !activity.payment) return null;
  const amountRial = Number(activity.payment.amountRial) || 0;
  if (amountRial <= 0 || !activity.payment.date) return null;
  return {
    id: `crm-pay-${activity.id}`,
    date: activity.payment.date,
    amountRial,
    note: activity.body || 'دریافت وجه',
    receiptFileName: activity.payment.receiptFileName || '',
    receiptFileDataUrl: activity.payment.receiptFileDataUrl || '',
    receiptMimeType: activity.payment.receiptMimeType || '',
    sourceActivityId: activity.id,
  };
}

export function syncSaranjamCustomerPaymentsFromCrm(order, activities = getOrderCrmActivities(order)) {
  const crmPayments = (activities || [])
    .map(buildCustomerPaymentFromActivity)
    .filter(Boolean);
  const existing = order?.saranjam?.customerPayments || [];
  const manualPayments = existing.filter((pay) => !pay.sourceActivityId);
  const crmIds = new Set(crmPayments.map((pay) => pay.id));
  const retainedManual = manualPayments.filter((pay) => !crmIds.has(pay.id));

  return {
    ...order,
    saranjam: {
      ...(order.saranjam || {}),
      customerPayments: [...retainedManual, ...crmPayments],
    },
  };
}

export function listCrmPaymentsAsCustomerPayments(order) {
  return getOrderCrmActivities(order)
    .map(buildCustomerPaymentFromActivity)
    .filter(Boolean);
}

export function appendCrmActivity(order, activityInput) {
  const activity = createCrmActivity(activityInput);
  const withActivity = {
    ...order,
    crmActivities: [...getOrderCrmActivities(order), activity],
  };
  return syncSaranjamCustomerPaymentsFromCrm(withActivity);
}

export function getPendingCrmActivities(order) {
  return getOrderCrmActivities(order).filter(
    (activity) => activity.followUp && !activity.followUp.completed,
  );
}

export function formatFollowUpScheduleLabel(date, time) {
  if (!date || !time) return '—';
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(parsed);
      target.setHours(0, 0, 0, 0);
      const dayDiff = Math.round((target - today) / 86_400_000);
      const dateLabel = dayDiff === 0
        ? 'امروز'
        : dayDiff === 1
          ? 'فردا'
          : parsed.toLocaleDateString('fa-IR');
      return `${dateLabel} ساعت ${time}`;
    }
  }
  return `${date} · ${time}`;
}

export function getPendingActivityTitle(activity) {
  const meta = CRM_ACTIVITY_META[activity.type];
  const followUp = activity.followUp;
  if (!followUp) return meta?.label || 'فعالیت';
  const actionLabel = followUp.title || followUp.actionType || meta?.label || 'پیگیری';
  return `${actionLabel} - ${formatFollowUpScheduleLabel(followUp.date, followUp.time)}`;
}

export function updateCrmActivity(order, activityId, patch) {
  const activities = getOrderCrmActivities(order).map((activity) => {
    if (activity.id !== activityId) return activity;
    const nextType = patch.type ?? activity.type;
    const nextPayment = patch.payment !== undefined
      ? (
        nextType === CRM_ACTIVITY_TYPES.PAYMENT && patch.payment
          ? {
            amountRial: Number(patch.payment.amountRial) || 0,
            date: String(patch.payment.date || '').trim(),
            receiptFileName: String(patch.payment.receiptFileName || '').trim(),
            receiptFileDataUrl: patch.payment.receiptFileDataUrl || '',
            receiptMimeType: patch.payment.receiptMimeType || '',
          }
          : null
      )
      : activity.payment;
    return {
      ...activity,
      ...patch,
      payment: nextPayment,
      followUp: patch.followUp === undefined
        ? activity.followUp
        : patch.followUp,
      mentions: patch.body
        ? parseMentions(patch.body)
        : activity.mentions,
    };
  });
  return syncSaranjamCustomerPaymentsFromCrm({ ...order, crmActivities: activities }, activities);
}

export function completeCrmFollowUp(order, activityId) {
  const activities = getOrderCrmActivities(order).map((activity) => {
    if (activity.id !== activityId || !activity.followUp) return activity;
    return {
      ...activity,
      followUp: { ...activity.followUp, completed: true },
    };
  });
  return { ...order, crmActivities: activities };
}

export function filterCrmActivities(activities, filter) {
  if (filter === 'calls') {
    return activities.filter((a) => a.type === CRM_ACTIVITY_TYPES.CALL);
  }
  if (filter === 'notes') {
    return activities.filter((a) => a.type === CRM_ACTIVITY_TYPES.NOTE);
  }
  if (filter === 'reminders') {
    return activities.filter((a) => a.followUp && !a.followUp.completed);
  }
  return activities;
}
