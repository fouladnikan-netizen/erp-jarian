/**
 * Audience levels — B2B recipients are always Kanoon related persons.
 *
 * Flow: Company (Kanoon) → Related Persons → Campaign audience
 * Company attributes are filter criteria only — never campaign recipients.
 *
 * Stored shape (compat):
 *   targetLevel: PERSON (always for new/normalized defs)
 *   source:      KANOON_PERSON
 *
 * COMPANY / KANOON_COMPANY remain as deprecated legacy values and migrate on normalize.
 */

export const AUDIENCE_TARGET_LEVEL = Object.freeze({
  /** @deprecated companies are not campaign recipients — migrates to PERSON */
  COMPANY: 'COMPANY',
  PERSON: 'PERSON',
});

export const AUDIENCE_TARGET_LEVEL_LABELS = Object.freeze({
  COMPANY: 'افراد مرتبط (از شرکت‌ها)',
  PERSON: 'افراد مرتبط کانون',
});

export const AUDIENCE_TARGET_LEVEL_HINTS = Object.freeze({
  COMPANY: 'منسوخ — مخاطب همیشه افراد مرتبط است',
  PERSON: 'پیامک، ایمیل، دعوت و نظرسنجی به افراد مرتبط ارسال می‌شود',
});

/** Canonical ERP ownership source for audience (Kanoon related persons). */
export const AUDIENCE_SOURCE_TYPE = Object.freeze({
  /** @deprecated company is filter criteria, not audience source */
  KANOON_COMPANY: 'KANOON_COMPANY',
  KANOON_PERSON: 'KANOON_PERSON',
  /** @deprecated use KANOON_PERSON */
  COMPANY: 'KANOON_COMPANY',
  /** @deprecated migrated to KANOON_PERSON */
  CONTACT: 'CONTACT',
  /** @deprecated migrated to KANOON_PERSON */
  LEAD: 'LEAD',
  /** @deprecated migrated to KANOON_PERSON */
  CUSTOMER: 'CUSTOMER',
  /** @deprecated migrated to KANOON_PERSON */
  ORDER_BASED: 'ORDER_BASED',
});

export const AUDIENCE_SOURCE_TYPE_LABELS = Object.freeze({
  KANOON_COMPANY: 'شرکت‌های کانون (فیلتر)',
  KANOON_PERSON: 'افراد مرتبط کانون',
  COMPANY: 'شرکت‌های کانون (فیلتر)',
  CONTACT: 'مخاطبین کانون (قدیمی)',
  LEAD: 'سرنخ افق (قدیمی)',
  CUSTOMER: 'مشتریان نبض (قدیمی)',
  ORDER_BASED: 'سفارش نبض (قدیمی)',
});

/** Canonical source for new definitions — always related persons */
export const AUDIENCE_CANONICAL_SOURCES = Object.freeze([
  AUDIENCE_SOURCE_TYPE.KANOON_PERSON,
]);

const LEVEL_SET = new Set(Object.values(AUDIENCE_TARGET_LEVEL));
const CANONICAL_SOURCE_SET = new Set(AUDIENCE_CANONICAL_SOURCES);
const LEGACY_SOURCE_SET = new Set([
  'COMPANY',
  'CONTACT',
  'CUSTOMER',
  'LEAD',
  'ORDER_BASED',
  'OFOGH_LEADS',
  'KANOON_CONTACTS',
  'KANOON_COMPANY',
]);

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeAudienceTargetLevel(value) {
  const raw = String(value || AUDIENCE_TARGET_LEVEL.PERSON).toUpperCase();
  // B2B: always PERSON recipients (legacy COMPANY migrates here)
  if (raw === AUDIENCE_TARGET_LEVEL.COMPANY || LEVEL_SET.has(raw)) {
    return AUDIENCE_TARGET_LEVEL.PERSON;
  }
  return AUDIENCE_TARGET_LEVEL.PERSON;
}

/**
 * @param {string} [_targetLevel]
 * @returns {string}
 */
export function audienceSourceForTargetLevel(_targetLevel) {
  return AUDIENCE_SOURCE_TYPE.KANOON_PERSON;
}

/**
 * @param {string} [_source]
 * @returns {string}
 */
export function audienceTargetLevelForSource(_source) {
  return AUDIENCE_TARGET_LEVEL.PERSON;
}

/**
 * Normalize source to KANOON_PERSON (B2B recipients).
 *
 * @param {unknown} sourceValue
 * @param {unknown} [_targetLevelValue]
 * @returns {string}
 */
export function normalizeAudienceSource(sourceValue, _targetLevelValue) {
  const raw = String(sourceValue || '').toUpperCase();
  if (raw === AUDIENCE_SOURCE_TYPE.KANOON_PERSON || raw === 'PERSON') {
    return AUDIENCE_SOURCE_TYPE.KANOON_PERSON;
  }
  if (LEGACY_SOURCE_SET.has(raw) || !raw || raw === AUDIENCE_SOURCE_TYPE.KANOON_COMPANY) {
    return AUDIENCE_SOURCE_TYPE.KANOON_PERSON;
  }
  return AUDIENCE_SOURCE_TYPE.KANOON_PERSON;
}

/**
 * Always PERSON + KANOON_PERSON — company is never the campaign recipient.
 *
 * @param {{ source?: unknown, sourceType?: unknown, targetLevel?: unknown }} [_input]
 * @returns {{ source: string, targetLevel: string }}
 */
export function resolveAudienceSourceAndLevel(_input = {}) {
  return {
    source: AUDIENCE_SOURCE_TYPE.KANOON_PERSON,
    targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
  };
}

/**
 * @param {unknown} source
 * @returns {boolean}
 */
export function isCanonicalAudienceSource(source) {
  const raw = String(source || '').toUpperCase();
  return CANONICAL_SOURCE_SET.has(raw) || raw === AUDIENCE_SOURCE_TYPE.KANOON_COMPANY;
}
