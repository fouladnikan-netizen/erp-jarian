/**
 * Domain models for Order — no UI / presentation concerns.
 * Financial calculations stay in nabz services (quotingService); stores only hold state.
 *
 * Revision Engine fields (revisionRequired / approvalDecision / revisions) are orthogonal
 * to lifecycle status — never invent statuses like DRAFT_REVISION.
 */

import type { Money } from '../money/money.types';
import type { OrderStatus } from './order.enums';
import type { ApprovalDecision } from './revision.enums';
import type { Revision } from './revision.types';

export type { OrderStatus, OrderPipelineBucket } from './order.enums';
export type { Money, CurrencyCode } from '../money/money.types';
export type { ApprovalDecision, RevisionReasonCode } from './revision.enums';
export type { Revision } from './revision.types';

export interface OrderItem {
  name: string;
  qty: number;
  description?: string;
  unit?: string;
  /** Unit price when known; prefer Money over bare numbers in new code. */
  unitPrice?: Money;
}

export interface FinancialSummary {
  subtotal: Money;
  discount: Money;
  tax: Money;
  total: Money;
}

export interface PreInvoice {
  id: string;
  orderId: string;
  revision: number;
  issuedAt: string;
  summary: FinancialSummary;
  signed?: boolean;
  signedDocumentNumber?: string;
}

export interface Order {
  id: string;
  customerId: string;
  /** Core lifecycle only — not used for revision loops. */
  status: OrderStatus;
  items: OrderItem[];
  createdAt: string;
  code?: string;
  stageId?: number;
  financialSummary?: FinancialSummary;
  preInvoice?: PreInvoice;
  /** True when order was returned and needs rework at current stage. */
  revisionRequired?: boolean;
  approvalDecision?: ApprovalDecision;
  revisions?: Revision[];
}
