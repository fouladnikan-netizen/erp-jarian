/**
 * Shirazeh permission-matrix compatibility adapter.
 * Shirazeh UI remains a design/admin matrix (OWN/TEAM/ALL theater).
 * Ops capability must use Backend codes via src/auth/permissions.js.
 */
import { PERMISSIONS } from '../../../auth/permissions.catalog.js';
import { can } from '../../../auth/permissions.js';

/** Map legacy Shirazeh action ids → Backend permission codes (partial). */
export const SHIRAZEH_ACTION_TO_BACKEND = Object.freeze({
  VIEW_ORDER: PERMISSIONS.ORDERS_READ,
  EDIT_ORDER: PERMISSIONS.ORDERS_WRITE,
  VIEW_COMPANY: PERMISSIONS.COMPANIES_READ,
  EDIT_COMPANY: PERMISSIONS.COMPANIES_WRITE,
  VIEW_LEAD: PERMISSIONS.LEADS_READ,
  EDIT_LEAD: PERMISSIONS.LEADS_WRITE,
  CONVERT_LEAD: PERMISSIONS.LEADS_CONVERT,
});

/**
 * Effective ops grant for a Shirazeh action id — Backend session, not matrix store.
 * @returns {{ enabled: boolean, source: 'backend'|'unmapped', permission?: string }}
 */
export function getEffectiveOpsGrant(shirazehActionId) {
  const permission = SHIRAZEH_ACTION_TO_BACKEND[shirazehActionId];
  if (!permission) {
    return { enabled: false, source: 'unmapped' };
  }
  return {
    enabled: can(permission),
    source: 'backend',
    permission,
  };
}

export default {
  SHIRAZEH_ACTION_TO_BACKEND,
  getEffectiveOpsGrant,
};
