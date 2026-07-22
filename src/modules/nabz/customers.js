import { initialContacts } from '../kanoon/contactsData';
import { getDisplayName, getLatestInteraction } from '../kanoon/columns';
import { BEHAVIORAL_STATUS, ENTITY_TYPES, PERSON_TYPES } from '../kanoon/config';

/** In-memory registry — supports quick-add from Nabz create-order flow */
let contactsRegistry = initialContacts.map((contact) => ({ ...contact }));

function nextContactId() {
  return contactsRegistry.reduce((max, contact) => Math.max(max, contact.id), 0) + 1;
}

export function getCustomerById(id) {
  if (!id) return null;
  return contactsRegistry.find((c) => c.id === id) || null;
}

export function listCustomers() {
  return contactsRegistry.filter(
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

export function listCustomerExperts(customerId) {
  const customer = getCustomerById(customerId);
  if (!customer) return [];

  const experts = [...(customer.relatedPersons || [])];

  if (customer.personType === PERSON_TYPES.NATURAL && customer.personName) {
    experts.unshift({
      name: customer.personName,
      mobile: customer.mobile || '',
      role: 'مشتری',
      notes: '',
    });
  }

  return experts;
}

export function searchCustomerExperts(customerId, query) {
  const experts = listCustomerExperts(customerId);
  const q = (query || '').trim().toLowerCase();
  if (!q) return experts.slice(0, 12);

  return experts.filter((person) => {
    const haystack = [person.name, person.mobile, person.role, person.notes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  }).slice(0, 12);
}

export function expertKey(person) {
  return `${person.name}::${person.mobile || ''}`;
}

export function findExpertByKey(customerId, key) {
  if (!key) return null;
  return listCustomerExperts(customerId).find((person) => expertKey(person) === key) || null;
}

export function addCustomerRecord(contact) {
  const record = { ...contact, id: nextContactId() };
  contactsRegistry = [...contactsRegistry, record];
  return record;
}

export function addExpertToCustomer(customerId, person) {
  contactsRegistry = contactsRegistry.map((contact) => {
    if (contact.id !== customerId) return contact;
    return {
      ...contact,
      relatedPersons: [...(contact.relatedPersons || []), person],
    };
  });
  return getCustomerById(customerId);
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
