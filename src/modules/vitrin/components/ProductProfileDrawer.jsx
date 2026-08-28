import { useEffect, useMemo, useState } from 'react';

const RELATIONSHIP_LABELS = {
  ALTERNATIVE: 'جایگزین تجاری',
  SUBSTITUTE: 'قابل‌جایگزینی',
  SUBSTITUTE_WITH_CONVERSION: 'جایگزینی با ضریب تبدیل',
};

function buildTabs() {
  return [
    { id: 'specs', label: 'مشخصات ساختاری' },
    { id: 'relationships', label: 'روابط کالا' },
    { id: 'traceability', label: 'ردیابی (آینده)' },
  ];
}

/**
 * Product profile — structured attribute values only, no free-text specs
 * blob. Relationships are explicit/human-reviewed (DDL-24f). The
 * "traceability" tab is a labeled placeholder, not a copied order history —
 * see Docs/architecture/product-master-nabz-future-contract.md.
 */
export default function ProductProfileDrawer({
  product,
  brands,
  uoms,
  products,
  onClose,
  onToggleActive,
  canManageRelationships = false,
  listRelationships,
  createRelationship,
  deactivateRelationship,
}) {
  const tabs = useMemo(() => buildTabs(), []);
  const [activeTab, setActiveTab] = useState('specs');
  const [relationships, setRelationships] = useState([]);
  const [relTargetId, setRelTargetId] = useState('');
  const [relType, setRelType] = useState('ALTERNATIVE');
  const [relNumerator, setRelNumerator] = useState('1');
  const [relDenominator, setRelDenominator] = useState('1');
  const [relError, setRelError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setActiveTab('specs');
    void listRelationships(product.id).then(setRelationships);
  }, [product.id, listRelationships]);

  const brand = brands.find((b) => b.id === product.brandId);
  const baseUom = uoms.find((u) => u.id === product.baseUomId);
  const salesUom = uoms.find((u) => u.id === product.salesUomId);
  const purchaseUom = uoms.find((u) => u.id === product.purchaseUomId);
  const isActive = product.lifecycleStatus !== 'INACTIVE';

  const otherProducts = products.filter((p) => p.id !== product.id);

  const handleCreateRelationship = async (e) => {
    e.preventDefault();
    setRelError('');
    if (!relTargetId) return;
    setBusy(true);
    try {
      await createRelationship({
        sourceProductId: product.id,
        targetProductId: relTargetId,
        relationshipType: relType,
        conversionNumerator: relType === 'SUBSTITUTE_WITH_CONVERSION' ? Number(relNumerator) : undefined,
        conversionDenominator: relType === 'SUBSTITUTE_WITH_CONVERSION' ? Number(relDenominator) : undefined,
      });
      setRelationships(await listRelationships(product.id));
      setRelTargetId('');
    } catch (err) {
      setRelError(err?.response?.data?.message || err?.message || 'ثبت رابطه ناموفق بود.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeactivateRelationship = async (id) => {
    setBusy(true);
    try {
      await deactivateRelationship(id);
      setRelationships(await listRelationships(product.id));
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
          <div>
            <h2 className="vitrin-drawer__title">{product.displayNameOverride || product.generatedName}</h2>
            <p className="vitrin-drawer__subtitle" dir="ltr" style={{ textAlign: 'right' }}>
              SKU {product.sku}
              {' · '}
              {product.groupName} / {product.categoryName} / {product.productTypeName}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {typeof onToggleActive === 'function' && (
              <button type="button" className="btn btn--outline" onClick={() => onToggleActive(product)}>
                {isActive ? 'غیرفعال کردن' : 'فعال کردن'}
              </button>
            )}
            <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
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
              <div className="vitrin-form__field">
                <span className="vitrin-form__label">برند</span>
                <p>{brand?.brandName || '— بدون برند —'}</p>
              </div>
              <div className="vitrin-form__field">
                <span className="vitrin-form__label">واحدها</span>
                <p>
                  پایه: {baseUom?.nameFa || '—'}
                  {salesUom ? ` · فروش: ${salesUom.nameFa}` : ''}
                  {purchaseUom ? ` · خرید: ${purchaseUom.nameFa}` : ''}
                </p>
              </div>
              <div className="vitrin-form__field">
                <span className="vitrin-form__label">روش محاسبه وزن</span>
                <p>{product.weightProfileType}</p>
              </div>
              <div className="vitrin-form__field">
                <span className="vitrin-form__label">ویژگی‌های ساختاری</span>
                {(product.attributeValues || []).length ? (
                  <table className="jarian-table">
                    <thead><tr><th>ویژگی</th><th>مقدار</th></tr></thead>
                    <tbody>
                      {product.attributeValues.map((v) => (
                        <tr key={v.id}>
                          <td>{v.attributeNameFa}</td>
                          <td>{v.dataType === 'BOOLEAN' ? (v.valueBoolean ? 'بله' : 'خیر') : (v.valueNumber ?? v.valueText)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="vitrin-profile-panel__empty">ویژگی ساختاری ثبت‌شده‌ای ندارد.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'relationships' && (
            <div className="vitrin-profile-panel">
              {canManageRelationships && (
              <form className="vitrin-form__grid" onSubmit={handleCreateRelationship} style={{ marginBottom: 12 }}>
                <label className="vitrin-form__field">
                  <span className="vitrin-form__label">کالای مقابل</span>
                  <select value={relTargetId} onChange={(e) => setRelTargetId(e.target.value)}>
                    <option value="">— انتخاب کنید —</option>
                    {otherProducts.map((p) => <option key={p.id} value={p.id}>{p.displayNameOverride || p.generatedName}</option>)}
                  </select>
                </label>
                <label className="vitrin-form__field">
                  <span className="vitrin-form__label">نوع رابطه</span>
                  <select value={relType} onChange={(e) => setRelType(e.target.value)}>
                    {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                {relType === 'SUBSTITUTE_WITH_CONVERSION' && (
                  <>
                    <label className="vitrin-form__field">
                      <span className="vitrin-form__label">صورت ضریب</span>
                      <input type="number" step="any" dir="ltr" value={relNumerator} onChange={(e) => setRelNumerator(e.target.value)} />
                    </label>
                    <label className="vitrin-form__field">
                      <span className="vitrin-form__label">مخرج ضریب</span>
                      <input type="number" step="any" dir="ltr" value={relDenominator} onChange={(e) => setRelDenominator(e.target.value)} />
                    </label>
                  </>
                )}
                <button type="submit" className="btn btn--outline" disabled={busy || !relTargetId} style={{ alignSelf: 'end' }}>
                  ثبت رابطه
                </button>
              </form>
              )}
              {relError && <p className="vitrin-form__error">{relError}</p>}

              {relationships.length ? (
                <table className="jarian-table">
                  <thead><tr><th>کالای مقابل</th><th>نوع رابطه</th><th>وضعیت</th><th></th></tr></thead>
                  <tbody>
                    {relationships.map((r) => {
                      const other = products.find((p) => p.id === (r.targetProductId === product.id ? r.sourceProductId : r.targetProductId));
                      return (
                        <tr key={r.id}>
                          <td>{other?.displayNameOverride || other?.generatedName || '—'}</td>
                          <td>{RELATIONSHIP_LABELS[r.relationshipType] || r.relationshipType}</td>
                          <td>{r.isActive !== false ? 'فعال' : 'غیرفعال'}</td>
                          <td>
                            {r.isActive !== false && canManageRelationships && (
                              <button type="button" className="btn btn--ghost" onClick={() => handleDeactivateRelationship(r.id)} disabled={busy}>
                                غیرفعال کردن
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="vitrin-profile-panel__empty">رابطه‌ای برای این کالا ثبت نشده است.</p>
              )}
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
