import type { OrderStatus } from './order.enums';
import type { RevisionReasonCode } from './revision.enums';

export type { ApprovalDecision, RevisionReasonCode } from './revision.enums';

export interface Revision {
  id: string;
  returnedBy: string;
  /** ISO-8601 timestamp */
  returnedAt: string;
  reasonCode: RevisionReasonCode;
  reasonText?: string;
  previousStage: OrderStatus;
  /** Stage the order was returned to (still a core lifecycle status). */
  returnedToStage: OrderStatus;
  changesSummary: string;
}
