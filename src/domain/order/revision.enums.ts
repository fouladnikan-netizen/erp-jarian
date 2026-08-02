/**
 * Approval / revision enums — orthogonal to OrderStatus lifecycle.
 * Do NOT invent lifecycle states like DRAFT_REVISION.
 */

export type ApprovalDecision = 'APPROVED' | 'REJECTED' | 'RETURNED' | 'PENDING';

export type RevisionReasonCode =
  | 'SUPPLIER_UNAVAILABLE'
  | 'PRICE_EXCEEDED'
  | 'OTHER';
