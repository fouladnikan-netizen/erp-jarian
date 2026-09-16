/**
 * Canonical Contact API (DDL-26).
 */
import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';

/** Map backend relationship row → legacy relatedPersons UI shape. */
export function mapRelationshipToPerson(entry, companyId) {
  if (!entry?.contact) return null;
  const { contact } = entry;
  const roleTitle = entry.roleTitle || '';
  return {
    id: contact.id,
    companyId,
    fullName: contact.fullName || '',
    mobile: contact.mobile || '',
    email: contact.email || '',
    jobPosition: roleTitle,
    roleTitle,
    isPrimary: Boolean(entry.isPrimary),
    relationshipId: entry.id || entry.relationshipId || null,
    canonicalContactId: contact.id,
    ...(contact.payload && typeof contact.payload === 'object' ? contact.payload : {}),
  };
}

export const ContactRepository = {
  async listByCompany(companyId) {
    if (useMockApi()) return [];
    const { data } = await apiClient.get(`/contacts/company/${companyId}`);
    return data.items || [];
  },

  async create(body) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/contacts', body);
    return data;
  },

  async link(body) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/contacts/link', body);
    return data;
  },

  async updateContact(contactId, body) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/contacts/${contactId}`, body);
    return data.contact;
  },

  async updateRelationship(relationshipId, body) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/contacts/relationships/${relationshipId}`, body);
    return data.relationship;
  },

  async endRelationship(relationshipId) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post(`/contacts/relationships/${relationshipId}/end`);
    return data;
  },
};

export default ContactRepository;
