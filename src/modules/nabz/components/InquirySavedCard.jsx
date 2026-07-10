import { isDiscrepancySupplyType, INQUIRY_STATUS_LABEL } from '../inquiryConfig';
import { getSupplierName } from '../suppliers';
import { formatAmountRial } from '../orderCode';

export default function InquirySavedCard({ inquiry }) {
  const statusLabel = INQUIRY_STATUS_LABEL[inquiry.status] || 'پیش‌نویس';
  return (
    <div className="nabz-inquiry-saved">
      <span className="nabz-inquiry-saved__badge">{inquiry.supplyType}</span>
      <span className="nabz-inquiry-saved__status">{statusLabel}</span>
      <span>{getSupplierName(inquiry.supplierId)}</span>
      <span className="nabz-inquiry-saved__sep">·</span>
      <span>فی: {formatAmountRial(inquiry.unitPrice)} ریال</span>
      {inquiry.notes && (
        <>
          <span className="nabz-inquiry-saved__sep">·</span>
          <span className="nabz-inquiry-saved__notes">{inquiry.notes}</span>
        </>
      )}
      {isDiscrepancySupplyType(inquiry.supplyType) && (
        <div className="nabz-inquiry-saved__discrepancy">
          <span>مغایرت: {inquiry.discrepancyDescription}</span>
          <span className="nabz-inquiry-saved__sep">·</span>
          <span>وزن: {inquiry.discrepancyWeight}</span>
          <span className="nabz-inquiry-saved__sep">·</span>
          <span>فی مغایر: {formatAmountRial(inquiry.discrepancyUnitPrice)} ریال</span>
        </div>
      )}
      <span className="nabz-inquiry-saved__meta">
        {inquiry.registeredAt}
        {' · '}
        {inquiry.registeredBy}
      </span>
    </div>
  );
}
