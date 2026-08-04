/**
 * Gahshomar formal correspondence binding (shim).
 * Prefer `services/correspondenceService` for new code.
 * @see Docs/architecture/DOMAIN_DECISION_LOG.md DDL-12
 */

export {
  listCompanyCorrespondence,
  createCorrespondence,
  updateCorrespondence,
  useCompanyCorrespondence,
} from './services/correspondenceService';
