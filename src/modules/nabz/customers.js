import { initialContacts } from '../kanoon/contactsData';
import { getDisplayName, getLatestInteraction } from '../kanoon/columns';
import { BEHAVIORAL_STATUS, ENTITY_TYPES, PERSON_TYPES } from '../kanoon/config';

export function getCustomerById(id) {
  if (!id) return null;
  return initialContacts.find((c) => c.id === id) || null;
}

export function listCustomers() {
  return initialContacts.filter(
    (c) => c.entityType === ENTITY_TYPES.CUSTOMER && c.isActive !== false,
  );
}

export function searchCustomers(query) {
  const q = (query || '').trim().toLowerCase();
  const customers = listCustomers();
  if (!q) return customers.slice(0, 12);

  return customers.filter((contact) => {
    const haystack = [
      getDisplayName(contact),
      contact.province,
      contact.activityDomain,
      contact.mobile,
      contact.nationalId,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  }).slice(0, 12);
}

export function getCustomerPreview(customerId) {
  const contact = getCustomerById(customerId);
  if (!contact) return null;

  const latestInteraction = getLatestInteraction(contact);
  const behavioral = BEHAVIORAL_STATUS[contact.behavioralStatus];

  return {
    id: contact.id,
    name: getDisplayName(contact),
    personType: contact.personType,
    province: contact.province,
    activityDomain: contact.activityDomain,
    behavioralLabel: behavioral?.label,
    assignee: contact.assignee?.name,
    assigneeRole: contact.assignee?.role,
    phone: contact.officialSpecs?.phone || contact.mobile,
    address: contact.fullAddress || contact.officialSpecs?.address,
    openOrders: contact.analytics?.openOrders ?? (contact.relatedOrders || []).length,
    interactionValue: contact.analytics?.interactionValue,
    relatedPersons: (contact.relatedPersons || []).slice(0, 3),
    latestInteraction,
  };
}

export function isLegalCustomer(customerId) {
  const contact = getCustomerById(customerId);
  return contact?.personType === PERSON_TYPES.LEGAL;
}
