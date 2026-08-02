/**
 * Revision Engine — logs return-to-previous-stage without inventing new lifecycle states.
 * Business rule: status stays a core OrderStatus; revisionRequired / approvalDecision / revisions
 * are orthogonal flags and history.
 */

import type { Order } from './order.types';
import type { OrderStatus } from './order.enums';
import type { ApprovalDecision, RevisionReasonCode } from './revision.enums';
import type { Revision } from './revision.types';
import { REVISION_REASON_LABELS } from './revision.constants';

export interface RecordReturnInput {
  returnedBy: string;
  reasonCode: RevisionReasonCode;
  reasonText?: string;
  previousStage: OrderStatus;
  returnedToStage: OrderStatus;
  changesSummary?: string;
  /** Optional stable id (tests); otherwise generated. */
  id?: string;
  returnedAt?: string;
}

function requireReasonCode(code: RevisionReasonCode | undefined): RevisionReasonCode {
  if (!code) {
    throw new Error('Revision Engine: reasonCode is required for every return.');
  }
  if (code !== 'SUPPLIER_UNAVAILABLE' && code !== 'PRICE_EXCEEDED' && code !== 'OTHER') {
    throw new Error(`Revision Engine: invalid reasonCode "${String(code)}".`);
  }
  return code;
}

export function buildRevisionRecord(input: RecordReturnInput): Revision {
  const reasonCode = requireReasonCode(input.reasonCode);
  const reasonLabel = REVISION_REASON_LABELS[reasonCode];
  const reasonText = input.reasonText?.trim() || undefined;
  const changesSummary =
    input.changesSummary?.trim()
    || [
      `عودت از ${input.previousStage} به ${input.returnedToStage}`,
      reasonLabel,
      reasonText,
    ]
      .filter(Boolean)
      .join(' — ');

  return {
    id: input.id || `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    returnedBy: input.returnedBy,
    returnedAt: input.returnedAt || new Date().toISOString(),
    reasonCode,
    ...(reasonText ? { reasonText } : {}),
    previousStage: input.previousStage,
    returnedToStage: input.returnedToStage,
    changesSummary,
  };
}

/**
 * Append a revision log entry and mark the order as needing revision.
 * Does not change Order.status lifecycle enum members — caller may still move stageId.
 */
export function recordStageReturn(
  order: Order,
  input: RecordReturnInput,
): Order {
  const revision = buildRevisionRecord(input);
  const revisions = [...(order.revisions || []), revision];

  return {
    ...order,
    revisionRequired: true,
    approvalDecision: 'RETURNED' satisfies ApprovalDecision,
    revisions,
  };
}

/** Clear the needs-revision flag after rework (does not delete revision history). */
export function clearRevisionRequired(
  order: Order,
  nextDecision: ApprovalDecision = 'PENDING',
): Order {
  if (!order.revisionRequired && order.approvalDecision === nextDecision) {
    return order;
  }
  return {
    ...order,
    revisionRequired: false,
    approvalDecision: nextDecision,
  };
}

export function getLatestRevision(order: Order): Revision | null {
  const list = order.revisions;
  if (!list?.length) return null;
  return list[list.length - 1] ?? null;
}

export function isRevisionRequired(order: Order): boolean {
  return Boolean(order.revisionRequired);
}
