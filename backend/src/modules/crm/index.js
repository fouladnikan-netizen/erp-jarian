/**
 * crm — Company / Contact (کانون) + Raw Lead / lifecycle (افق).
 *
 * Domain lives here. Application/infrastructure/presentation for Company
 * and Lead still sit at backend/src/{services,repositories,routes} and
 * are imported through those shims until Phase 2.1 (see ARCHITECTURE.md).
 */
export { assertOrderPartyIsCompany } from './domain/rawLeadGate.js';
export { ENTITY_REF_TYPE } from './domain/rawLeadGate.js';
