import { useEffect, useMemo, useState } from 'react';
import { JarianDrawer } from '../../../components/ui';
import { useAttributeDefinitionsStore } from '../../../stores/useAttributeDefinitionsStore';
import { effectiveEnumOptions, isProductScope, productAttributeDefaults } from '../../../domain/productMaster/allowedAttributeValues';
import { previewCreatedProductName } from '../../../domain/productMaster/displayNameRule';
import { formatProductDisplayText } from '../../../domain/productMaster/productDisplayText';
import { seedOfferSettingsFromType } from '../../../domain/productMaster/offerSettings';
import OfferSettingsFields from '../../../components/productMaster/OfferSettingsFields';

const WEIGHT_PROFILE_TYPES = [
  { value: 'FIXED', label: 'ثابت (وزن استاندارد هر واحد)', coefficientKey: 'weightPerUnit', coefficientLabel: 'وزن ثابت هر واحد (کیلوگرم)' },
  { value: 'PER_LENGTH', label: 'بر واحد طول (کیلوگرم بر متر)', coefficientKey: 'weightPerMeter', coefficientLabel: 'ضریب کیلوگرم بر متر' },
  { value: 'DIMENSIONAL', label: 'محاسباتی از ابعاد (ضخامت × عرض × طول × چگالی)', coefficientKey: 'densityKgPerM3', coefficientLabel: 'چگالی (کیلوگرم بر متر مکعب)' },
  { value: 'MANUAL_ACTUAL', label: 'بدون وزن نظری — فقط وزن واقعی تراکنش', coefficientKey: null, coefficientLabel: null },
];

function AttributeField({ definition, binding, uoms, value, onChange }) {
  const uom = uoms.find((u) => u.id === definition.uomId);
  const required = Boolean(binding.isRequired) && isProductScope(binding);
  const label = `${definition.nameFa}${uom ? ` (${uom.code})` : ''}${required ? ' *' : ''}`;
  const enumOptions = effectiveEnumOptions(definition, binding);

  if (definition.dataType === 'ENUM') {
    return (
      <label className="vitrin-form__field">
        <span className="vitrin-form__label">{label}</span>
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— انتخاب کنید —</option>
          {enumOptions.map((v) => (
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
  const isNumeric = definition.dataType === 'DECIMAL' || definition.dataType === 'INTEGER';
  const inputType = isNumeric
    ? 'number'
    : definition.dataType === 'DATE' ? 'date' : 'text';
  return (
    <label className="vitrin-form__field">
      <span className="vitrin-form__label">{label}</span>
      <input
        type={inputType}
        step={isNumeric ? 'any' : undefined}
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
 * from the Product Type's effective Attribute Schema (DDL-24c / DDL-46) — never a
 * static steel-only form. Identity, uniqueness, and SKU are backend-only;
 * this form confirms probable-name duplicates and otherwise submits names and attributes.
 */
export default function ProductFormModal({
  open = true,
  groups,
  categories,
  types,
  brands,
  uoms,
  onClose,
  onSubmit,
}) {
  const fetchSchemaForType = useAttributeDefinitionsStore((s) => s.fetchSchemaForType);
  const schemaByType = useAttributeDefinitionsStore((s) => s.schemaByType);
  const schemaErrorByType = useAttributeDefinitionsStore((s) => s.schemaErrorByType);

  const [groupId, setGroupId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productTypeId, setProductTypeId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [displayNameOverride, setDisplayNameOverride] = useState('');
  const [overrideTouched, setOverrideTouched] = useState(false);
  const [attributeValues, setAttributeValues] = useState({});
  const [offer, setOffer] = useState(seedOfferSettingsFromType());
  const [weightProfileType, setWeightProfileType] = useState('MANUAL_ACTUAL');
  const [weightCoefficient, setWeightCoefficient] = useState('');
  const [error, setError] = useState('');
  const [probable, setProbable] = useState(null);
  const [busy, setBusy] = useState(false);

  const categoryOptions = categories.filter((c) => c.groupId === groupId && c.isActive !== false);
  const typeOptions = types.filter((t) => t.categoryId === categoryId && t.isActive !== false);
  const schema = schemaByType[productTypeId] || [];
  const schemaError = productTypeId ? schemaErrorByType[productTypeId] : null;
  const productSchema = schema.filter((e) => isProductScope(e.binding));
  const selectedType = types.find((t) => t.id === productTypeId);
  const selectedGroup = groups.find((g) => g.id === groupId);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const allowedBrandIds = selectedType?.allowedBrandIds || [];
  const brandOptions = brands
    .filter((b) => b.isActive !== false)
    .filter((b) => !allowedBrandIds.length || allowedBrandIds.includes(b.id));

  useEffect(() => {
    if (productTypeId) void fetchSchemaForType(productTypeId);
  }, [productTypeId, fetchSchemaForType]);

  useEffect(() => { setCategoryId(''); setProductTypeId(''); }, [groupId]);
  useEffect(() => { setProductTypeId(''); }, [categoryId]);
  useEffect(() => {
    setProbable(null);
    setBrandId('');
    setDisplayNameOverride('');
    setOverrideTouched(false);
    setOffer(seedOfferSettingsFromType(types.find((t) => t.id === productTypeId)));
    setAttributeValues(
      productTypeId && schemaByType[productTypeId]
        ? productAttributeDefaults(schemaByType[productTypeId])
        : {},
    );
  }, [productTypeId]);
  useEffect(() => {
    if (!productTypeId) return;
    const loaded = schemaByType[productTypeId];
    if (!loaded) return;
    setAttributeValues((prev) => (
      Object.keys(prev).length ? prev : productAttributeDefaults(loaded)
    ));
  }, [productTypeId, schemaByType]);

  const previewName = useMemo(() => {
    if (!selectedType) return '';
    return previewCreatedProductName({
      type: selectedType,
      group: selectedGroup,
      category: selectedCategory,
      schema,
      attributeValues,
      uoms,
      emptyAsPlaceholder: true,
    }) || '';
  }, [selectedType, selectedGroup, selectedCategory, schema, attributeValues, uoms]);

  const overrideValue = overrideTouched ? displayNameOverride : previewName;

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
        displayNameOverride: (() => {
          const typed = overrideValue.trim();
          if (!typed || typed === previewName.trim()) return null;
          return typed;
        })(),
        attributeValues,
        baseUomId: offer.countUnitId || null,
        salesUomId: offer.salesUnitId || null,
        unitWeight: offer.unitWeight === '' ? null : Number(offer.unitWeight),
        customLengthAllowed: Boolean(offer.customLengthAllowed),
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
        onClose();
        return;
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
    <JarianDrawer
      open={open}
      onClose={onClose}
      title="ثبت کالای جدید"
      size="lg"
      className="vitrin-product-drawer"
      footer={(
        <>
          <button type="button" className="btn btn--outline" onClick={onClose}>انصراف</button>
          <button
            type="submit"
            form="vitrin-product-create-form"
            className="btn btn--primary"
            disabled={busy || !productTypeId}
          >
            ثبت کالا
          </button>
        </>
      )}
    >
        <form id="vitrin-product-create-form" className="vitrin-product-drawer__form" onSubmit={handleSubmit}>
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
              {schemaError ? (
                <p className="vitrin-form__hint" role="alert">
                  ویژگی‌های این نوع بارگذاری نشد.
                  {' '}
                  <button type="button" className="btn btn--outline" onClick={() => { void fetchSchemaForType(productTypeId); }}>
                    تلاش دوباره
                  </button>
                </p>
              ) : null}
              {productSchema.length > 0 && (
                <div className="vitrin-form__grid">
                  {productSchema.map(({ binding, definition }) => (
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
                <span className="vitrin-form__label">عنوان نمایشی جایگزین (اختیاری)</span>
                <textarea
                  rows={2}
                  dir="rtl"
                  value={overrideValue}
                  onChange={(e) => {
                    setOverrideTouched(true);
                    setDisplayNameOverride(e.target.value);
                  }}
                  placeholder="پیش‌نمایش نام از ساختار همین نوع کالا"
                />
                <span className="vitrin-form__hint">همان ساختار نام این نوع کالا. فیلدهای خالی به‌صورت {'{نام ویژگی}'} می‌مانند تا پر شوند.</span>
              </label>
              <label className="vitrin-form__field">
                <span className="vitrin-form__label">برند (اختیاری)</span>
                <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                  <option value="">— بدون برند —</option>
                  {brandOptions.map((b) => <option key={b.id} value={b.id}>{b.brandName}</option>)}
                </select>
              </label>

              <OfferSettingsFields
                variant="product"
                idPrefix="product-create"
                uoms={uoms}
                values={offer}
                onChange={setOffer}
              />

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
              {probable.map((p) => formatProductDisplayText(p.generatedName)).join('، ')}.
              {' '}
              <button type="button" className="btn btn--outline" onClick={() => submit(true)} disabled={busy}>
                با این حال، کالای متمایزی است — ثبت شود
              </button>
            </div>
          )}

        </form>
    </JarianDrawer>
  );
}
