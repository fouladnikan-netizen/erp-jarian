export const GATEWAY_DECISION_OUTCOMES = {
  SUCCESS: 'success',
  FAILED: 'failed',
};

export const GATEWAY_PAYMENT_TYPES = [
  'پیش‌پرداخت ۱۰۰ درصدی',
  'پیش‌پرداخت ۹۰ درصدی',
  'پرداخت علی‌الحساب',
  'پرداخت تا تاریخ',
  'پرداخت چک روز',
  'پرداخت چک مدت‌دار',
  'پرداخت ال‌سی مدت‌دار',
  'پرداخت ال‌سی دیداری',
  'پرداخت بعد از تحویل',
  'پرداخت هنگام تحویل',
];

export const GATEWAY_PAYMENT_EXTRA_FIELDS = {
  DUE_DATE: 'dueDate',
  LC_MONTHS: 'lcMonths',
  DAYS_AFTER_DELIVERY: 'daysAfterDelivery',
  PARTIAL_AMOUNT: 'partialAmount',
};

/** فیلدهای شرطی وابسته به نوع پرداخت */
export function getPaymentTermsExtraFields(paymentType) {
  if (paymentType === 'پرداخت تا تاریخ' || paymentType === 'پرداخت چک مدت‌دار') {
    return [GATEWAY_PAYMENT_EXTRA_FIELDS.DUE_DATE];
  }
  if (paymentType === 'پرداخت ال‌سی مدت‌دار') {
    return [GATEWAY_PAYMENT_EXTRA_FIELDS.LC_MONTHS];
  }
  if (paymentType === 'پرداخت بعد از تحویل') {
    return [GATEWAY_PAYMENT_EXTRA_FIELDS.DAYS_AFTER_DELIVERY];
  }
  if (paymentType === 'پرداخت علی‌الحساب') {
    return [GATEWAY_PAYMENT_EXTRA_FIELDS.PARTIAL_AMOUNT];
  }
  return [];
}

export function getEmptyPaymentTerms(paymentType = GATEWAY_PAYMENT_TYPES[0]) {
  return {
    paymentType,
    dueDate: '',
    lcMonths: '',
    daysAfterDelivery: '',
    partialAmount: '',
    document: null,
  };
}

export function validatePaymentTerms(terms) {
  const paymentType = terms?.paymentType;
  if (!paymentType) return 'لطفاً نوع پرداخت را انتخاب کنید.';

  const extras = getPaymentTermsExtraFields(paymentType);
  if (extras.includes(GATEWAY_PAYMENT_EXTRA_FIELDS.DUE_DATE) && !terms.dueDate?.trim()) {
    return 'لطفاً تاریخ سررسید را انتخاب کنید.';
  }
  if (extras.includes(GATEWAY_PAYMENT_EXTRA_FIELDS.LC_MONTHS)) {
    const months = Number(terms.lcMonths);
    if (!Number.isFinite(months) || months <= 0) return 'تعداد ماه را وارد کنید.';
  }
  if (extras.includes(GATEWAY_PAYMENT_EXTRA_FIELDS.DAYS_AFTER_DELIVERY)) {
    const days = Number(terms.daysAfterDelivery);
    if (!Number.isFinite(days) || days < 0) return 'تعداد روز پس از تحویل را وارد کنید.';
  }
  if (extras.includes(GATEWAY_PAYMENT_EXTRA_FIELDS.PARTIAL_AMOUNT)) {
    const amount = String(terms.partialAmount || '').replace(/[^\d]/g, '');
    if (!amount || Number(amount) <= 0) return 'مبلغ علی‌الحساب را وارد کنید.';
  }
  return null;
}

export const GATEWAY_CANCEL_REASONS = [
  { value: 'high_price', label: 'قیمت بالا نسبت به بازار' },
  { value: 'late_supply', label: 'عدم تامین به‌موقع کالا' },
  { value: 'customer_withdraw', label: 'انصراف/تغییر تصمیم مشتری' },
  { value: 'other', label: 'سایر موارد' },
];

export function getCancelReasonLabel(value) {
  return GATEWAY_CANCEL_REASONS.find((item) => item.value === value)?.label || value;
}
