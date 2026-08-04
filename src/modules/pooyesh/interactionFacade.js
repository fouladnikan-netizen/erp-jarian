/**
 * Pooyesh Interaction Facade (DDL-09)
 *
 * Canonical entry point for soft customer interactions.
 * UI and projections must use this module — never read/write
 * `company.interactions` or call `useContactsStore.addInteraction` directly.
 *
 * Current storage (temporary):
 *   Facade → useContactsStore → Company.interactions
 *
 * Future storage (no UI change):
 *   Facade → Pooyesh Activity SSOT / API
 *
 * @see Docs/architecture/DOMAIN_DECISION_LOG.md DDL-09
 */

import { useContactsStore } from '../../stores/useContactsStore';

function findCompany(companyId) {
  if (companyId == null || companyId === '') return null;
  return useContactsStore.getState().contacts.find(
    (contact) => String(contact.id) === String(companyId),
  ) || null;
}

/**
 * @param {string|number} companyId
 * @returns {Array<object>}
 */
export function listCompanyInteractions(companyId) {
  const company = findCompany(companyId);
  const list = Array.isArray(company?.interactions) ? company.interactions : [];
  return list.map((item) => ({ ...item }));
}

/**
 * Create a Company-scoped soft interaction (Pooyesh write path).
 *
 * @param {string|number} companyId
 * @param {{
 *   note?: string,
 *   summary?: string,
 *   type?: string,
 *   nextFollowUpDate?: string|null,
 *   nextFollowUp?: string|null,
 * }} payload
 * @returns {object|null} created interaction snapshot, or null if rejected
 */
export function createCompanyInteraction(companyId, payload = {}) {
  const note = String(payload.note ?? payload.summary ?? '').trim();
  if (!note || companyId == null || companyId === '') return null;

  const type = payload.type || 'note';
  const nextFollowUpDate = payload.nextFollowUpDate ?? payload.nextFollowUp ?? null;

  const before = listCompanyInteractions(companyId);
  useContactsStore.getState().addInteraction(companyId, note, nextFollowUpDate, type);
  const after = listCompanyInteractions(companyId);

  if (after.length <= before.length) return null;
  return after[0] || null;
}

/** @deprecated Prefer `createCompanyInteraction` — kept for DDL-09 rollout aliases. */
export function addCompanyInteraction(companyId, payload = {}) {
  return createCompanyInteraction(companyId, payload);
}

/**
 * @param {string|number} companyId
 * @param {string|number} interactionId
 * @param {Record<string, unknown>} changes
 * @returns {object|null}
 */
export function updateCompanyInteraction(companyId, interactionId, changes = {}) {
  const ok = useContactsStore.getState().updateInteraction(companyId, interactionId, changes);
  if (!ok) return null;
  return listCompanyInteractions(companyId).find(
    (item) => String(item.id) === String(interactionId),
  ) || null;
}

/**
 * @param {string|number} companyId
 * @param {string|number} interactionId
 * @returns {boolean}
 */
export function removeCompanyInteraction(companyId, interactionId) {
  return Boolean(
    useContactsStore.getState().removeInteraction(companyId, interactionId),
  );
}

export const interactionFacade = {
  listCompanyInteractions,
  createCompanyInteraction,
  addCompanyInteraction,
  updateCompanyInteraction,
  removeCompanyInteraction,
};

export default interactionFacade;
