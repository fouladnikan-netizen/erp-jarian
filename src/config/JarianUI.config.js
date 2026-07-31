/**
 * JarianUI.config.js — Unified Presentation Protocol 2.0
 *
 * قانون رسمی: `.cursor/rules/jarian-unified-presentation.mdc`
 * قبل از ساخت هر جدول جدید یا نمایش ستون قیمت/وزن/تأمین‌کننده،
 * حتماً به این فایل و سند Rule 2.0 مراجعه کنید.
 * Improvisation ممنوع است.
 */

import { formatAmountRial, parseMoneyInput } from '../modules/nabz/orderCode';

/** قواعد نمایش یکپارچه جریان */
export const JARIAN_UI = Object.freeze({
  money: Object.freeze({
    currencySuffix: 'ریال',
    /** فونت اجباری متن و اعداد */
    fontFamily: "'Vazirmatn', Tahoma, sans-serif",
    fontClass: 'font-vazir',
    align: 'center',
    textAlign: 'center',
    direction: 'rtl',
    empty: '—',
    /**
     * داخل سلول‌های جدول: بدون «ریال»
     * فقط در فوتر جمع‌ها (جمع پیش‌فاکتور / مالیات / جمع کل): با «ریال»
     */
    showCurrencyInTableCells: false,
    showCurrencyInFooter: true,
  }),
  product: Object.freeze({
    name: Object.freeze({
      fontSize: '14px',
      fontWeight: 700,
      fontFamily: "'Vazirmatn', Tahoma, sans-serif",
      className: 'jarian-product-name',
    }),
    description: Object.freeze({
      fontSize: '12px',
      color: '#757575',
      fontFamily: "'Vazirmatn', Tahoma, sans-serif",
      className: 'jarian-product-desc',
    }),
    /** نام و توضیحات در یک ستون، توضیحات زیر نام */
    separateColumns: false,
    stackedInOneCell: true,
    cellClassName: 'jarian-product-cell',
    /** داده راست‌چین؛ تیتر ستون وسط‌چین */
    dataAlign: 'right',
    headerAlign: 'center',
  }),
  supplier: Object.freeze({
    allowBox: false,
    showSupplyTypeDot: true,
    className: 'jarian-supplier',
  }),
  table: Object.freeze({
    /** همه جداول باید ستون ردیف داشته باشند */
    requireRowNumber: true,
    /** تیتر و داده وسط‌چین */
    cellAlign: 'center',
    headerAlign: 'center',
    /** بک‌گراند تیتر همه جداول */
    headerBackground: '#E8FAF7',
    headerColor: 'var(--text-primary)',
    /** راه‌راه سفید / طوسی روشن (شبیه پیش‌فاکتور) — بدون رنگ جداگانه روی سلول */
    zebra: true,
    zebraOdd: '#ffffff',
    zebraEven: 'rgba(243, 244, 246, 0.85)',
    uniformRowBackground: true,
    /** فقط خطوط افقی ظریف بین سطرها؛ بدون بوردر عمودی */
    verticalBorders: false,
    horizontalBorders: true,
    className: 'jarian-table',
  }),
});

/**
 * مبلغ عددی با جداکننده سه‌رقمی.
 * @param {object} [options]
 * @param {boolean} [options.withCurrency=false] — فقط برای فوتر جمع‌ها `true` بگذارید
 * @example formatJarianMoney(12500000) → "۱۲٬۵۰۰٬۰۰۰"
 * @example formatJarianMoney(12500000, { withCurrency: true }) → "۱۲٬۵۰۰٬۰۰۰ ریال"
 */
export function formatJarianMoney(
  amount,
  { empty = JARIAN_UI.money.empty, withCurrency = false } = {},
) {
  if (amount === '' || amount == null) return empty;
  const num = typeof amount === 'string' ? parseMoneyInput(amount) : Number(amount);
  if (num == null || !Number.isFinite(num)) return empty;
  const formatted = formatAmountRial(num);
  return withCurrency ? `${formatted} ${JARIAN_UI.money.currencySuffix}` : formatted;
}

/** مبلغ فوتر جمع‌ها — همیشه با پسوند ریال */
export function formatJarianMoneyFooter(amount, options = {}) {
  return formatJarianMoney(amount, { ...options, withCurrency: true });
}

/** وزن/مقدار عددی — جداکننده سه‌رقمی، بدون واحد */
export function formatJarianNumber(value, { empty = JARIAN_UI.money.empty } = {}) {
  if (value === '' || value == null) return empty;
  const num = Number(value);
  if (!Number.isFinite(num)) return empty;
  return formatAmountRial(num);
}

export default JARIAN_UI;
