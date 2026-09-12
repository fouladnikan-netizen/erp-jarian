import './OfferSettingsFields.css';

const TYPE_LABELS = {
  count: 'واحد شمارش پیش‌فرض',
  sales: 'واحد فروش پیش‌فرض',
  weight: 'وزن واحد پیش‌فرض',
  customLength: 'امکان طول سفارشی',
};

const PRODUCT_LABELS = {
  count: 'واحد شمارش',
  sales: 'واحد فروش',
  weight: 'وزن واحد',
  customLength: 'امکان طول سفارشی',
};

/**
 * Compact «واحد و عرضه» fields for Product Type defaults and Product.
 * Not shown as settings on the order form.
 */
export default function OfferSettingsFields({
  uoms = [],
  values,
  onChange,
  disabled = false,
  idPrefix = 'offer',
  variant = 'type',
  layout = 'grid',
}) {
  const labels = variant === 'product' ? PRODUCT_LABELS : TYPE_LABELS;
  const stacked = layout === 'rows';
  const active = uoms.filter((u) => u.isActive !== false);
  const set = (key, value) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <fieldset className={`offer-settings${stacked ? ' offer-settings--rows' : ''}`} disabled={disabled}>
      <legend className="offer-settings__legend">واحد و عرضه</legend>
      <div className="offer-settings__grid">
        <label className="offer-settings__field" htmlFor={`${idPrefix}-count-unit`}>
          <span className="offer-settings__label">{labels.count}</span>
          <select
            id={`${idPrefix}-count-unit`}
            value={values.countUnitId || ''}
            onChange={(e) => set('countUnitId', e.target.value)}
          >
            <option value="">— انتخاب کنید —</option>
            {active.map((u) => (
              <option key={u.id} value={u.id}>{u.nameFa}</option>
            ))}
          </select>
        </label>
        <label className="offer-settings__field" htmlFor={`${idPrefix}-sales-unit`}>
          <span className="offer-settings__label">{labels.sales}</span>
          <select
            id={`${idPrefix}-sales-unit`}
            value={values.salesUnitId || ''}
            onChange={(e) => set('salesUnitId', e.target.value)}
          >
            <option value="">— مانند واحد شمارش —</option>
            {active.map((u) => (
              <option key={u.id} value={u.id}>{u.nameFa}</option>
            ))}
          </select>
        </label>
        {variant === 'product' && (
          <>
            <label className="offer-settings__field" htmlFor={`${idPrefix}-unit-weight`}>
              <span className="offer-settings__label">{labels.weight}</span>
              <span className="offer-settings__control">
                <input
                  id={`${idPrefix}-unit-weight`}
                  type="number"
                  step="any"
                  min="0"
                  dir="ltr"
                  value={values.unitWeight ?? ''}
                  onChange={(e) => set('unitWeight', e.target.value)}
                  placeholder="اختیاری"
                />
                <span className="offer-settings__hint">اختیاری — اگر وزن از مشخصات کالا به‌دست می‌آید خالی بماند.</span>
              </span>
            </label>
            <label className="offer-settings__field offer-settings__field--check" htmlFor={`${idPrefix}-custom-length`}>
              <span className="offer-settings__label">{labels.customLength}</span>
              <input
                id={`${idPrefix}-custom-length`}
                type="checkbox"
                checked={Boolean(values.customLengthAllowed)}
                onChange={(e) => set('customLengthAllowed', e.target.checked)}
              />
            </label>
          </>
        )}
      </div>
    </fieldset>
  );
}
