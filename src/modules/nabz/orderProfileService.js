import { ORDER_TABS, ORDER_TAB_META, getStageLabel, STAGE_PISHKESH_ID, STAGE_KAVOSH_ID, STAGE_MOZENE_ID } from './config';
import { buildStatusHistory } from './orderStageService';

let commentIdCounter = 1000;
let attachmentIdCounter = 2000;

const SAMPLE_COMMENTS = [
  {
    id: 1,
    author: 'حسین کریمی',
    role: 'شوالیه',
    at: '۱۴۰۵/۰۱/۱۱ · ۱۰:۱۵',
    text: 'استعلام تیرآهن از دو تامین‌کننده ثبت شد. منتظر تایید مشتری برای انتخاب هدف هستیم.',
  },
  {
    id: 2,
    author: 'محمد رضایی',
    role: 'کارشناس مشتری',
    at: '۱۴۰۵/۰۱/۱۱ · ۱۱:۰۰',
    text: 'لطفاً پیش‌فاکتور رسمی با تحویل دو هفته‌ای ارسال شود.',
  },
];

const SAMPLE_ATTACHMENTS = [
  {
    id: 1,
    name: 'تاییدیه-مشتری.pdf',
    type: 'pdf',
    size: '۲۴۰ کیلوبایت',
    uploadedAt: '۱۴۰۵/۰۱/۱۱',
    uploadedBy: 'حسین کریمی',
  },
  {
    id: 2,
    name: 'فیش-واریزی.jpg',
    type: 'image',
    size: '۱.۲ مگابایت',
    uploadedAt: '۱۴۰۵/۰۱/۱۲',
    uploadedBy: 'محمد رضایی',
  },
];

export function getOrderProfileComments(order) {
  if (order.profileComments?.length) return order.profileComments;
  return SAMPLE_COMMENTS;
}

export function getOrderProfileAttachments(order) {
  if (order.profileAttachments?.length) return order.profileAttachments;
  return SAMPLE_ATTACHMENTS;
}

export function createProfileComment(order, text, author = 'کاربر جاری', role = 'شوالیه') {
  const now = new Date();
  const at = now.toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }) + ` · ${now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;

  return {
    id: commentIdCounter++,
    author,
    role,
    at,
    text: text.trim(),
  };
}

export function appendProfileComment(order, text) {
  const comment = createProfileComment(order, text);
  return {
    ...order,
    profileComments: [...getOrderProfileComments(order), comment],
  };
}

export function appendProfileAttachment(order, file) {
  const attachment = {
    id: attachmentIdCounter++,
    name: file.name,
    type: file.type?.startsWith('image/') ? 'image' : 'file',
    size: file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} مگابایت`
      : `${Math.round(file.size / 1024)} کیلوبایت`,
    uploadedAt: new Date().toLocaleDateString('fa-IR'),
    uploadedBy: 'کاربر جاری',
  };

  return {
    ...order,
    profileAttachments: [...getOrderProfileAttachments(order), attachment],
  };
}

export function getOrderProfileBreadcrumb(order) {
  const listLabel = ORDER_TAB_META[order.status]?.label
    ? `سفارشات ${ORDER_TAB_META[order.status].label}`
    : 'سفارشات جاری';
  return [
    { label: 'بازگشت به لیست سفارشات', to: '/nabz', isBack: true },
    { label: 'نبض', to: '/nabz' },
    { label: listLabel },
  ];
}

export function buildOrderActivityTimeline(order) {
  const entries = [];

  entries.push({
    id: 'created',
    at: `${order.registeredDate} · ${order.registeredTime || ''}`.trim(),
    text: `ثبت سفارش توسط ${order.assignee || '—'}`,
    kind: 'system',
  });

  (order.events || []).forEach((event) => {
    entries.push({
      id: `event-${event.id}`,
      at: event.at,
      text: event.summary || event.type,
      kind: 'event',
      by: event.by,
    });
  });

  buildStatusHistory(order).forEach((entry) => {
    if (!entry.isCurrent) return;
    entries.push({
      id: `stage-${entry.stageId}`,
      at: entry.at,
      text: `وضعیت فعلی: ${entry.stageLabel}`,
      kind: 'stage',
    });
  });

  if (order.inquiryCompletedAt) {
    entries.push({
      id: 'inquiry-done',
      at: order.inquiryCompletedAt,
      text: 'تکمیل کاوش و آماده‌سازی برای مظنه',
      kind: 'milestone',
    });
  }

  if (order.stageId >= STAGE_PISHKESH_ID) {
    entries.push({
      id: 'pishkesh',
      at: order.registeredDate,
      text: `تغییر وضعیت به ${getStageLabel(STAGE_PISHKESH_ID)}`,
      kind: 'milestone',
    });
  }

  return entries;
}

export function shouldShowPrintProforma(order) {
  return order.stageId >= STAGE_PISHKESH_ID;
}

export function getOrderProfileNextAction(order) {
  if (order.stageId === STAGE_KAVOSH_ID) {
    return { id: 'complete-kavosh', label: 'تایید استعلام‌ها و ورود به مظنه' };
  }
  if (order.stageId === STAGE_MOZENE_ID) {
    return { id: 'complete-mozene', label: 'صدور پیش‌فاکتور (پیش‌کش)' };
  }
  return null;
}

export function getOrderProfilePrimaryActions(order) {
  const actions = [];

  if (order.stageId >= STAGE_PISHKESH_ID) {
    actions.push({
      id: 'print-proforma',
      label: 'چاپ پیش‌فاکتور',
      variant: 'primary',
    });
  }

  return actions;
}

export function markOrderCancelled(order) {
  return {
    ...order,
    status: ORDER_TABS.FAILED,
    failReason: order.failReason || 'لغو توسط کاربر',
    events: [
      ...(order.events || []),
      {
        id: Date.now(),
        type: 'order_cancelled',
        at: new Date().toLocaleDateString('fa-IR'),
        by: 'کاربر جاری',
        summary: `لغو سفارش ${order.code}`,
      },
    ],
  };
}
