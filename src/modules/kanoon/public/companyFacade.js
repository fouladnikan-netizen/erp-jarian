/**
 * Kanoon public Company/ContactPerson surface.
 * Cross-module consumers must import from here — not useContactsStore.
 */
import {
  useContactsStore,
  CONTACT_RECORD_TYPES,
  LIFECYCLE_STAGES,
  RELATIONSHIP_LIFECYCLE_STAGES,
} from '../../../stores/useContactsStore.js';
import { useMockApi } from '../../../api/useMockApi.js';
import { listInteractions } from '../../pooyesh/interactionFacade.js';

export {
  CONTACT_RECORD_TYPES,
  LIFECYCLE_STAGES,
  RELATIONSHIP_LIFECYCLE_STAGES,
};

function contacts() {
  return useContactsStore.getState().contacts || [];
}

export function listCompanies({ includeInactive = false } = {}) {
  return contacts().filter((c) => {
    if (c.recordType === 'LEAD') return false;
    if (!includeInactive && c.isActive === false) return false;
    return true;
  });
}

export function getCompany(id) {
  if (id == null || id === '') return null;
  const company = contacts().find((c) => String(c.id) === String(id)) || null;
  if (!company || company.recordType === 'LEAD') return null;
  return company;
}

export function findCompany(predicate) {
  if (typeof predicate !== 'function') return null;
  return listCompanies().find(predicate) || null;
}

export function listContactPersons(companyId) {
  return useContactsStore.getState().listContactPersons(companyId) || [];
}

export function listRelatedPersons(companyId) {
  const company = getCompany(companyId);
  return Array.isArray(company?.relatedPersons) ? company.relatedPersons.map((p) => ({ ...p })) : [];
}

/** React: subscribe to company list (Kanoon-owned store behind public API). */
export function useCompanies(selector) {
  return useContactsStore(
    typeof selector === 'function'
      ? selector
      : (state) => state.contacts,
  );
}

export function useCompany(companyId) {
  return useContactsStore((state) => (
    state.contacts.find((c) => String(c.id) === String(companyId)) || null
  ));
}

export function useUpdateContactStage() {
  return useContactsStore((s) => s.updateContactStage);
}

export function useFetchCompanies() {
  return useContactsStore((s) => s.fetchContacts);
}

/** Commands — write path for Company aggregate */
export async function createCompany(payload) {
  return useContactsStore.getState().addContactAsync(payload);
}

/**
 * National ID → identity resolver (Linka via Backend) → Company.
 * SERVER_FIRST — cache updates only after API success.
 */
export async function createCompanyFromIdentity(input) {
  return useContactsStore.getState().createFromIdentityAsync(input);
}

export function updateCompany(companyId, patch) {
  useContactsStore.getState().updateContact(companyId, patch);
  return getCompany(companyId);
}

export function updateCompanyStage(companyId, newStage) {
  useContactsStore.getState().updateContactStage(companyId, newStage);
}

export async function fetchCompanies() {
  return useContactsStore.getState().fetchContacts();
}

export async function addContactPerson(companyId, person) {
  return useContactsStore.getState().addContactPersonAsync(companyId, person);
}

export async function updateContactPerson(companyId, personId, patch) {
  return useContactsStore.getState().updateContactPersonAsync(companyId, personId, patch);
}

export async function deleteContactPerson(companyId, personId) {
  return useContactsStore.getState().deleteContactPersonAsync(companyId, personId);
}

/** Legacy mock soft-CRM on Company document. API mode → Pooyesh Activity facade (DDL-26.9). */
export function listCompanyDocumentInteractions(companyId) {
  if (!useMockApi()) {
    return listInteractions(companyId);
  }
  const company = getCompany(companyId);
  const list = Array.isArray(company?.interactions) ? company.interactions : [];
  return list.map((item) => ({ ...item }));
}

export function addCompanyDocumentInteraction(companyId, note, nextFollowUpDate, type) {
  useContactsStore.getState().addInteraction(companyId, note, nextFollowUpDate, type);
}

export function updateCompanyDocumentInteraction(companyId, interactionId, changes) {
  return useContactsStore.getState().updateInteraction(companyId, interactionId, changes);
}

export function removeCompanyDocumentInteraction(companyId, interactionId) {
  return useContactsStore.getState().removeInteraction(companyId, interactionId);
}

export const companyFacade = {
  listCompanies,
  getCompany,
  findCompany,
  listContactPersons,
  listRelatedPersons,
  createCompany,
  createCompanyFromIdentity,
  updateCompany,
  updateCompanyStage,
  fetchCompanies,
  addContactPerson,
  updateContactPerson,
  deleteContactPerson,
};

export default companyFacade;
