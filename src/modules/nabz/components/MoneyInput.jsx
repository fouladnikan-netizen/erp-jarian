import { formatMoneyInputValue, parseMoneyInput } from '../orderCode';

/**
 * ورودی مبلغ با جداکننده سه‌رقمی.
 * onChange مقدار خام عددی (string بدون جداکننده) برمی‌گرداند تا با منطق فعلی سازگار بماند.
 */
export default function MoneyInput({
  value,
  onChange,
  className = '',
  placeholder = '',
  readOnly = false,
  disabled = false,
  min = 0,
  'aria-label': ariaLabel,
  ...rest
}) {
  const displayValue = formatMoneyInputValue(value);

  return (
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      className={className}
      value={displayValue}
      placeholder={placeholder}
      readOnly={readOnly}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => {
        if (readOnly || disabled) return;
        const parsed = parseMoneyInput(e.target.value);
        if (parsed == null) {
          onChange?.('');
          return;
        }
        if (min != null && parsed < min) {
          onChange?.(String(min));
          return;
        }
        onChange?.(String(parsed));
      }}
      {...rest}
    />
  );
}
