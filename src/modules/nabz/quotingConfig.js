export const MARGIN_MODES = {
  ORDER_FIXED_RIAL: 'order_fixed_rial',
  ORDER_FIXED_PERCENT: 'order_fixed_percent',
  LINE_FIXED_RIAL: 'line_fixed_rial',
  LINE_FIXED_PERCENT: 'line_fixed_percent',
};

export const MARGIN_MODE_OPTIONS = [
  { value: MARGIN_MODES.ORDER_FIXED_RIAL, label: 'عدد ثابت ریالی برای کل سفارش' },
  { value: MARGIN_MODES.ORDER_FIXED_PERCENT, label: 'درصد ثابت برای کل سفارش' },
  { value: MARGIN_MODES.LINE_FIXED_RIAL, label: 'عدد ثابت برای هر سطر' },
  { value: MARGIN_MODES.LINE_FIXED_PERCENT, label: 'درصد برای هر سطر' },
];

export function getDefaultQuoting() {
  return {
    marginMode: MARGIN_MODES.ORDER_FIXED_PERCENT,
    orderMarginValue: '',
    lineMargins: {},
    vatInclusive: false,
  };
}
