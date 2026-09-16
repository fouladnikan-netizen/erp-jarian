/**
 * UI view of settings reason SSOT.
 * Canonical: backend/src/modules/settings/domain/reasonRegistry.js
 * Do not add a parallel GATEWAY_* list in Nabz. Live FE reads GET /api/v1/settings/reasons.
 */
export {
  GATEWAY_CANCEL_REASONS,
  LEAD_REJECT_REASONS,
  REASON_SCOPES,
  listReasons,
  getReasonLabel,
  getCancelReasonLabel,
} from '../../../backend/src/modules/settings/domain/reasonRegistry.js';
