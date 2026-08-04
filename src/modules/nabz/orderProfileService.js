import { ORDER_TABS, getStageLabel, STAGE_PISHKESH_ID, STAGE_KAVOSH_ID, STAGE_MOZENE_ID } from './config';
import { CURRENT_USER } from './constants';
import { getTodayJalali, getNowTimeFa } from './dateUtils';
import { buildStatusHistory, getEffectiveStageId } from './orderStageService';
import {
  getLatestProformaVersion,
  getProformaVersions,
  buildProformaFingerprint,
} from './proformaService';
import { createEntityId, ENTITY_ID_PREFIX } from '../../domain/identity';

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
    readOnly: Boolean(file.readOnly),
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
    readOnly: true,
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
        id: createEntityId(ENTITY_ID_PREFIX.PROFORMA_FILE, 'signed'),
        type: 'proforma_signed',
        at,
        summary: `پیش‌فاکتور ${meta.documentNumber || ''} مهر و امضا و در مستندات بایگانی شد`.trim(),
      },
    ],
  };
}

/**
 * هنگام به‌روزرسانی: نسخه مهرشده قبلی را در اسناد به‌صورت فقط‌خواندنی قفل/بایگانی می‌کند.
 */
export function archivePreviousSignedProforma(order) {
  const latest = getLatestProformaVersion(order);
  const docNumber = order.proforma?.signedDocumentNumber
    || latest?.documentNumber
    || null;
  if (!order.proforma?.signed && !order.proforma?.signedDocumentNumber) {
    return order;
  }

  const label = docNumber || order.code || '';
  const archiveName = `پیش‌فاکتور مهرشده ${label}.pdf`.trim();
  const alreadyArchived = getOrderProfileAttachments(order).some(
    (file) => file.name === archiveName && file.readOnly,
  );

  if (alreadyArchived) {
    return order;
  }

  const withAttachment = appendProfileAttachment(order, {
    name: archiveName,
    type: 'pdf',
    size: '۲۴۸ کیلوبایت',
    uploadedBy: 'سیستم به‌روزرسانی پیش‌فاکتور',
    note: 'بایگانی نسخه قبلی مهر و امضا شده — فقط خواندنی',
    readOnly: true,
  });

  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  return {
    ...withAttachment,
    events: [
      ...(withAttachment.events || []),
      {
        id: createEntityId(ENTITY_ID_PREFIX.PROFORMA_FILE, 'archive'),
        type: 'proforma_archived',
        at,
        summary: `نسخه قبلی پیش‌فاکتور ${label} در مستندات بایگانی شد`.trim(),
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
    if (event.type === 'revision_required') return; // shown via order.revisions
    entries.push({
      id: `event-${event.id}`,
      at: event.at,
      text: event.summary || event.type,
      kind: 'event',
      by: event.by,
    });
  });

  (order.revisions || []).forEach((revision) => {
    const atFa = revision.returnedAt
      ? new Date(revision.returnedAt).toLocaleString('fa-IR')
      : '—';
    entries.push({
      id: `revision-${revision.id}`,
      at: atFa,
      text: revision.changesSummary || 'عودت برای بازنگری',
      kind: 'revision',
      by: revision.returnedBy,
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
  // صدور/چاپ پیش‌فاکتور فقط در مرحله پیش‌کش و تا قبل از تعیین تکلیف نهایی
  return order.status === ORDER_TABS.CURRENT && order.stageId >= STAGE_PISHKESH_ID;
}

export function shouldShowIssueProforma(order) {
  if (order.status !== ORDER_TABS.CURRENT) return false;
  return order.stageId >= STAGE_PISHKESH_ID;
}

/** تعیین تکلیف فقط بعد از صدور و مهر/امضای پیش‌فاکتور */
export function shouldShowGatewayDecisionAction(order) {
  if (order.status !== ORDER_TABS.CURRENT) return false;
  return shouldShowIssueProforma(order) && Boolean(order.proforma?.signed);
}

/**
 * دکمه‌های پیش‌فاکتور در هدر پروفایل:
 * - هنوز صادر نشده → صدور
 * - صادر + امضا + بدون تغییر محتوا → به‌روزرسانی + نمایش
 * - هر تغییر در سفارش/قیمت/حاشیه → به‌جای نمایش، دوباره صدور
 * - صادر شده ولی هنوز امضا نشده و محتوا جاری → فقط نمایش
 * - پس از تایید/رد معامله (سفارش موفق یا ناموفق) هیچ‌کدام نمایش داده نمی‌شوند
 */
export function getProformaHeaderActions(order) {
  const empty = { showIssue: false, showView: false, showUpdate: false };
  if (!shouldShowIssueProforma(order)) return empty;

  const versions = getProformaVersions(order);
  const hasVersion = versions.length > 0;
  const archived = Boolean(
    order?.saranjam?.archivedAt || order?.saranjam?.locked || order?.archivedAt,
  );

  if (!hasVersion) {
    return archived
      ? empty
      : { showIssue: true, showView: false, showUpdate: false };
  }

  const latest = getLatestProformaVersion(order);
  const contentCurrent = Boolean(
    latest?.contentHash && latest.contentHash === buildProformaFingerprint(order),
  );
  const signed = Boolean(order.proforma?.signed);

  if (archived) {
    return { showIssue: false, showView: true, showUpdate: false };
  }

  if (!contentCurrent) {
    return { showIssue: true, showView: false, showUpdate: false };
  }

  if (signed) {
    return { showIssue: false, showView: true, showUpdate: true };
  }

  return { showIssue: false, showView: true, showUpdate: false };
}

/** @deprecated استفاده از getProformaHeaderActions */
export function shouldShowUpdateProforma(order) {
  return getProformaHeaderActions(order).showUpdate;
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
  const flags = getProformaHeaderActions(order);

  if (flags.showIssue) {
    actions.push({
      id: 'print-proforma',
      label: 'صدور پیش‌فاکتور',
      variant: 'primary',
    });
  }
  if (flags.showView) {
    actions.push({
      id: 'view-proforma',
      label: 'نمایش پیش‌فاکتور',
      variant: 'outline',
    });
  }
  if (flags.showUpdate) {
    actions.push({
      id: 'update-proforma',
      label: 'به‌روزرسانی پیش‌فاکتور',
      variant: 'outline',
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
