/**
 * فرم اطلاعات تحویل
 * @param {boolean} showToggle — در فرم تعیین تکلیف: افشای تدریجی با چک‌باکس؛ در مودال هدر: false
 */
export default function DeliveryInfoForm({
  value,
  onChange,
  idPrefix = 'delivery',
  compact = false,
  showToggle = true,
}) {
  const info = value || {};
  const needsShipping = Boolean(info.needsShipping);
  const showFields = showToggle ? needsShipping : true;

  const patch = (partial) => {
    onChange?.({
      ...info,
      ...partial,
      ...(showToggle ? {} : { needsShipping: true }),
    });
  };

  return (
    <section className={`delivery-info-form${compact ? ' delivery-info-form--compact' : ''}`}>
      {showToggle && (
        <header className="delivery-info-form__head">
          <h3 className="delivery-info-form__title">اطلاعات تحویل</h3>
          <label className="delivery-info-form__toggle" htmlFor={`${idPrefix}-needs-shipping`}>
            <input
              id={`${idPrefix}-needs-shipping`}
              type="checkbox"
              checked={needsShipping}
              onChange={(e) => patch({ needsShipping: e.target.checked })}
            />
            <span>محل ارسال بار را تکمیل می‌کنم</span>
          </label>
        </header>
      )}

      {showFields && (
        <div className="delivery-info-form__fields">
          <label className="gateway-decision__field delivery-info-form__field">
            <span>آدرس محل تخلیه</span>
            <textarea
              className="gateway-decision__textarea"
              rows={compact ? 2 : 3}
              value={info.unloadAddress || ''}
              onChange={(e) => patch({ unloadAddress: e.target.value })}
              placeholder="آدرس کامل محل تخلیه بار..."
              aria-label="آدرس محل تخلیه"
            />
          </label>

          <div className="delivery-info-form__row">
            <label className="gateway-decision__field delivery-info-form__field">
              <span>کد پستی</span>
              <input
                type="text"
                className="gateway-decision__input"
                value={info.postalCode || ''}
                onChange={(e) => patch({ postalCode: e.target.value })}
                placeholder="۱۰ رقم"
                inputMode="numeric"
                aria-label="کد پستی"
              />
            </label>
            <label className="gateway-decision__field delivery-info-form__field">
              <span>شماره تماس</span>
              <input
                type="tel"
                className="gateway-decision__input"
                value={info.recipientPhone || ''}
                onChange={(e) => patch({ recipientPhone: e.target.value })}
                placeholder="۰۹۱۲..."
                aria-label="شماره تماس تحویل‌گیرنده"
              />
            </label>
          </div>

          <label className="gateway-decision__field delivery-info-form__field">
            <span>نام تحویل‌گیرنده</span>
            <input
              type="text"
              className="gateway-decision__input"
              value={info.recipientName || ''}
              onChange={(e) => patch({ recipientName: e.target.value })}
              placeholder="نام و نام خانوادگی"
              aria-label="نام تحویل‌گیرنده"
            />
          </label>

          <label className="gateway-decision__field delivery-info-form__field">
            <span>توضیحات مهم ارسال</span>
            <textarea
              className="gateway-decision__textarea"
              rows={2}
              value={info.shippingNotes || ''}
              onChange={(e) => patch({ shippingNotes: e.target.value })}
              placeholder="محدودیت ورود ماشین، ساعت مجاز تخلیه، و..."
              aria-label="توضیحات مهم ارسال"
            />
          </label>
        </div>
      )}
    </section>
  );
}
