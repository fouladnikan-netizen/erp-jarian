/**
 * Sales-facing party gate (DDL-14): orders attach to Company, never Raw Lead.
 * Sales must not import `crm/domain/rawLeadGate` directly.
 */
export {
  assertOrderPartyIsCompany,
  detectRawLeadOrderAttempt,
  ENTITY_REF_TYPE,
} from '../domain/rawLeadGate.js';
