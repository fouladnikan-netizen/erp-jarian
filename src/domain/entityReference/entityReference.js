/**
 * Polymorphic ERP entity reference (DDL-14).
 * Reusable across Pooyesh, Nabz gates, Mowj, Gahshomar.
 */

export const ENTITY_REF_TYPE = Object.freeze({
  COMPANY: 'COMPANY',
  RAW_LEAD: 'RAW_LEAD',
});

export const ENTITY_REF_TYPES = Object.freeze(Object.values(ENTITY_REF_TYPE));

/**
 * @param {unknown} input
 * @returns {{ entityType: string, entityId: string }|null}
 */
export function normalizeEntityReference(input) {
  if (!input || typeof input !== 'object') return null;
  const entityType = String(input.entityType || input.type || '').trim().toUpperCase();
  const entityId = String(input.entityId || input.id || '').trim();
  if (!entityId) return null;
  if (!ENTITY_REF_TYPES.includes(entityType)) return null;
  return { entityType, entityId };
}

/**
 * @param {unknown} input
 * @returns {{ ok: true, ref: { entityType: string, entityId: string } }|{ ok: false, error: string, code: string }}
 */
export function parseEntityReference(input) {
  const ref = normalizeEntityReference(input);
  if (!ref) {
    return {
      ok: false,
      code: 'INVALID_ENTITY_REFERENCE',
      error: 'مرجع موجودیت نامعتبر است.',
    };
  }
  return { ok: true, ref };
}

export function companyReference(entityId) {
  return { entityType: ENTITY_REF_TYPE.COMPANY, entityId: String(entityId) };
}

export function rawLeadReference(entityId) {
  return { entityType: ENTITY_REF_TYPE.RAW_LEAD, entityId: String(entityId) };
}

/**
 * Legacy Mowj/Pooyesh shapes → EntityReference
 * @param {object} intent
 */
export function subjectFromTaskIntent(intent = {}) {
  if (intent.subject) {
    return normalizeEntityReference(intent.subject);
  }
  if (intent.companyReference?.companyId) {
    return companyReference(intent.companyReference.companyId);
  }
  if (intent.rawLeadReference?.leadId || intent.rawLeadReference?.entityId) {
    return rawLeadReference(
      intent.rawLeadReference.leadId || intent.rawLeadReference.entityId,
    );
  }
  if (intent.leadId) {
    return rawLeadReference(intent.leadId);
  }
  if (intent.companyId) {
    return companyReference(intent.companyId);
  }
  return null;
}

export default {
  ENTITY_REF_TYPE,
  ENTITY_REF_TYPES,
  normalizeEntityReference,
  parseEntityReference,
  companyReference,
  rawLeadReference,
  subjectFromTaskIntent,
};
