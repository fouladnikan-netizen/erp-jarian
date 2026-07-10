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

export function QuotingMatrix({
  quoting,
  onChangeMode,
  onChangeOrderValue,
  readOnly = false,
}) {
  const isPercentOrder = quoting.marginMode === MARGIN_MODES.ORDER_FIXED_PERCENT;
  const isFixedOrder = quoting.marginMode === MARGIN_MODES.ORDER_FIXED_RIAL;
  const isLinePercent = quoting.marginMode === MARGIN_MODES.LINE_FIXED_PERCENT;
  const isLineFixed = quoting.marginMode === MARGIN_MODES.LINE_FIXED_RIAL;

  return (
    <section className={`nabz-quoting-matrix${readOnly ? ' nabz-quoting-matrix--readonly' : ''}`}>
      <div className="nabz-quoting-matrix__head">
        <h4>تعیین حاشیه سود</h4>
        {readOnly && <span className="nabz-quoting-matrix__badge">فقط نمایش</span>}
      </div>
      <div className="nabz-quoting-matrix__grid">
        <span className="nabz-quoting-matrix__column-title">اعمال کلی</span>
        <span className="nabz-quoting-matrix__column-title">اعمال سطری</span>

        <label className={`nabz-quoting-matrix__cell${isPercentOrder ? ' is-selected' : ''}`}>
          <input
            type="radio"
            name="margin-mode"
            checked={isPercentOrder}
            disabled={readOnly}
            readOnly={readOnly}
            onChange={() => !readOnly && onChangeMode?.(MARGIN_MODES.ORDER_FIXED_PERCENT)}
          />
          <div className="nabz-quoting-matrix__cell-body">
            <span>درصد کلی</span>
            <input
              type="number"
              min="0"
              className="nabz-form__input nabz-quoting-matrix__input"
              value={isPercentOrder ? (quoting.orderMarginValue ?? '') : ''}
              onChange={(e) => onChangeOrderValue?.(e.target.value)}
              placeholder="%"
              disabled={readOnly || !isPercentOrder}
              readOnly={readOnly}
            />
          </div>
        </label>

        <label className={`nabz-quoting-matrix__cell${isLinePercent ? ' is-selected' : ''}`}>
          <input
            type="radio"
            name="margin-mode"
            checked={isLinePercent}
            disabled={readOnly}
            readOnly={readOnly}
            onChange={() => !readOnly && onChangeMode?.(MARGIN_MODES.LINE_FIXED_PERCENT)}
          />
          <div className="nabz-quoting-matrix__cell-body">
            <span>درصد سطری</span>
            <span className="nabz-quoting-matrix__input-spacer" aria-hidden="true" />
          </div>
        </label>

        <label className={`nabz-quoting-matrix__cell${isFixedOrder ? ' is-selected' : ''}`}>
          <input
            type="radio"
            name="margin-mode"
            checked={isFixedOrder}
            disabled={readOnly}
            readOnly={readOnly}
            onChange={() => !readOnly && onChangeMode?.(MARGIN_MODES.ORDER_FIXED_RIAL)}
          />
          <div className="nabz-quoting-matrix__cell-body">
            <span>مبلغ کلی (هر سطر)</span>
            <MoneyInput
              className="nabz-form__input nabz-quoting-matrix__input"
              value={isFixedOrder ? (quoting.orderMarginValue ?? '') : ''}
              onChange={(next) => onChangeOrderValue?.(next)}
              placeholder="ریال"
              disabled={readOnly || !isFixedOrder}
              readOnly={readOnly}
            />
          </div>
        </label>

        <label className={`nabz-quoting-matrix__cell${isLineFixed ? ' is-selected' : ''}`}>
          <input
            type="radio"
            name="margin-mode"
            checked={isLineFixed}
            disabled={readOnly}
            readOnly={readOnly}
            onChange={() => !readOnly && onChangeMode?.(MARGIN_MODES.LINE_FIXED_RIAL)}
          />
          <div className="nabz-quoting-matrix__cell-body">
            <span>مبلغ سطری</span>
            <span className="nabz-quoting-matrix__input-spacer" aria-hidden="true" />
          </div>
        </label>
      </div>
    </section>
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

export function InquiryCompact({
  inquiry,
  selectable,
  isTarget,
  onSelectTarget,
  showSupplier,
  readOnly = false,
}) {
  const amount = formatAmountRial(inquiry.unitPrice);
  const supplier = getSupplierName(inquiry.supplierId);
  const hoverDetails = showSupplier
    ? `${inquiry.supplyType} — ${supplier} — ${amount} ریال`
    : `${inquiry.supplyType} — ${amount} ریال`;

  return (
    <div
      className={`nabz-inquiry-compact${isTarget ? ' is-target' : ''}${showSupplier ? '' : ' is-knight-view'}${readOnly ? ' is-readonly' : ''}`}
      title={hoverDetails}
    >
      {selectable && !readOnly && (
        <input
          type="checkbox"
          className="nabz-inquiry-compact__target"
          checked={isTarget}
          onChange={() => {
            if (!isTarget) onSelectTarget?.(inquiry.id);
          }}
          aria-label="انتخاب به عنوان هدف"
        />
      )}
      {readOnly && isTarget && (
        <span className="nabz-inquiry-compact__target-badge" aria-label="استعلام هدف">✓</span>
      )}
      <div className={`nabz-inquiry-compact__body${showSupplier ? '' : ' nabz-inquiry-compact__body--single-line'}`}>
        <div className="nabz-inquiry-compact__amount">
          {!showSupplier && <SupplyTypeDot supplyType={inquiry.supplyType} />}
          <span className="nabz-inquiry-compact__amount-value">{amount}</span>
          <span className="nabz-inquiry-compact__currency">ریال</span>
        </div>
        {showSupplier && (
          <div className="nabz-inquiry-compact__meta">
            <SupplyTypeDot supplyType={inquiry.supplyType} />
            <span className="nabz-inquiry-compact__supplier">{supplier}</span>
          </div>
        )}
      </div>
    </div>
  );
}
