/**
 * Zod schemas for runtime validation of domain payloads (API / file / mock).
 * TypeScript protects compile-time; Zod guards runtime. Wire into repositories next.
 */

import { z } from 'zod';

export const CurrencyCodeSchema = z.literal('IRR');

export const MoneySchema = z.object({
  amount: z.number().finite(),
  currency: CurrencyCodeSchema,
});

export const OrderStatusSchema = z.enum([
  'INQUIRY',
  'PRICING',
  'PROFORMA',
  'PURCHASE',
  'LOADING',
  'INVOICED',
  'COMPLETED',
  'FAILED',
]);

export const ApprovalDecisionSchema = z.enum([
  'APPROVED',
  'REJECTED',
  'RETURNED',
  'PENDING',
]);

export const RevisionReasonCodeSchema = z.enum([
  'SUPPLIER_UNAVAILABLE',
  'PRICE_EXCEEDED',
  'OTHER',
]);

export const RevisionSchema = z.object({
  id: z.string().min(1),
  returnedBy: z.string().min(1),
  returnedAt: z.string().min(1),
  reasonCode: RevisionReasonCodeSchema,
  reasonText: z.string().optional(),
  previousStage: OrderStatusSchema,
  returnedToStage: OrderStatusSchema,
  changesSummary: z.string().min(1),
});

export const OrderItemSchema = z.object({
  name: z.string().min(1),
  qty: z.number().finite(),
  description: z.string().optional(),
  unit: z.string().optional(),
  unitPrice: MoneySchema.optional(),
});

export const FinancialSummarySchema = z.object({
  subtotal: MoneySchema,
  discount: MoneySchema,
  tax: MoneySchema,
  total: MoneySchema,
});

export const PreInvoiceSchema = z.object({
  id: z.string().min(1),
  orderId: z.string().min(1),
  revision: z.number().int().nonnegative(),
  issuedAt: z.string().min(1),
  summary: FinancialSummarySchema,
  signed: z.boolean().optional(),
  signedDocumentNumber: z.string().optional(),
});

export const OrderSchema = z.object({
  id: z.string().min(1),
  customerId: z.string().min(1),
  status: OrderStatusSchema,
  items: z.array(OrderItemSchema),
  createdAt: z.string().min(1),
  code: z.string().optional(),
  stageId: z.number().int().optional(),
  financialSummary: FinancialSummarySchema.optional(),
  preInvoice: PreInvoiceSchema.optional(),
  revisionRequired: z.boolean().optional(),
  approvalDecision: ApprovalDecisionSchema.optional(),
  revisions: z.array(RevisionSchema).optional(),
});

export type OrderSchemaType = z.infer<typeof OrderSchema>;
