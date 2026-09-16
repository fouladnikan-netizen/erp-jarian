/**
 * Cross-cutting ownership authorization for Pooyesh Activity/Task mutations.
 *
 * Rule (Gap 4 — RBAC / ownership scoping):
 *   A mutation (update/status-change/complete/archive) on a record that has
 *   `assignedTo` / `createdBy` anchors is allowed when EITHER:
 *     (a) the actor is the record's assignee OR creator, OR
 *     (b) the actor holds one of the `elevatedRoles` (broad/back-office access).
 *
 * PRODUCT DECISION REQUIRED (documented, not invented here):
 *   There is no manager/team hierarchy field (no `manager_id` / `team_id`) in
 *   the current schema, so `sales_manager` cannot be safely scoped to "their
 *   team's records" today. Conservative interpretation: only `admin` bypasses
 *   ownership scoping. `sales_manager` is treated like any other actor and is
 *   subject to the same owner/assignee check as `sales` — see
 *   Docs/architecture/DOMAIN_DECISION_LOG.md (DDL-19) for the explicit gap.
 */
import { appError } from '../../lib/errors.js';

export const DEFAULT_ELEVATED_ROLES = Object.freeze(['admin']);

/**
 * @param {{ assignedTo?: string|null, createdBy?: string|null }} record
 * @param {{ userId: string, roles?: string[] }} actorAuth
 * @param {{ elevatedRoles?: string[] }} [options]
 */
export function isOwnerOrElevated(record, actorAuth, options = {}) {
  const elevatedRoles = options.elevatedRoles || DEFAULT_ELEVATED_ROLES;
  const actorId = actorAuth?.userId != null ? String(actorAuth.userId) : null;
  const roles = Array.isArray(actorAuth?.roles) ? actorAuth.roles : [];

  if (roles.some((role) => elevatedRoles.includes(role))) return true;
  if (!actorId) return false;

  const assignedTo = record?.assignedTo != null ? String(record.assignedTo) : null;
  const createdBy = record?.createdBy != null ? String(record.createdBy) : null;

  return actorId === assignedTo || actorId === createdBy;
}

/**
 * Throws a 403 AppError (`OWNERSHIP_FORBIDDEN`) unless the actor owns the
 * record (assignee or creator) or holds an elevated role.
 *
 * @param {{ assignedTo?: string|null, createdBy?: string|null }} record
 * @param {{ userId: string, roles?: string[] }} actorAuth
 * @param {{ elevatedRoles?: string[], entityType?: string, entityId?: string }} [options]
 */
export function assertOwnerOrElevated(record, actorAuth, options = {}) {
  if (isOwnerOrElevated(record, actorAuth, options)) return;
  throw appError(
    'OWNERSHIP_FORBIDDEN',
    'شما مالک یا مسئول این مورد نیستید و اجازهٔ این تغییر را ندارید.',
    403,
    {
      entityType: options.entityType,
      entityId: options.entityId,
      assignedTo: record?.assignedTo ?? null,
      createdBy: record?.createdBy ?? null,
    },
  );
}

export default { assertOwnerOrElevated, isOwnerOrElevated, DEFAULT_ELEVATED_ROLES };
