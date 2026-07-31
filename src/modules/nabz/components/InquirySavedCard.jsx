import { isDiscrepancySupplyType, INQUIRY_STATUS_LABEL } from '../inquiryConfig';
import { getSupplierName } from '../suppliers';
import { formatJarianMoney } from '../../../config/JarianUI.config';
import { JarianSupplier } from '../../../components/jarian/JarianPresentation';

export default function InquirySavedCard({ inquiry }) {
  const statusLabel = INQUIRY_STATUS_LABEL[inquiry.status] || 'پیش‌نویس';
  return (
    <div className="nabz-inquiry-saved">
      <span className="nabz-inquiry-saved__badge">{inquiry.supplyType}</span>
      <span className="nabz-inquiry-saved__status">{statusLabel}</span>
      <JarianSupplier name={getSupplierName(inquiry.supplierId)} supplyType={inquiry.supplyType} />
      <span className="nabz-inquiry-saved__sep">·</span>
      <span className="jarian-money font-vazir">فی: {formatJarianMoney(inquiry.unitPrice)}</span>
      {inquiry.notes && (
        <>
          <span className="nabz-inquiry-saved__sep">·</span>
          <span className="nabz-inquiry-saved__notes" title={inquiry.notes}>
            {inquiry.notes}
          </span>
        </>
      )}
      {isDiscrepancySupplyType(inquiry.supplyType) && (
        <div className="nabz-inquiry-saved__discrepancy">
          <span>مغایرت: {inquiry.discrepancyDescription}</span>
          <span className="nabz-inquiry-saved__sep">·</span>
          <span>وزن: {inquiry.discrepancyWeight}</span>
          <span className="nabz-inquiry-saved__sep">·</span>
          <span className="jarian-money font-vazir">فی مغایر: {formatJarianMoney(inquiry.discrepancyUnitPrice)}</span>
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
