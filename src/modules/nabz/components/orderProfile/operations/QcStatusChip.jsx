import { resolveQcChipState } from '../../../qcInspectionConfig';

/**
 * چیپ وضعیت کیفی — الگوی واحد جداول عملیاتی نبض
 * کلیک → باز شدن کشوی کنترل کیفیت
 */
export default function QcStatusChip({
  record = null,
  onClick,
  disabled = false,
  className = '',
}) {
  const chip = resolveQcChipState(record);

  return (
    <button
      type="button"
      className={`qc-status-chip qc-status-chip--${chip.tone}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      disabled={disabled || !onClick}
      title="مشاهده / ثبت کنترل کیفیت"
      aria-label={`وضعیت کیفی: ${chip.label}`}
    >
      <span className="qc-status-chip__dot" aria-hidden="true" />
      <span className="qc-status-chip__label font-vazir">{chip.label}</span>
    </button>
  );
}
