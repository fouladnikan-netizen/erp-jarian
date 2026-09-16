/**
 * Scheduling contracts for automation intents — no cron / worker.
 */

export const SCHEDULE_KIND = Object.freeze({
  IMMEDIATE: 'IMMEDIATE',
  DELAY: 'DELAY',
  SCHEDULED_DATE: 'SCHEDULED_DATE',
});

export const SCHEDULE_KIND_LABELS = Object.freeze({
  IMMEDIATE: 'بلافاصله',
  DELAY: 'با تأخیر',
  SCHEDULED_DATE: 'تاریخ زمان‌بندی‌شده',
});

const KIND_SET = new Set(Object.values(SCHEDULE_KIND));

/**
 * @typedef {object} AutomationSchedule
 * @property {string} kind
 * @property {number|null} delayMs
 * @property {number|null} delayHours
 * @property {number|null} delayDays
 * @property {string|null} scheduledAt  ISO
 */

/**
 * @param {unknown} input
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateAutomationSchedule(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['زمان‌بندی نامعتبر است.'] };
  }
  const kind = String(input.kind || '').toUpperCase();
  if (!KIND_SET.has(kind)) {
    errors.push(`نوع زمان‌بندی نامعتبر: ${input.kind || '—'}`);
    return { ok: false, errors };
  }
  if (kind === SCHEDULE_KIND.DELAY) {
    const hours = input.delayHours != null ? Number(input.delayHours) : null;
    const days = input.delayDays != null ? Number(input.delayDays) : null;
    const ms = input.delayMs != null ? Number(input.delayMs) : null;
    const hasDelay = (hours != null && hours > 0)
      || (days != null && days > 0)
      || (ms != null && ms > 0);
    if (!hasDelay) {
      errors.push('زمان‌بندی DELAY نیاز به delayHours / delayDays / delayMs مثبت دارد.');
    }
  }
  if (kind === SCHEDULE_KIND.SCHEDULED_DATE) {
    if (!input.scheduledAt || Number.isNaN(Date.parse(String(input.scheduledAt)))) {
      errors.push('زمان‌بندی SCHEDULED_DATE نیاز به scheduledAt معتبر دارد.');
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * @param {object} [input]
 * @returns {AutomationSchedule}
 */
export function normalizeAutomationSchedule(input = {}) {
  let kind = String(input.kind || SCHEDULE_KIND.IMMEDIATE).toUpperCase();
  if (!KIND_SET.has(kind)) kind = SCHEDULE_KIND.IMMEDIATE;

  let delayHours = input.delayHours != null && Number.isFinite(Number(input.delayHours))
    ? Number(input.delayHours)
    : null;
  let delayDays = input.delayDays != null && Number.isFinite(Number(input.delayDays))
    ? Number(input.delayDays)
    : null;
  let delayMs = input.delayMs != null && Number.isFinite(Number(input.delayMs))
    ? Number(input.delayMs)
    : null;

  if (kind === SCHEDULE_KIND.DELAY) {
    if (delayMs == null) {
      delayMs = 0;
      if (delayHours != null) delayMs += delayHours * 60 * 60 * 1000;
      if (delayDays != null) delayMs += delayDays * 24 * 60 * 60 * 1000;
    }
  } else {
    delayHours = null;
    delayDays = null;
    delayMs = null;
  }

  return {
    kind,
    delayMs: kind === SCHEDULE_KIND.DELAY ? delayMs : null,
    delayHours: kind === SCHEDULE_KIND.DELAY ? delayHours : null,
    delayDays: kind === SCHEDULE_KIND.DELAY ? delayDays : null,
    scheduledAt: kind === SCHEDULE_KIND.SCHEDULED_DATE
      ? String(input.scheduledAt)
      : null,
  };
}

/**
 * Derive schedule from trigger rule delay defaults / params.
 * @param {object|null} triggerRule
 * @returns {AutomationSchedule}
 */
export function scheduleFromTriggerRule(triggerRule) {
  if (!triggerRule) {
    return normalizeAutomationSchedule({ kind: SCHEDULE_KIND.IMMEDIATE });
  }
  const params = triggerRule.params || {};
  if (params.scheduledAt) {
    return normalizeAutomationSchedule({
      kind: SCHEDULE_KIND.SCHEDULED_DATE,
      scheduledAt: params.scheduledAt,
    });
  }
  if (params.delayHours != null || params.delayDays != null || params.delayMs != null) {
    return normalizeAutomationSchedule({
      kind: SCHEDULE_KIND.DELAY,
      delayHours: params.delayHours,
      delayDays: params.delayDays,
      delayMs: params.delayMs,
    });
  }

  // Catalog defaults expressed as Persian labels / known codes
  const code = String(triggerRule.code || '').toUpperCase();
  if (code === 'SHIPMENT_48H' || triggerRule.defaultDelay === '۴۸ ساعت') {
    return normalizeAutomationSchedule({ kind: SCHEDULE_KIND.DELAY, delayHours: 48 });
  }
  if (code === 'NO_FOLLOWUP_7D' || triggerRule.defaultDelay === '۷ روز') {
    return normalizeAutomationSchedule({ kind: SCHEDULE_KIND.DELAY, delayDays: 7 });
  }

  return normalizeAutomationSchedule({ kind: SCHEDULE_KIND.IMMEDIATE });
}

/**
 * Validate delay rule specifically (for tests / UI).
 * @param {object} rule  { delayHours?, delayDays?, delayMs? }
 */
export function validateDelayRule(rule = {}) {
  return validateAutomationSchedule({
    kind: SCHEDULE_KIND.DELAY,
    ...rule,
  });
}
