import type { OrderPipelineBucket, OrderStatus } from './order.enums';

/** Default status for newly created domain orders. */
export const DEFAULT_ORDER_STATUS: OrderStatus = 'INQUIRY';

/**
 * Temporary bridge: map legacy UI pipeline buckets → domain OrderStatus.
 * Remove once mock/API payloads use OrderStatus exclusively.
 */
export const PIPELINE_BUCKET_TO_STATUS: Record<OrderPipelineBucket, OrderStatus> = {
  current: 'PRICING',
  success: 'PURCHASE',
  failed: 'FAILED',
};

export const ORDER_STATUS_TO_PIPELINE_BUCKET: Partial<Record<OrderStatus, OrderPipelineBucket>> = {
  INQUIRY: 'current',
  PRICING: 'current',
  PROFORMA: 'current',
  PURCHASE: 'success',
  LOADING: 'success',
  INVOICED: 'success',
  COMPLETED: 'success',
  FAILED: 'failed',
};
