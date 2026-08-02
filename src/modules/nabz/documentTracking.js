/**
 * متن استاندارد واتساپ برای لینک امن پیش‌فاکتور (Path B).
 * @param {string} secureLink
 * @returns {string}
 */
export function createWhatsAppMessage(secureLink) {
  return [
    'سلام',
    '',
    'پیش فاکتور شما آماده است.',
    '',
    'از طریق لینک زیر می‌توانید آن را مشاهده نمایید:',
    '',
    secureLink,
    '',
    'این لینک همیشه آخرین نسخه را نمایش می‌دهد.',
    '',
    'با احترام',
    'پترو فولاد نیکان',
  ].join('\n');
}

/**
 * دادهٔ نمونه ردیابی سند — تا اتصال به API واقعی.
 */
export const MOCK_DOCUMENT_TRACKING = {
  documentId: 'PI-1405-00027',
  secureLink: 'https://jarian.ir/d/a8f9Ksj29P',
  status: 'opened',
  openedCount: 2,
  lastOpenedAt: 'امروز ۱۰:۱۲',
  stepTimes: {
    generated: 'امروز ۰۹:۴۲',
    sent: 'امروز ۰۹:۴۵',
    opened: 'امروز ۱۰:۱۲',
  },
};

export const TRACKING_STATUS_ORDER = ['generated', 'sent', 'opened'];

export function getTrackingStepState(status, stepId) {
  const doneIdx = TRACKING_STATUS_ORDER.indexOf(status);
  const idx = TRACKING_STATUS_ORDER.indexOf(stepId);
  if (doneIdx < 0 || idx < 0) return 'pending';
  if (idx < doneIdx) return 'done';
  if (idx === doneIdx) return 'current';
  return 'pending';
}

export function getTrackingStatusBadge(status) {
  if (status === 'opened') return { label: 'مشاهده‌شده', tone: 'viewed' };
  if (status === 'sent') return { label: 'ارسال‌شده', tone: 'sent' };
  return { label: 'آماده‌سازی', tone: 'generated' };
}
