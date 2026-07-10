export const GATEWAY_DECISION_OUTCOMES = {
  SUCCESS: 'success',
  FAILED: 'failed',
};

export const GATEWAY_PAYMENT_TYPES = [
  'نقدی',
  'چک',
  'حواله بانکی',
  'اعتباری',
];

export const GATEWAY_CANCEL_REASONS = [
  { value: 'high_price', label: 'قیمت بالا نسبت به بازار' },
  { value: 'late_supply', label: 'عدم تامین به‌موقع کالا' },
  { value: 'customer_withdraw', label: 'انصراف/تغییر تصمیم مشتری' },
  { value: 'other', label: 'سایر موارد' },
];

export function getCancelReasonLabel(value) {
  return GATEWAY_CANCEL_REASONS.find((item) => item.value === value)?.label || value;
}
