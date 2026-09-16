/**
 * Internal naming map — domain language ↔ runtime field names.
 * Public UX labels unchanged.
 * @see Docs/architecture/ENTITY_OWNERSHIP.md
 */

export const DOMAIN_NAMING = Object.freeze({
  /** Aggregate root for parties */
  Company: 'Contact record in useContactsStore (id, entityType, personType, …)',
  /** Alias used in Nabz / CRM copy */
  Customer: 'Company where entityType === customer',
  Supplier: 'Company where entityType === supplier',
  /** Child entity */
  ContactPerson: 'relatedPersons[] on Company; legacy UI said RelatedPerson / رابط',
  /** Ofogh board card */
  Opportunity: 'Same Company; filtered/sorted by lifecycle_stage',
  Lead: 'Synonym of Opportunity at cold_lead / early stages',
  /** Activities */
  Interaction: 'Company-scoped timeline entry (contact.interactions)',
  OrderCrmActivity: 'Order-scoped CRM entry (order.crmActivities) — distinct stream',
});
