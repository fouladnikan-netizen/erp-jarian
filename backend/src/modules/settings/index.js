/**
 * settings — شیرازه platform: org identity, RBAC, users, reason registry, document chrome.
 */
export {
  GATEWAY_CANCEL_REASONS,
  LEAD_REJECT_REASONS,
  listReasons,
  getCancelReasonLabel,
  REASON_SCOPES,
} from './domain/reasonRegistry.js';
export {
  DOCUMENT_CHROME_TAGLINE,
  LEGACY_DOCUMENT_ORGANIZATION,
  documentChrome,
} from './domain/documentChrome.js';
export { default as settingsReasonsRoutes } from './presentation/reasons.js';
