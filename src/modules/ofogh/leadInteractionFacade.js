/**
 * Ofogh Lead interactions — thin adapter over Pooyesh polymorphic facade (DDL-14/15).
 * Does not import stores; Pooyesh owns Activity persistence.
 */

import { rawLeadReference } from '../../domain/entityReference';
import {
  createRawLeadInteraction,
  listInteractions,
  fetchInteractions,
} from '../pooyesh/interactionFacade.js';

export function listLeadInteractions(leadId) {
  return listInteractions(rawLeadReference(leadId));
}

export async function fetchLeadInteractions(leadId) {
  return fetchInteractions(rawLeadReference(leadId));
}

export function createLeadInteraction(leadId, payload = {}) {
  return createRawLeadInteraction(leadId, payload);
}

export const leadInteractionFacade = {
  listLeadInteractions,
  fetchLeadInteractions,
  createLeadInteraction,
};

export default leadInteractionFacade;
