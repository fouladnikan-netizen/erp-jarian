import { useEffect, useMemo, useState } from 'react';
import OfferSettingsFields from '../../../components/productMaster/OfferSettingsFields';
import { applyNpsInchSizeDisplay } from '../../../domain/productMaster/npsInchDisplay';

const WEIGHT_PROFILE_LABELS = {
  FIXED: 'ثابت (وزن استاندارد هر واحد)',
  PER_LENGTH: 'بر واحد طول (کیلوگرم بر متر)',
  DIMENSIONAL: 'محاسباتی از ابعاد (ضخامت × عرض × طول × چگالی)',
  MANUAL_ACTUAL: 'بدون وزن نظری — فقط وزن واقعی تراکنش',
};

/** DDL-59: no Product-to-Product «روابط کالا» tab. */
function buildTabs() {
  return [
    { id: 'specs', label: 'مشخصات ساختاری' },
    { id: 'traceability', label: 'ردیابی کالا' },
  ];
}

function formatAttributeValue(product, value) {
  if (value.dataType === 'BOOLEAN') return value.valueBoolean ? 'بله' : 'خیر';

  if (value.valueNumber != null && Number.isFinite(Number(value.valueNumber))) {
    const nps = applyNpsInchSizeDisplay({
      typeName: product.productTypeName,
      code: value.attributeCode,
      displayValue: value.valueNumber,
    });
    if (nps.displayValue != null && nps.displayValue !== value.valueNumber) {
      return nps.displayValue;
    }
    return Number(value.valueNumber).toLocaleString('fa-IR', { maximumFractionDigits: 4 });
  }

  return value.valueText || '—';
}

function weightProfileLabel(type) {
  return WEIGHT_PROFILE_LABELS[type] || '—';
}

function taxonomyCrumb(product) {
  return [product.groupName, product.categoryName, product.productTypeName]
    .filter(Boolean)
    .join(' / ');
}

/**
 * Product profile — structured attribute values only, no free-text specs
 * blob. The "traceability" tab is a labeled placeholder, not a copied
 * order history — see Docs/architecture/product-master-nabz-future-contract.md.
 */
export default function ProductProfileDrawer({
  product,
  brands,
  uoms,
  onClose,
  onToggleActive,
  onDelete,
  onUpdate,
}) {
  const tabs = useMemo(() => buildTabs(), []);
  const [activeTab, setActiveTab] = useState('specs');
  const [offerError, setOfferError] = useState('');
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState(() => ({
    countUnitId: product.countUnitId || product.baseUomId || '',
    salesUnitId: product.salesUnitId || product.salesUomId || '',
    unitWeight: product.unitWeight == null ? '' : String(product.unitWeight),
    customLengthAllowed: Boolean(product.customLengthAllowed),
  }));

  useEffect(() => {
    setActiveTab('specs');
    setOffer({
      countUnitId: product.countUnitId || product.baseUomId || '',
      salesUnitId: product.salesUnitId || product.salesUomId || '',
      unitWeight: product.unitWeight == null ? '' : String(product.unitWeight),
      customLengthAllowed: Boolean(product.customLengthAllowed),
    });
    setOfferError('');
  }, [product.id, product.baseUomId, product.salesUomId, product.unitWeight, product.customLengthAllowed]);

  const brand = brands.find((b) => b.id === product.brandId);
  const canEditOffer = typeof onUpdate === 'function';
  const isActive = product.lifecycleStatus !== 'INACTIVE';
  const attributeValues = product.attributeValues || [];
  const allowedGroups = product.allowedAttributeGroups || [];

  const handleSaveOffer = async (e) => {
    e.preventDefault();
    if (!canEditOffer) return;
    setOfferError('');
    setBusy(true);
    try {
      await onUpdate(product.id, {
        baseUomId: offer.countUnitId || null,
        salesUomId: offer.salesUnitId || null,
        unitWeight: offer.unitWeight === '' ? null : Number(offer.unitWeight),
        customLengthAllowed: Boolean(offer.customLengthAllowed),
      });
    } catch (err) {
      setOfferError(err?.response?.data?.message || err?.message || 'ذخیره واحد و عرضه ناموفق بود.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vitrin-drawer-overlay" onClick={onClose} role="presentation">
      <aside
        className="vitrin-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`پروفایل ${product.generatedName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="vitrin-drawer__header">
          <div className="vitrin-drawer__identity">
            <h2 className="vitrin-drawer__title">{product.displayNameOverride || product.generatedName}</h2>
            <p className="vitrin-drawer__subtitle">{taxonomyCrumb(product) || '—'}</p>
          </div>
          <div className="vitrin-drawer__header-actions">
            {typeof onToggleActive === 'function' && (
              <button type="button" className="btn btn--outline" onClick={() => onToggleActive(product)}>
                {isActive ? 'غیرفعال کردن' : 'فعال کردن'}
              </button>
            )}
            {typeof onDelete === 'function' && (
              <button type="button" className="btn btn--outline-danger" onClick={() => onDelete(product)}>
                حذف
              </button>
            )}
          </div>
          <button type="button" className="vitrin-drawer__close" onClick={onClose} aria-label="بستن">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="vitrin-drawer__tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`vitrin-drawer__tab${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="vitrin-drawer__body">
          {activeTab === 'specs' && (
            <div className="vitrin-profile-panel">
              <section className="vitrin-profile-card" aria-labelledby={`product-${product.id}-attrs`}>
                <h3 id={`product-${product.id}-attrs`} className="vitrin-profile-section__title">ویژگی‌های ساختاری</h3>
                {attributeValues.length ? (
                  <table className="jarian-table vitrin-profile-table">
                    <thead>
                      <tr>
                        <th>ردیف</th>
                        <th>ویژگی</th>
                        <th>مقدار</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attributeValues.map((value, index) => (
                        <tr key={value.id}>
                          <td className="vitrin-profile-table__num">{(index + 1).toLocaleString('fa-IR')}</td>
                          <td className="vitrin-profile-table__name">{value.attributeNameFa}</td>
                          <td className="vitrin-profile-table__value">{formatAttributeValue(product, value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="vitrin-profile-panel__empty vitrin-profile-panel__empty--inline">
                    ویژگی ساختاری ثبت‌شده‌ای ندارد.
                  </p>
                )}
              </section>

              {allowedGroups.length > 0 && (
                <section className="vitrin-profile-card" aria-labelledby={`product-${product.id}-allowed`}>
                  <h3 id={`product-${product.id}-allowed`} className="vitrin-profile-section__title">گزینه‌های مجاز برای سفارش</h3>
                  <table className="jarian-table vitrin-profile-table">
                    <thead>
                      <tr>
                        <th>ردیف</th>
                        <th>ویژگی</th>
                        <th>گزینه‌ها</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allowedGroups.map((group, index) => (
                        <tr key={group.attributeDefinitionId}>
                          <td className="vitrin-profile-table__num">{(index + 1).toLocaleString('fa-IR')}</td>
                          <td className="vitrin-profile-table__name">{group.attributeNameFa}</td>
                          <td className="vitrin-profile-table__value">{group.values.join('، ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              <form className="vitrin-profile-card vitrin-profile-card--offer" onSubmit={handleSaveOffer}>
                <OfferSettingsFields
                  variant="product"
                  idPrefix={`product-${product.id}`}
                  uoms={uoms}
                  values={offer}
                  onChange={setOffer}
                  disabled={!canEditOffer || busy}
                />
                {offerError && <p className="vitrin-form__error">{offerError}</p>}
                {canEditOffer && (
                  <div className="offer-settings__actions">
                    <button type="submit" className="btn btn--primary vitrin-drawer__save" disabled={busy}>
                      ذخیره واحد و عرضه
                    </button>
                  </div>
                )}
              </form>

              <section className="vitrin-profile-card" aria-label="روش محاسبه و برند">
                <dl className="vitrin-profile-meta">
                  <div className="vitrin-profile-meta__row">
                    <dt>روش محاسبه وزن</dt>
                    <dd>{weightProfileLabel(product.weightProfileType)}</dd>
                  </div>
                  <div className="vitrin-profile-meta__row">
                    <dt>برند</dt>
                    <dd className={brand?.brandName ? undefined : 'vitrin-profile-meta__empty'}>
                      {brand?.brandName || 'بدون برند'}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          )}

          {activeTab === 'traceability' && (
            <div className="vitrin-profile-panel">
              <p className="vitrin-profile-panel__empty">
                ردیابی سفارش‌ها/تراکنش‌های این کالا در نبض ثبت می‌شود و ویترین صاحب داده تراکنشی نیست.
                این بخش رزرو شده برای قرارداد آینده نبض (Product → Order → Customer/Supplier → Brand)
                است و در حال حاضر هیچ داده تراکنشی در ویترین کپی نمی‌شود.
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
