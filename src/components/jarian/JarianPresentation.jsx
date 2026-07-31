import {
  formatJarianMoney,
  JARIAN_UI,
} from '../../config/JarianUI.config';
import TruncatedText from '../../modules/nabz/components/TruncatedText';

const SUPPLY_DOT_CLASS = {
  رسمی: 'is-official',
  غیررسمی: 'is-unofficial',
  مغایرت: 'is-discrepancy',
};

function SupplyTypeDot({ supplyType, className = '' }) {
  if (!supplyType) return null;
  const tone = SUPPLY_DOT_CLASS[supplyType] || 'is-official';
  return (
    <span
      className={`nabz-inquiry-compact__dot ${tone} ${className}`.trim()}
      aria-label={supplyType}
      title={supplyType}
    />
  );
}

/**
 * نمایش مبلغ — جداکننده سه‌رقمی، Vazirmatn، وسط‌چین در سلول جدول.
 * `withCurrency` فقط برای فوتر جمع‌ها true باشد.
 */
export function JarianMoney({
  amount,
  empty = JARIAN_UI.money.empty,
  className = '',
  emphasis = false,
  withCurrency = false,
}) {
  const text = formatJarianMoney(amount, { empty, withCurrency });
  if (text === empty) {
    return <span className={`jarian-money jarian-money--empty ${className}`.trim()}>{empty}</span>;
  }
  return (
    <span
      className={`jarian-money font-vazir${emphasis ? ' jarian-money--emphasis' : ''}${withCurrency ? ' jarian-money--with-currency' : ''}${className ? ` ${className}` : ''}`}
    >
      {text}
    </span>
  );
}

/** فوتر جمع — همیشه با «ریال» */
export function JarianMoneyFooter(props) {
  return <JarianMoney {...props} withCurrency />;
}

/**
 * نام تأمین‌کننده — متن ساده + نقطه نوع تأمین؛ بدون باکس
 */
export function JarianSupplier({
  name,
  supplyType,
  className = '',
}) {
  const label = name?.trim() || '—';
  return (
    <span className={`jarian-supplier${className ? ` ${className}` : ''}`}>
      {supplyType ? <SupplyTypeDot supplyType={supplyType} /> : null}
      <span className="jarian-supplier__name">{label}</span>
    </span>
  );
}

/** نام کالا — ۱۴px Bold Vazirmatn */
export function JarianProductName({ text, empty = '—' }) {
  return (
    <span className={JARIAN_UI.product.name.className}>
      <TruncatedText text={text} empty={empty} />
    </span>
  );
}

/** توضیحات کالا — ۱۲px #757575 */
export function JarianProductDescription({ text, empty = '' }) {
  const value = text?.trim();
  if (!value) {
    return empty ? <span className={JARIAN_UI.product.description.className}>{empty}</span> : null;
  }
  return (
    <span className={JARIAN_UI.product.description.className}>
      <TruncatedText text={value} empty={empty || '—'} />
    </span>
  );
}

/**
 * سلول یکپارچه کالا: نام (Bold ۱۴px) + توضیحات زیر آن (۱۲px خاکستری)
 */
export function JarianProductCell({ name, description, empty = '—' }) {
  return (
    <div className={JARIAN_UI.product.cellClassName}>
      <JarianProductName text={name} empty={empty} />
      <JarianProductDescription text={description} />
    </div>
  );
}
