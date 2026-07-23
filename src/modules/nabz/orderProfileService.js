import { ORDER_TABS, getStageLabel, STAGE_PISHKESH_ID, STAGE_KAVOSH_ID, STAGE_MOZENE_ID } from './config';
import { CURRENT_USER } from './constants';
import { getTodayJalali, getNowTimeFa } from './dateUtils';
import { buildStatusHistory, getEffectiveStageId } from './orderStageService';

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
  const isBrowserFile = typeof File !== 'undefined' && file instanceof File;
  const mime = isBrowserFile ? file.type || '' : '';
  const type = file.type === 'pdf' || mime === 'application/pdf'
    ? 'pdf'
    : (mime.startsWith('image/') || file.type === 'image')
      ? 'image'
      : (file.type || 'file');

  const attachment = {
    id: attachmentIdCounter++,
    name: file.name,
    type,
    size: typeof file.size === 'string'
      ? file.size
      : file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} مگابایت`
        : `${Math.round((file.size || 0) / 1024)} کیلوبایت`,
    uploadedAt: new Date().toLocaleDateString('fa-IR'),
    uploadedBy: file.uploadedBy || 'کاربر جاری',
    note: file.note,
  };

  return {
    ...order,
    profileAttachments: [...getOrderProfileAttachments(order), attachment],
  };
}

export function appendSignedProformaRecord(order, meta = {}) {
  const withAttachment = appendProfileAttachment(order, {
    name: meta.name || `پیش‌فاکتور مهرشده ${meta.documentNumber || ''}.pdf`.trim(),
    type: 'pdf',
    size: meta.size || '۲۴۸ کیلوبایت',
    uploadedBy: 'سیستم مهر و امضا',
    note: meta.note || 'نسخه مهر و امضا شده پیش‌فاکتور',
  });

  const at = new Date().toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }) + ` · ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;

  return {
    ...withAttachment,
    proforma: {
      ...(withAttachment.proforma || {}),
      signed: true,
      signedAt: at,
      signedDocumentNumber: meta.documentNumber || null,
    },
    events: [
      ...(withAttachment.events || []),
      {
        id: `pf-signed-${Date.now()}`,
        type: 'proforma_signed',
        at,
        summary: `پیش‌فاکتور ${meta.documentNumber || ''} مهر و امضا و در مستندات بایگانی شد`.trim(),
      },
    ],
  };
}

export function getOrderProfileBreadcrumb() {
  return [
    { label: 'بازگشت به لیست سفارشات', to: '/nabz', isBack: true },
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
  // صدور/چاپ پیش‌فاکتور فقط در مرحله پیش‌کش (مظنه قبلاً تکمیل شده)
  return order.stageId >= STAGE_PISHKESH_ID;
}

export function shouldShowIssueProforma(order) {
  return order.stageId >= STAGE_PISHKESH_ID;
}

export function getOrderProfileNextAction(order) {
  const stageId = getEffectiveStageId(order);
  if (stageId === STAGE_KAVOSH_ID) {
    return { id: 'complete-kavosh', label: 'تکمیل کاوش' };
  }
  if (stageId === STAGE_MOZENE_ID) {
    return { id: 'complete-mozene', label: 'تکمیل مظنه' };
  }
  return null;
}

export function getOrderProfilePrimaryActions(order) {
  const actions = [];

  if (shouldShowIssueProforma(order)) {
    actions.push({
      id: 'print-proforma',
      label: 'صدور پیش‌فاکتور',
      variant: 'primary',
    });
  }

  return actions;
}

export function markOrderCancelled(order, failReason) {
  const reason = String(failReason || '').trim();
  if (!reason) return order;

  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  return {
    ...order,
    status: ORDER_TABS.FAILED,
    failReason: reason,
    events: [
      ...(order.events || []),
      {
        id: Date.now(),
        type: 'order_cancelled',
        at,
        by: CURRENT_USER,
        summary: `لغو سفارش ${order.code} — ${reason}`,
        failReason: reason,
      },
    ],
  };
}

export function markOrderArchived(order) {
  const at = new Date().toLocaleDateString('fa-IR');
  return {
    ...order,
    archivedAt: at,
    events: [
      ...(order.events || []),
      {
        id: Date.now(),
        type: 'order_archived',
        at,
        by: 'کاربر جاری',
        summary: `بایگانی سفارش ${order.code}`,
      },
    ],
  };
}

export function markOrderClosed(order) {
  const at = new Date().toLocaleDateString('fa-IR');
  return {
    ...order,
    closedAt: at,
    status: order.status === ORDER_TABS.FAILED ? order.status : ORDER_TABS.SUCCESS,
    events: [
      ...(order.events || []),
      {
        id: Date.now(),
        type: 'order_closed',
        at,
        by: 'کاربر جاری',
        summary: `بستن سفارش ${order.code}`,
      },
    ],
  };
}
