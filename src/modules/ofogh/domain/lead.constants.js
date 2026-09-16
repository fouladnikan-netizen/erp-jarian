/**
 * Ofogh Raw Lead — independent aggregate (DDL-13), outside Kanoon Company.
 * Owner: Ofogh. Never a Company until conversion.
 *
 * Domain lifecycle: NEW | QUALIFYING | CONVERTED | REJECTED
 * UI compatibility: OPEN covers pre-convert (NEW/QUALIFYING) for existing filters.
 */

export const LEAD_STATUS = Object.freeze({
  /** Umbrella for NEW/QUALIFYING — UI filters / legacy */
  OPEN: 'OPEN',
  CONVERTED: 'CONVERTED',
  REJECTED: 'REJECTED',
  NEW: 'NEW',
  QUALIFYING: 'QUALIFYING',
});

export const LEAD_STATUS_LABELS = Object.freeze({
  [LEAD_STATUS.OPEN]: 'سرنخ خام',
  [LEAD_STATUS.NEW]: 'جدید',
  [LEAD_STATUS.QUALIFYING]: 'در حال بررسی',
  [LEAD_STATUS.CONVERTED]: 'تبدیل‌شده',
  [LEAD_STATUS.REJECTED]: 'ردشده',
});

/**
 * Status transitions allowed via PATCH …/status (mirrors backend).
 * CONVERTED is never selectable here — only via convert flow.
 */
export const LEAD_STATUS_TRANSITIONS = Object.freeze({
  [LEAD_STATUS.NEW]: [LEAD_STATUS.QUALIFYING, LEAD_STATUS.REJECTED],
  [LEAD_STATUS.QUALIFYING]: [LEAD_STATUS.REJECTED],
  [LEAD_STATUS.OPEN]: [LEAD_STATUS.QUALIFYING, LEAD_STATUS.REJECTED],
  [LEAD_STATUS.CONVERTED]: [],
  [LEAD_STATUS.REJECTED]: [],
});

/** Pre-convert leads (pipeline open) — OPEN alias or backend NEW/QUALIFYING */
export function isOpenLeadStatus(status) {
  return (
    status === LEAD_STATUS.OPEN
    || status === LEAD_STATUS.NEW
    || status === LEAD_STATUS.QUALIFYING
  );
}

export function getLeadStatusLabel(status) {
  return LEAD_STATUS_LABELS[status] || '—';
}

/** @param {string} status */
export function getAllowedLeadStatusTransitions(status) {
  const key = status === LEAD_STATUS.OPEN ? LEAD_STATUS.NEW : status;
  return [...(LEAD_STATUS_TRANSITIONS[key] || [])];
}

export function isLeadStatusTerminal(status) {
  return status === LEAD_STATUS.CONVERTED || status === LEAD_STATUS.REJECTED;
}

export default LEAD_STATUS;
