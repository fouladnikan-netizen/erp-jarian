/**
 * Mowj Campaign lifecycle — allowed state transitions only.
 * Status vocabulary for Campaign Core (execution foundation).
 */

export const CAMPAIGN_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  READY: 'READY',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

export const CAMPAIGN_STATUS_LABELS = Object.freeze({
  DRAFT: 'پیش‌نویس',
  READY: 'آماده اجرا',
  RUNNING: 'در حال اجرا',
  PAUSED: 'متوقف',
  COMPLETED: 'تکمیل‌شده',
  CANCELLED: 'لغوشده',
});

/**
 * Directed graph of legal transitions.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const CAMPAIGN_STATUS_TRANSITIONS = Object.freeze({
  [CAMPAIGN_STATUS.DRAFT]: Object.freeze([
    CAMPAIGN_STATUS.READY,
    CAMPAIGN_STATUS.CANCELLED,
  ]),
  [CAMPAIGN_STATUS.READY]: Object.freeze([
    CAMPAIGN_STATUS.RUNNING,
    CAMPAIGN_STATUS.DRAFT,
    CAMPAIGN_STATUS.CANCELLED,
  ]),
  [CAMPAIGN_STATUS.RUNNING]: Object.freeze([
    CAMPAIGN_STATUS.PAUSED,
    CAMPAIGN_STATUS.COMPLETED,
    CAMPAIGN_STATUS.CANCELLED,
  ]),
  [CAMPAIGN_STATUS.PAUSED]: Object.freeze([
    CAMPAIGN_STATUS.RUNNING,
    CAMPAIGN_STATUS.COMPLETED,
    CAMPAIGN_STATUS.CANCELLED,
  ]),
  [CAMPAIGN_STATUS.COMPLETED]: Object.freeze([]),
  [CAMPAIGN_STATUS.CANCELLED]: Object.freeze([]),
});

/**
 * @param {string} from
 * @param {string} to
 */
export function canTransitionCampaignStatus(from, to) {
  const allowed = CAMPAIGN_STATUS_TRANSITIONS[String(from || '').toUpperCase()] || [];
  return allowed.includes(String(to || '').toUpperCase());
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {{ ok: boolean, error?: string }}
 */
export function assertCampaignTransition(from, to) {
  const source = String(from || '').toUpperCase();
  const target = String(to || '').toUpperCase();
  if (!CAMPAIGN_STATUS[source]) {
    return { ok: false, error: `وضعیت مبدأ نامعتبر: ${from}` };
  }
  if (!CAMPAIGN_STATUS[target]) {
    return { ok: false, error: `وضعیت مقصد نامعتبر: ${to}` };
  }
  if (!canTransitionCampaignStatus(source, target)) {
    return {
      ok: false,
      error: `گذار از ${CAMPAIGN_STATUS_LABELS[source]} به ${CAMPAIGN_STATUS_LABELS[target]} مجاز نیست.`,
    };
  }
  return { ok: true };
}

/** @param {string} status */
export function listCampaignTransitionsFrom(status) {
  return [...(CAMPAIGN_STATUS_TRANSITIONS[String(status || '').toUpperCase()] || [])];
}
