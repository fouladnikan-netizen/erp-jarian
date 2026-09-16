import type { RevisionReasonCode } from './revision.enums';

export const REVISION_REASON_LABELS: Record<RevisionReasonCode, string> = {
  SUPPLIER_UNAVAILABLE: 'عدم موجودی / تأمین‌کننده',
  PRICE_EXCEEDED: 'تجاوز از سقف قیمت',
  OTHER: 'سایر',
};

export const DEFAULT_APPROVAL_DECISION = 'PENDING' as const;
