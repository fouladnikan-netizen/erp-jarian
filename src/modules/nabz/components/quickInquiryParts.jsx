import { MARGIN_MODES } from '../quotingConfig';
import { formatAmountRial } from '../orderCode';
import { getSupplierName } from '../suppliers';
import MoneyInput from './MoneyInput';

export const SUPPLY_TYPE_DOT_CLASS = {
  رسمی: 'is-official',
  غیررسمی: 'is-unofficial',
  مغایرت: 'is-discrepancy',
};

export function formatPriceLine(amount) {
  if (amount == null || Number.isNaN(amount)) return '—';
  return (
    <>
      <span className="nabz-price-line__value">{formatAmountRial(amount)}</span>
      <span className="nabz-price-line__currency">ریال</span>
    </>
  );
}

export function getSalePriceColumnLabel(saleType, vatInclusive = false) {
  if (saleType !== 'رسمی') return 'قیمت فروش';
  return vatInclusive ? 'قیمت با مالیات' : 'قیمت قبل از مالیات';
}

/** سوئیچ روز/شب برای نمایش قیمت با/بدون ارزش افزوده */
export function VatInclusiveToggle({ checked = false, disabled = false, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`nabz-vat-toggle${checked ? ' is-on' : ''}`}
      title={checked ? 'قیمت با مالیات ارزش افزوده' : 'قیمت قبل از مالیات ارزش افزوده'}
      aria-label={checked ? 'قیمت با مالیات ارزش افزوده' : 'قیمت قبل از مالیات ارزش افزوده'}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) onChange?.(!checked);
      }}
    >
      <span className="nabz-vat-toggle__track" aria-hidden="true">
        <span className="nabz-vat-toggle__knob" />
      </span>
    </button>
  );
}

export function SalePriceColumnHeader({
  saleType,
  vatInclusive = false,
  showToggle = false,
  disabled = false,
  onChange,
}) {
  const label = getSalePriceColumnLabel(saleType, vatInclusive);
  return (
    <span className="nabz-sale-col-head">
      <span className="nabz-sale-col-head__label">{label}</span>
      {showToggle ? (
        <VatInclusiveToggle
          checked={vatInclusive}
          disabled={disabled}
          onChange={onChange}
        />
      ) : null}
    </span>
  );
}

export function formatMarginCellValue(mode, linePreview) {
  if (!linePreview) return '—';
  if (mode === MARGIN_MODES.ORDER_FIXED_PERCENT || mode === MARGIN_MODES.ORDER_FIXED_RIAL) {
    return `${formatAmountRial(Math.round(linePreview.unitMarginRial || 0))} ریال`;
  }
  if (linePreview.marginInputValue == null || linePreview.marginInputValue === '') return '—';
  if (mode === MARGIN_MODES.LINE_FIXED_PERCENT) {
    return `${linePreview.marginInputValue}٪`;
  }
  return `${formatAmountRial(Number(linePreview.marginInputValue))} ریال`;
}

function MarginCheckIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** سلول حاشیه سود سطری: ورودی + واحد ثابت + دکمه ثبت */
export function LineMarginCell({
  value,
  unit,
  saved = false,
  onValueChange,
  onSave,
}) {
  const unitLabel = unit === 'percent' ? '٪' : 'ریال';

  return (
    <div className="gateway-margin-cell">
      <div className="gateway-input-group">
        {unit === 'rial' ? (
          <MoneyInput
            className="gateway-input-group__field"
            value={value ?? ''}
            onChange={onValueChange}
            placeholder="مقدار"
            aria-label="مقدار حاشیه سود"
          />
        ) : (
          <input
            type="number"
            min="0"
            className="gateway-input-group__field"
            value={value ?? ''}
            onChange={(e) => onValueChange?.(e.target.value)}
            placeholder="مقدار"
            aria-label="مقدار حاشیه سود"
          />
        )}
        <span className="gateway-input-group__unit gateway-input-group__unit--static" aria-hidden="true">
          {unitLabel}
        </span>
      </div>
      <button
        type="button"
        className={`gateway-margin-save${saved ? ' is-saved' : ''}`}
        onClick={onSave}
        title="ثبت حاشیه سود"
        aria-label="ثبت حاشیه سود"
      >
        <MarginCheckIcon size={13} />
      </button>
    </div>
  );
}

export function QuotingMatrix({
  quoting,
  onChangeMode,
  onChangeOrderValue,
  readOnly = false,
  namePrefix = 'margin',
}) {
  const isPercentOrder = quoting.marginMode === MARGIN_MODES.ORDER_FIXED_PERCENT;
  const isFixedOrder = quoting.marginMode === MARGIN_MODES.ORDER_FIXED_RIAL;
  const isLinePercent = quoting.marginMode === MARGIN_MODES.LINE_FIXED_PERCENT;
  const isLineFixed = quoting.marginMode === MARGIN_MODES.LINE_FIXED_RIAL;
  const radioName = `${namePrefix}-mode`;

  return (
    <section className={`nabz-quoting-matrix${readOnly ? ' nabz-quoting-matrix--readonly' : ''}`}>
      <div className="nabz-quoting-matrix__row">
        <div className="nabz-quoting-matrix__title font-meem">
          <span>تعیین حاشیه سود:</span>
          {readOnly && <span className="nabz-quoting-matrix__badge">فقط نمایش</span>}
        </div>

        <label className={`nabz-quoting-matrix__pill${isPercentOrder ? ' is-selected' : ''}`}>
          <input
            type="radio"
            name={radioName}
            checked={isPercentOrder}
            disabled={readOnly}
            onChange={() => !readOnly && onChangeMode?.(MARGIN_MODES.ORDER_FIXED_PERCENT)}
          />
          <span className="nabz-quoting-matrix__pill-label">درصد کلی</span>
          <input
            type="number"
            min="0"
            className="nabz-form__input nabz-quoting-matrix__input"
            value={isPercentOrder ? (quoting.orderMarginValue ?? '') : ''}
            onChange={(e) => onChangeOrderValue?.(e.target.value)}
            placeholder="%"
            disabled={readOnly || !isPercentOrder}
            onClick={(e) => e.stopPropagation()}
          />
        </label>

        <label className={`nabz-quoting-matrix__pill${isFixedOrder ? ' is-selected' : ''}`}>
          <input
            type="radio"
            name={radioName}
            checked={isFixedOrder}
            disabled={readOnly}
            onChange={() => !readOnly && onChangeMode?.(MARGIN_MODES.ORDER_FIXED_RIAL)}
          />
          <span className="nabz-quoting-matrix__pill-label">مبلغ کلی</span>
          <MoneyInput
            className="nabz-form__input nabz-quoting-matrix__input"
            value={isFixedOrder ? (quoting.orderMarginValue ?? '') : ''}
            onChange={(next) => onChangeOrderValue?.(next)}
            placeholder="ریال"
            disabled={readOnly || !isFixedOrder}
          />
        </label>

        <label className={`nabz-quoting-matrix__pill${isLinePercent ? ' is-selected' : ''}`}>
          <input
            type="radio"
            name={radioName}
            checked={isLinePercent}
            disabled={readOnly}
            onChange={() => !readOnly && onChangeMode?.(MARGIN_MODES.LINE_FIXED_PERCENT)}
          />
          <span className="nabz-quoting-matrix__pill-label">درصد سطری</span>
        </label>

        <label className={`nabz-quoting-matrix__pill${isLineFixed ? ' is-selected' : ''}`}>
          <input
            type="radio"
            name={radioName}
            checked={isLineFixed}
            disabled={readOnly}
            onChange={() => !readOnly && onChangeMode?.(MARGIN_MODES.LINE_FIXED_RIAL)}
          />
          <span className="nabz-quoting-matrix__pill-label">مبلغ سطری</span>
        </label>
      </div>
    </section>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function SupplyTypeDot({ supplyType, className = '' }) {
  const dotClass = SUPPLY_TYPE_DOT_CLASS[supplyType] || 'is-official';
  return (
    <span
      className={`nabz-inquiry-compact__dot ${dotClass} ${className}`.trim()}
      aria-label={supplyType}
      title={supplyType}
    />
  );
}

/**
 * کارت فشرده استعلام
 * - سطر اصلی (showNotes=false): فقط نقطه رنگی + قیمت + نام تامین‌کننده
 * - زیرسطر (showNotes=true): همان‌ها + توضیحات در همان سطر بعد از تامین‌کننده
 * - بدون چک‌باکس؛ انتخاب با کلیک روی کارت
 */
export function InquiryCompact({
  inquiry,
  inquiryIndex = 0,
  selectable,
  isTarget,
  onSelectTarget,
  showSupplier,
  readOnly = false,
  flat = false,
  showNotes = false,
  onEdit,
}) {
  const amount = formatAmountRial(inquiry.unitPrice);
  const supplier = showSupplier
    ? getSupplierName(inquiry.supplierId)
    : `تامین‌کننده ${(inquiryIndex + 1).toLocaleString('fa-IR')}`;
  const notes = inquiry.notes?.trim() || '';
  const hoverDetails = [
    inquiry.supplyType,
    supplier,
    `${amount} ریال`,
    showNotes && notes ? notes : null,
  ].filter(Boolean).join(' — ');

  const canSelect = Boolean(selectable && !readOnly && onSelectTarget);
  const handleSelect = () => {
    if (!canSelect || isTarget) return;
    onSelectTarget(inquiry.id);
  };

  return (
    <div
      className={`nabz-inquiry-compact${isTarget ? ' is-target' : ''}${flat ? ' is-flat' : ''}${readOnly ? ' is-readonly' : ''}${canSelect ? ' is-selectable' : ''}`}
      title={hoverDetails}
      onClick={canSelect ? handleSelect : undefined}
      onKeyDown={canSelect ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelect();
        }
      } : undefined}
      role={canSelect ? 'button' : undefined}
      tabIndex={canSelect ? 0 : undefined}
      aria-pressed={canSelect ? isTarget : undefined}
      aria-label={canSelect ? `استعلام ${supplier}${isTarget ? ' (منتخب)' : ''}` : undefined}
    >
      <div className="nabz-inquiry-compact__body nabz-inquiry-compact__body--single-line">
        <div className="nabz-inquiry-compact__amount">
          <SupplyTypeDot supplyType={inquiry.supplyType} />
          <span className="nabz-inquiry-compact__amount-value">{amount}</span>
          <span className="nabz-inquiry-compact__currency">ریال</span>
          <span className="nabz-inquiry-compact__supplier-inline">({supplier})</span>
          {showNotes && notes ? (
            <span className="nabz-inquiry-compact__notes" title={notes}>
              {notes}
            </span>
          ) : null}
        </div>
      </div>
      {onEdit && !readOnly && (
        <button
          type="button"
          className="nabz-inquiry-compact__edit"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(inquiry.id);
          }}
          aria-label="ویرایش استعلام"
        >
          <PencilIcon />
        </button>
      )}
    </div>
  );
}
