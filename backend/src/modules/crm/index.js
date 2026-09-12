/**
 * crm — Company / Contact (کانون) + Raw Lead / lifecycle (افق).
 *
 * Application / infrastructure / presentation live here (Phase 2.1).
 * Public HTTP paths unchanged: /api/v1/companies, contacts, leads,
 * lead-pipelines, identity.
 */
export { assertOrderPartyIsCompany, ENTITY_REF_TYPE } from './domain/rawLeadGate.js';
export { findCompanyById, findLeadById, companyExistsActive } from './public/subjectReferences.js';
export { recomputeCustomerLifecycle } from './public/customerLifecycle.js';
export { default as companyRoutes } from './presentation/companies.js';
export { default as contactRoutes } from './presentation/contacts.js';
export { default as leadRoutes } from './presentation/leads.js';
export { default as leadPipelineRoutes } from './presentation/leadPipelines.js';
export { default as identityRoutes } from './presentation/identity.js';
