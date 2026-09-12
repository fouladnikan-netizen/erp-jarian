/**
 * Cancel / reject reason registry — settings-owned SSOT (Phase 2).
 *
 * UI lists are views of this catalog. Do not add a parallel GATEWAY_* list.
 * Persist stored `value` codes; labels may be translated later without
 * rewriting historical order payloads.
 */
export const REASON_SCOPES = Object.freeze({
  GATEWAY_CANCEL: 'GATEWAY_CANCEL',
  LEAD_REJECT: 'LEAD_REJECT',
});

export const GATEWAY_CANCEL_REASONS = Object.freeze([
  Object.freeze({ value: 'high_price', label: 'قیمت بالا نسبت به بازار', scope: REASON_SCOPES.GATEWAY_CANCEL }),
  Object.freeze({ value: 'late_supply', label: 'عدم تامین به‌موقع کالا', scope: REASON_SCOPES.GATEWAY_CANCEL }),
  Object.freeze({ value: 'customer_withdraw', label: 'انصراف/تغییر تصمیم مشتری', scope: REASON_SCOPES.GATEWAY_CANCEL }),
  Object.freeze({ value: 'other', label: 'سایر موارد', scope: REASON_SCOPES.GATEWAY_CANCEL }),
]);

/** Lead reject codes used by Ofogh archive — keep aligned with leadService. */
export const LEAD_REJECT_REASONS = Object.freeze([
  Object.freeze({ value: 'unqualified', label: 'واجد شرایط نیست', scope: REASON_SCOPES.LEAD_REJECT }),
  Object.freeze({ value: 'duplicate', label: 'تکراری', scope: REASON_SCOPES.LEAD_REJECT }),
  Object.freeze({ value: 'no_response', label: 'عدم پاسخ', scope: REASON_SCOPES.LEAD_REJECT }),
  Object.freeze({ value: 'other', label: 'سایر موارد', scope: REASON_SCOPES.LEAD_REJECT }),
]);

export function listReasons(scope) {
  if (scope === REASON_SCOPES.GATEWAY_CANCEL) return GATEWAY_CANCEL_REASONS;
  if (scope === REASON_SCOPES.LEAD_REJECT) return LEAD_REJECT_REASONS;
  return [...GATEWAY_CANCEL_REASONS, ...LEAD_REJECT_REASONS];
}

export function getReasonLabel(value, scope = REASON_SCOPES.GATEWAY_CANCEL) {
  return listReasons(scope).find((item) => item.value === value)?.label || value;
}

export function getCancelReasonLabel(value) {
  return getReasonLabel(value, REASON_SCOPES.GATEWAY_CANCEL);
}

export const reasonRegistry = {
  REASON_SCOPES,
  GATEWAY_CANCEL_REASONS,
  LEAD_REJECT_REASONS,
  listReasons,
  getReasonLabel,
  getCancelReasonLabel,
};
