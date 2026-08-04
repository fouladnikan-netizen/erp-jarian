/**
 * Pooyesh Company Timeline Facade
 *
 * Pooyesh owns the activity-timeline *experience* and soft activity writes.
 * Event payloads remain cross-domain read projections (orders, interactions,
 * future finance/correspondence adapters) — the facade does not own source SoR.
 *
 * Current wiring (temporary):
 *   getCompanyTimeline → contacts + Nabz orders + projections/companyTimeline
 *   createActivity → interactionFacade.createCompanyInteraction
 *
 * @see Docs/architecture/DOMAIN_DECISION_LOG.md — Timeline Ownership Boundary
 */

import { useContactsStore } from '../../../stores/useContactsStore';
import { useNabzStore } from '../../nabz/store/useNabzStore';
import { buildCompanyTimelineEvents } from '../../../projections/companyTimeline';
import {
  createCompanyInteraction,
  listCompanyInteractions,
} from '../interactionFacade';

function findCompany(companyId) {
  if (companyId == null || companyId === '') return null;
  return useContactsStore.getState().contacts.find(
    (contact) => String(contact.id) === String(companyId),
  ) || null;
}

/**
 * Chronological company activity / event stream for the profile timeline UI.
 * @param {string|number} companyId
 * @param {{ orders?: Array<object> }} [options]
 * @returns {Array<object>}
 */
export function getCompanyTimeline(companyId, options = {}) {
  const company = findCompany(companyId);
  if (!company) return [];

  const orders = options.orders ?? useNabzStore.getState().orders ?? [];
  return buildCompanyTimelineEvents(company, orders);
}

/**
 * Soft Pooyesh activity (note/call/meeting/…). Alias of interaction create.
 * @param {string|number} companyId
 * @param {object} payload
 * @returns {object|null}
 */
export function createActivity(companyId, payload = {}) {
  return createCompanyInteraction(companyId, payload);
}

/**
 * Soft interactions only (no order/payment projection).
 * @param {string|number} companyId
 */
export function listCompanyActivities(companyId) {
  return listCompanyInteractions(companyId);
}

export const companyTimelineFacade = {
  getCompanyTimeline,
  createActivity,
  listCompanyActivities,
};

export default companyTimelineFacade;
