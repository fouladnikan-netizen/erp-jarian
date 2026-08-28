import { useEffect, useMemo, useState } from 'react';
import { useAttributeDefinitionsStore } from '../../../stores/useAttributeDefinitionsStore';

const WEIGHT_PROFILE_TYPES = [
  { value: 'FIXED', label: 'ثابت (وزن استاندارد هر واحد)', coefficientKey: 'weightPerUnit', coefficientLabel: 'وزن ثابت هر واحد (کیلوگرم)' },
  { value: 'PER_LENGTH', label: 'بر واحد طول (کیلوگرم بر متر)', coefficientKey: 'weightPerMeter', coefficientLabel: 'ضریب کیلوگرم بر متر' },
  { value: 'DIMENSIONAL', label: 'محاسباتی از ابعاد (ضخامت × عرض × طول × چگالی)', coefficientKey: 'densityKgPerM3', coefficientLabel: 'چگالی (کیلوگرم بر متر مکعب)' },
  { value: 'MANUAL_ACTUAL', label: 'بدون وزن نظری — فقط وزن واقعی تراکنش', coefficientKey: null, coefficientLabel: null },
];

function AttributeField({ definition, binding, uoms, value, onChange }) {
  const uom = uoms.find((u) => u.id === definition.uomId);
  const label = `${definition.nameFa}${uom ? ` (${uom.code})` : ''}${binding.isRequired ? ' *' : ''}`;

  if (definition.dataType === 'ENUM') {
    return (
      <label className="vitrin-form__field">
        <span className="vitrin-form__label">{label}</span>
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— انتخاب کنید —</option>
          {(definition.allowedValues || []).map((v) => (
            <option key={v.value} value={v.value}>{v.labelFa || v.value}</option>
          ))}
        </select>
      </label>
    );
  }
  if (definition.dataType === 'BOOLEAN') {
    return (
      <label className="vitrin-form__field vitrin-form__field--checkbox">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        <span>{label}</span>
      </label>
    );
  }
  const inputType = definition.dataType === 'DECIMAL' || definition.dataType === 'INTEGER'
    ? 'number'
    : definition.dataType === 'DATE' ? 'date' : 'text';
  return (
    <label className="vitrin-form__field">
      <span className="vitrin-form__label">{label}</span>
      <input
        type={inputType}
        step={definition.dataType === 'DECIMAL' ? 'any' : undefined}
        min={binding.overrideMin ?? definition.minValue ?? undefined}
        max={binding.overrideMax ?? definition.maxValue ?? undefined}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        dir={inputType === 'number' ? 'ltr' : undefined}
      />
    </label>
  );
}

/**
 * Schema-driven Product creation (product contract "VITRIN UI EXPECTATIONS").
 * Group -> Category -> Product Type narrows the form; attribute fields come
 * from the Product Type's effective Attribute Schema (DDL-24c) — never a
 * static steel-only form. All identity/duplicate/SKU logic is backend-only;
 * this form only surfaces the 409 warning and lets the user confirm.
 */
export default function ProductFormModal({ groups, categories, types, brands, uoms, onClose, onSubmit }) {
  const fetchSchemaForType = useAttributeDefinitionsStore((s) => s.fetchSchemaForType);
  const schemaByType = useAttributeDefinitionsStore((s) => s.schemaByType);

  const [groupId, setGroupId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productTypeId, setProductTypeId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [displayNameOverride, setDisplayNameOverride] = useState('');
  const [attributeValues, setAttributeValues] = useState({});
  const [baseUomId, setBaseUomId] = useState('');
  const [salesUomId, setSalesUomId] = useState('');
  const [purchaseUomId, setPurchaseUomId] = useState('');
  const [weightProfileType, setWeightProfileType] = useState('MANUAL_ACTUAL');
  const [weightCoefficient, setWeightCoefficient] = useState('');
  const [error, setError] = useState('');
  const [probable, setProbable] = useState(null);
  const [busy, setBusy] = useState(false);

  const categoryOptions = categories.filter((c) => c.groupId === groupId && c.isActive !== false);
  const typeOptions = types.filter((t) => t.categoryId === categoryId && t.isActive !== false);
  const schema = schemaByType[productTypeId] || [];

  useEffect(() => {
    if (productTypeId) void fetchSchemaForType(productTypeId);
  }, [productTypeId, fetchSchemaForType]);

  useEffect(() => { setCategoryId(''); setProductTypeId(''); }, [groupId]);
  useEffect(() => { setProductTypeId(''); }, [categoryId]);
  useEffect(() => { setAttributeValues({}); setProbable(null); }, [productTypeId]);

  const previewName = useMemo(() => {
    const type = types.find((t) => t.id === productTypeId);
    if (!type) return '———';
    const displayParts = schema
      .filter((e) => e.binding.isDisplayRelevant)
      .sort((a, b) => a.binding.sortOrder - b.binding.sortOrder)
      .map((e) => attributeValues[e.definition.id])
      .filter((v) => v !== undefined && v !== '' && v !== null);
    return [type.name, ...displayParts].join(' | ');
  }, [types, productTypeId, schema, attributeValues]);

  async function submit(confirmDuplicate = false) {
    setError('');
    setBusy(true);
    try {
      const activeProfile = WEIGHT_PROFILE_TYPES.find((w) => w.value === weightProfileType);
      const weightProfileCoefficients = activeProfile?.coefficientKey && weightCoefficient
        ? { [activeProfile.coefficientKey]: Number(weightCoefficient) }
        : {};
      const payload = {
        productTypeId,
        brandId: brandId || null,
        displayNameOverride: displayNameOverride.trim() || null,
        attributeValues,
        baseUomId: baseUomId || null,
        salesUomId: salesUomId || null,
        purchaseUomId: purchaseUomId || null,
        weightProfileType,
        weightProfileCoefficients,
        confirmDuplicate,
      };
      await onSubmit(payload);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.error === 'PRODUCT_PROBABLE_DUPLICATE') {
        setProbable(data.details?.probable || []);
      } else if (data?.error === 'PRODUCT_DUPLICATE_EXACT') {
        setError(`این کالا قبلاً با کد ${data.details?.existingSku || ''} ثبت شده است — امکان ثبت تکراری وجود ندارد.`);
      } else {
        setError(data?.message || err?.message || 'ثبت کالا ناموفق بود.');
      }
    } finally {
      setBusy(false);
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!productTypeId) { setError('نوع کالا را انتخاب کنید.'); return; }
    setProbable(null);
    void submit(false);
  };

  return (
    <div className="vitrin-modal-overlay" onClick={onClose} role="presentation">
      <div className="vitrin-modal vitrin-modal--wide" role="dialog" aria-modal="true" aria-label="ثبت کالای جدید" onClick={(e) => e.stopPropagation()}>
        <header className="vitrin-modal__header">
          <h2 className="vitrin-modal__title">ثبت کالای جدید</h2>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <form className="vitrin-modal__body" onSubmit={handleSubmit}>
          <div className="vitrin-form__grid">
            <label className="vitrin-form__field">
              <span className="vitrin-form__label">گروه کالا</span>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
                <option value="">— انتخاب کنید —</option>
                {groups.filter((g) => g.isActive !== false).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label className="vitrin-form__field">
              <span className="vitrin-form__label">دسته کالا</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!groupId} required>
                <option value="">— انتخاب کنید —</option>
                {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="vitrin-form__field">
              <span className="vitrin-form__label">نوع کالا</span>
              <select value={productTypeId} onChange={(e) => setProductTypeId(e.target.value)} disabled={!categoryId} required>
                <option value="">— انتخاب کنید —</option>
                {typeOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          </div>

          {productTypeId && (
            <>
              {schema.length > 0 && (
                <div className="vitrin-form__grid">
                  {schema
                    .filter((e) => e.binding.attributeRole !== 'TRANSACTION_ONLY')
                    .map(({ binding, definition }) => (
                      <AttributeField
                        key={definition.id}
                        definition={definition}
                        binding={binding}
                        uoms={uoms}
                        value={attributeValues[definition.id]}
                        onChange={(v) => setAttributeValues((prev) => ({ ...prev, [definition.id]: v }))}
                      />
                    ))}
                </div>
              )}

              <label className="vitrin-form__field">
                <span className="vitrin-form__label">نام نمایشی تولیدشده (پیش‌نمایش)</span>
                <input type="text" className="vitrin-form__readonly" value={previewName} readOnly aria-readonly="true" />
                <span className="vitrin-form__hint">از نوع کالا + ویژگی‌های شناسایی‌کننده ساخته می‌شود — منبع حقیقت داده ساختاریافته است.</span>
              </label>
              <label className="vitrin-form__field">
                <span className="vitrin-form__label">عنوان نمایشی جایگزین (اختیاری)</span>
                <input type="text" value={displayNameOverride} onChange={(e) => setDisplayNameOverride(e.target.value)} placeholder="در صورت نیاز به نام تجاری متفاوت" />
              </label>

              <div className="vitrin-form__grid">
                <label className="vitrin-form__field">
                  <span className="vitrin-form__label">برند (اختیاری)</span>
                  <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                    <option value="">— بدون برند —</option>
                    {brands.filter((b) => b.isActive !== false).map((b) => <option key={b.id} value={b.id}>{b.brandName}</option>)}
                  </select>
                </label>
                <label className="vitrin-form__field">
                  <span className="vitrin-form__label">واحد پایه</span>
                  <select value={baseUomId} onChange={(e) => setBaseUomId(e.target.value)}>
                    <option value="">— انتخاب کنید —</option>
                    {uoms.map((u) => <option key={u.id} value={u.id}>{u.nameFa}</option>)}
                  </select>
                </label>
                <label className="vitrin-form__field">
                  <span className="vitrin-form__label">واحد فروش (اختیاری)</span>
                  <select value={salesUomId} onChange={(e) => setSalesUomId(e.target.value)}>
                    <option value="">— مانند واحد پایه —</option>
                    {uoms.map((u) => <option key={u.id} value={u.id}>{u.nameFa}</option>)}
                  </select>
                </label>
                <label className="vitrin-form__field">
                  <span className="vitrin-form__label">واحد خرید (اختیاری)</span>
                  <select value={purchaseUomId} onChange={(e) => setPurchaseUomId(e.target.value)}>
                    <option value="">— مانند واحد پایه —</option>
                    {uoms.map((u) => <option key={u.id} value={u.id}>{u.nameFa}</option>)}
                  </select>
                </label>
              </div>

              <div className="vitrin-form__grid">
                <label className="vitrin-form__field">
                  <span className="vitrin-form__label">روش محاسبه وزن</span>
                  <select value={weightProfileType} onChange={(e) => setWeightProfileType(e.target.value)}>
                    {WEIGHT_PROFILE_TYPES.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                </label>
                {weightProfileType !== 'MANUAL_ACTUAL' && (
                  <label className="vitrin-form__field">
                    <span className="vitrin-form__label">
                      {WEIGHT_PROFILE_TYPES.find((w) => w.value === weightProfileType)?.coefficientLabel}
                    </span>
                    <input type="number" step="any" dir="ltr" value={weightCoefficient} onChange={(e) => setWeightCoefficient(e.target.value)} />
                    {weightProfileType === 'DIMENSIONAL' && (
                      <span className="vitrin-form__hint">اختیاری — در صورت خالی بودن، فقط فرمول پیش‌فرض ثبت می‌شود.</span>
                    )}
                  </label>
                )}
              </div>
            </>
          )}

          {error && <p className="vitrin-form__error">{error}</p>}
          {probable && (
            <div className="vitrin-form__warning">
              کالاهای مشابهی در همین نوع کالا یافت شد:{' '}
              {probable.map((p) => p.generatedName).join('، ')}.
              {' '}
              <button type="button" className="btn btn--outline" onClick={() => submit(true)} disabled={busy}>
                با این حال، کالای متمایزی است — ثبت شود
              </button>
            </div>
          )}

          <footer className="vitrin-modal__footer">
            <button type="button" className="btn btn--outline" onClick={onClose}>انصراف</button>
            <button type="submit" className="btn btn--primary" disabled={busy || !productTypeId}>ثبت کالا</button>
          </footer>
        </form>
      </div>
    </div>
  );
}
