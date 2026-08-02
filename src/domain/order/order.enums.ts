/**
 * Canonical order lifecycle statuses (domain).
 * Not UI labels — map to Persian copy in presentation layer only.
 */
export type OrderStatus =
  | 'INQUIRY'
  | 'PRICING'
  | 'PROFORMA'
  | 'PURCHASE'
  | 'LOADING'
  | 'INVOICED'
  | 'COMPLETED'
  | 'FAILED';

/**
 * Legacy Nabz list buckets still used by current UI routes/filters.
 * Prefer OrderStatus for new domain code; bridge via constants when needed.
 */
export type OrderPipelineBucket = 'current' | 'success' | 'failed';
