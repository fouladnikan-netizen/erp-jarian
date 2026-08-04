import { useContactsStore } from '../../stores/useContactsStore';
import { getDisplayName, getLatestInteraction } from '../kanoon/columns';
import { BEHAVIORAL_STATUS, ENTITY_TYPES, PERSON_TYPES } from '../kanoon/config';
import {
  getContactPersonDisplayName,
  normalizeContactPerson,
} from '../../domain/contactPerson';
import { naturalPersonSelfId } from '../../domain/identity';

/**
 * Nabz customer helpers — facade over the shared Company SSOT (useContactsStore).
 * Domain language: Customer ≡ Company (entityType customer).
 * Do NOT keep a separate in-memory registry here.
 */
function getContacts() {
  return useContactsStore.getState().contacts;
}

export function getCustomerById(id) {
  if (!id) return null;
  return getContacts().find((c) => String(c.id) === String(id)) || null;
}

export function listCustomers() {
  return getContacts().filter(
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

/**
 * ContactPersons for a company (+ natural-person self as stable synthetic id).
 * Synthetic self id via naturalPersonSelfId — reserved, not a DB ContactPerson.
 */
export function listCustomerExperts(customerId) {
  const customer = getCustomerById(customerId);
  if (!customer) return [];

  const experts = useContactsStore.getState().listContactPersons(customerId);

  if (customer.personType === PERSON_TYPES.NATURAL && customer.personName) {
    experts.unshift(
      normalizeContactPerson(
        {
          id: naturalPersonSelfId(customer.id),
          fullName: customer.personName,
          mobile: customer.mobile || '',
          jobPosition: 'مشتری',
        },
        customer.id,
      ),
    );
  }

  return experts;
}

export function searchCustomerExperts(customerId, query) {
  const experts = listCustomerExperts(customerId);
  const q = (query || '').trim().toLowerCase();
  if (!q) return experts.slice(0, 12);

  return experts.filter((person) => {
    const haystack = [
      getContactPersonDisplayName(person),
      person.mobile,
      person.jobPosition,
      person.email,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  }).slice(0, 12);
}

/** Stable identity — always ContactPerson.id */
export function expertKey(person) {
  return String(person?.id || '');
}

export function findExpertByKey(customerId, key) {
  if (!key) return null;
  return listCustomerExperts(customerId).find((person) => String(person.id) === String(key)) || null;
}

export function addCustomerRecord(contact) {
  const id = useContactsStore.getState().addContact({
    ...contact,
    relatedPersons: contact.relatedPersons || [],
  });
  return getCustomerById(id);
}

export function addExpertToCustomer(customerId, person) {
  return useContactsStore.getState().addContactPerson(customerId, {
    fullName: person.fullName || person.name,
    mobile: person.mobile,
    gender: person.gender || '',
    jobPosition: person.jobPosition || person.role || '',
    email: person.email || '',
    isPrimary: Boolean(person.isPrimary),
  });
}

export function updateCustomer(customerId, patch) {
  if (!customerId || !patch) return null;
  useContactsStore.getState().updateContact(customerId, patch);
  return getCustomerById(customerId);
}

export function getCustomerLastUsedDeliveryInfo(customerId) {
  const customer = getCustomerById(customerId);
  return customer?.lastUsedDeliveryInfo || null;
}

export function updateCustomerLastUsedDeliveryInfo(customerId, lastUsedDeliveryInfo) {
  if (!customerId || !lastUsedDeliveryInfo) return null;
  return updateCustomer(customerId, {
    lastUsedDeliveryInfo: {
      unloadAddress: lastUsedDeliveryInfo.unloadAddress || '',
      postalCode: lastUsedDeliveryInfo.postalCode || '',
      recipientName: lastUsedDeliveryInfo.recipientName || '',
      recipientPhone: lastUsedDeliveryInfo.recipientPhone || '',
      shippingNotes: lastUsedDeliveryInfo.shippingNotes || '',
      updatedAt: new Date().toISOString(),
    },
  });
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
