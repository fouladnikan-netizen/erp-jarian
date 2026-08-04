/**
 * Shared Entity Identity — NEW records only.
 *
 * Existing seed / in-memory IDs are never rewritten by this module.
 * Prefer createEntityId(prefix, …parts) for string identities.
 * Prefer createNumericId() when the consumer historically used number ids
 * (Order events, Contact aggregate root ids).
 *
 * @see Docs/architecture/ENTITY_OWNERSHIP.md
 */

/** Stable prefixes for string entity ids (new records). */
export const ENTITY_ID_PREFIX = Object.freeze({
  CONTACT_PERSON: 'cp',
  /** Legacy saranjam payment prefix — same string as CONTACT_PERSON; disambiguate by parent aggregate. */
  CUSTOMER_PAYMENT: 'cp',
  SUPPLIER_PAYMENT: 'sp',
  INTERACTION: 'int',
  NOTIFICATION: 'ntf',
  USER: 'u',
  CAMPAIGN: 'cmp',
  SURVEY: 'survey',
  SURVEY_BLOCK: 'blk',
  REVISION: 'rev',
  TADAROK_LINE: 'tl',
  ORG_DEPT: 'dept',
  ORG_USER_NODE: 'user',
  LOADING_ASSIGNMENT: 'LA',
  PROFORMA_FILE: 'pf',
  NATURAL_SELF: 'self',
  FOLLOWUP: 'fu',
});

let sequence = 0;

function nextSeq() {
  sequence = (sequence + 1) % 10000;
  return sequence;
}

/**
 * @param {string} prefix — from ENTITY_ID_PREFIX or custom
 * @param {...(string|number)} parts — optional stable segments (e.g. companyId)
 * @returns {string}
 */
export function createEntityId(prefix, ...parts) {
  const stamp = Date.now().toString(36);
  const seq = nextSeq().toString(36);
  const extras = parts
    .filter((p) => p !== undefined && p !== null && String(p).length > 0)
    .map(String);
  if (extras.length) {
    return `${prefix}-${extras.join('-')}-${stamp}${seq}`;
  }
  const entropy = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${stamp}-${entropy}${seq}`;
}

/**
 * Numeric id for aggregates that already use numbers (Contact root, Order events).
 * Not a UUID — uniqueness is session-local.
 * @returns {number}
 */
export function createNumericId() {
  return Date.now() * 1000 + nextSeq();
}

/**
 * Reserved synthetic ContactPerson id for a natural-person Company.
 * Format kept stable for Nabz/Ofogh consumers.
 * @param {string|number} companyId
 * @returns {string}
 */
export function naturalPersonSelfId(companyId) {
  return `${ENTITY_ID_PREFIX.NATURAL_SELF}-${companyId}`;
}

/**
 * @param {string|number} companyId
 * @returns {string}
 */
export function createContactPersonId(companyId) {
  return createEntityId(ENTITY_ID_PREFIX.CONTACT_PERSON, companyId);
}

/**
 * @param {string|number} companyId
 * @returns {string}
 */
export function createInteractionId(companyId) {
  return createEntityId(ENTITY_ID_PREFIX.INTERACTION, companyId);
}
