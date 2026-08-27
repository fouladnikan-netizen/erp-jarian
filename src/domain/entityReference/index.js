export {
  ENTITY_REF_TYPE,
  ENTITY_REF_TYPES,
  normalizeEntityReference,
  parseEntityReference,
  companyReference,
  rawLeadReference,
  subjectFromTaskIntent,
} from './entityReference.js';

export {
  ERP_CAPABILITY,
  RAW_LEAD_GATE_ERROR,
  isCapabilityAllowed,
  assertEntityEligibleFor,
  detectRawLeadOrderAttempt,
} from './rawLeadCapability.js';

export {
  assertEligibleForFinance,
  assertEligibleForQuotation,
} from './financeGate.js';
