/**
 * Extended cross-module reference contracts.
 * Opaque IDs only — no duplicated customer payloads.
 */

export const MODULE_REF_KIND = Object.freeze({
  KANOON_CONTACT: 'kanoon.contact',
  KANOON_CONTACT_PERSON: 'kanoon.contactPerson',
  OFOGH_LEAD: 'ofogh.lead',
  NABZ_ORDER: 'nabz.order',
  NABZ_CUSTOMER_ORDER: 'nabz.customerOrder',
  POOYESH_TASK: 'pooyesh.task',
});

/**
 * @typedef {object} ContactReference
 * @property {string} contactId
 * @property {string} companyId
 */

/**
 * @typedef {object} LeadReference
 * @property {string} leadId
 * @property {string} [opportunityId]
 */

/**
 * @typedef {object} CustomerOrderReference
 * @property {string} orderId
 * @property {string} customerId
 */

/**
 * @typedef {ContactReference & { kind: 'kanoon.contact' }} KanoonContactRef
 * @typedef {LeadReference & { kind: 'ofogh.lead' }} OfoghLeadRef
 * @typedef {{ kind: 'nabz.order', orderId: string, shipmentId?: string }} NabzOrderRef
 * @typedef {CustomerOrderReference & { kind: 'nabz.customerOrder' }} NabzCustomerOrderRef
 * @typedef {{ kind: 'pooyesh.task', taskId: string, commitmentId?: string }} PooyeshTaskRef
 */

/** @param {string} contactPersonId @param {string} companyId */
export function refKanoonContactPerson(contactPersonId, companyId) {
  return {
    kind: MODULE_REF_KIND.KANOON_CONTACT_PERSON,
    contactPersonId: String(contactPersonId),
    contactId: String(contactPersonId),
    companyId: String(companyId),
  };
}

/** @param {string} contactId @param {string} [companyId] @returns {KanoonContactRef} */
export function refKanoonContact(contactId, companyId) {
  const id = String(contactId);
  return {
    kind: MODULE_REF_KIND.KANOON_CONTACT,
    contactId: id,
    companyId: companyId != null ? String(companyId) : id,
  };
}

/** @param {string} contactId @param {string} [companyId] @returns {ContactReference} */
export function toContactReference(contactId, companyId) {
  const id = String(contactId);
  return {
    contactId: id,
    companyId: companyId != null ? String(companyId) : id,
  };
}

/** @param {string} leadId @param {string} [opportunityId] @returns {OfoghLeadRef} */
export function refOfoghLead(leadId, opportunityId) {
  return {
    kind: MODULE_REF_KIND.OFOGH_LEAD,
    leadId: String(leadId),
    opportunityId: opportunityId != null ? String(opportunityId) : undefined,
  };
}

/** @param {string} leadId @param {string} [opportunityId] @returns {LeadReference} */
export function toLeadReference(leadId, opportunityId) {
  return {
    leadId: String(leadId),
    opportunityId: opportunityId != null ? String(opportunityId) : undefined,
  };
}

/** @param {string} orderId @param {string} [shipmentId] @returns {NabzOrderRef} */
export function refNabzOrder(orderId, shipmentId) {
  return {
    kind: MODULE_REF_KIND.NABZ_ORDER,
    orderId: String(orderId),
    shipmentId: shipmentId != null ? String(shipmentId) : undefined,
  };
}

/** @param {string} orderId @param {string} customerId @returns {NabzCustomerOrderRef} */
export function refCustomerOrder(orderId, customerId) {
  return {
    kind: MODULE_REF_KIND.NABZ_CUSTOMER_ORDER,
    orderId: String(orderId),
    customerId: String(customerId),
  };
}

/** @param {string} orderId @param {string} customerId @returns {CustomerOrderReference} */
export function toCustomerOrderReference(orderId, customerId) {
  return {
    orderId: String(orderId),
    customerId: String(customerId),
  };
}

/** @param {string} taskId @param {string} [commitmentId] @returns {PooyeshTaskRef} */
export function refPooyeshTask(taskId, commitmentId) {
  return {
    kind: MODULE_REF_KIND.POOYESH_TASK,
    taskId: String(taskId),
    commitmentId: commitmentId != null ? String(commitmentId) : undefined,
  };
}
