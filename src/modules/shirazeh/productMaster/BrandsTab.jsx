import { useEffect, useState } from 'react';
import { Plus, Power } from 'lucide-react';
import { useBrandsStore } from '../../../stores/useBrandsStore';

/**
 * Brand Registry (Shirazeh, DDL-24d). Not part of Product SKU identity.
 * Duplicate detection (exact block, probable warn) is backend-authoritative
 * — this UI only surfaces the warning and lets the user explicitly confirm.
 */
export default function BrandsTab({ canManage }) {
  const brands = useBrandsStore((s) => s.brands);
  const fetchAll = useBrandsStore((s) => s.fetchAll);
  const createBrand = useBrandsStore((s) => s.createBrand);
  const updateBrand = useBrandsStore((s) => s.updateBrand);

  const [brandName, setBrandName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [probableWarning, setProbableWarning] = useState(null);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  async function submitCreate(confirmDuplicate = false) {
    setBusy(true);
    setFormError('');
    try {
      await createBrand({ brandName: brandName.trim(), legalName: legalName.trim() || undefined, confirmDuplicate });
      setBrandName(''); setLegalName(''); setProbableWarning(null);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.error === 'BRAND_PROBABLE_DUPLICATE') {
        setProbableWarning(data.details?.probable || []);
      } else {
        setFormError(data?.message || err?.message || 'ثبت برند ناموفق بود.');
      }
    } finally {
      setBusy(false);
    }
  }

  const handleCreate = (e) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    setProbableWarning(null);
    void submitCreate(false);
  };

  const toggleActive = async (brand) => {
    setBusy(true);
    try {
      await updateBrand(brand.id, { isActive: !brand.isActive });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shirazeh-pm__col" style={{ maxWidth: 640 }}>
      <h3 className="shirazeh-pm__col-title">برندها</h3>
      {canManage && (
        <form className="shirazeh-pm__create" onSubmit={handleCreate}>
          <input className="shirazeh-pm__input" placeholder="نام برند (مثلاً: فولاد مبارکه)" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          <input className="shirazeh-pm__input" placeholder="نام حقوقی (اختیاری)" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy}>
            <Plus size={14} /> افزودن
          </button>
        </form>
      )}
      {formError && <div className="shirazeh-pm__form-error">{formError}</div>}
      {probableWarning && (
        <div className="shirazeh-pm__form-warning">
          برندهای مشابهی یافت شد: {probableWarning.map((p) => p.brandName).join('، ')}.
          {' '}
          <button
            type="button"
            className="shirazeh-pm__btn shirazeh-pm__btn--ghost"
            style={{ marginRight: 6 }}
            onClick={() => submitCreate(true)}
            disabled={busy}
          >
            با این حال، متمایز است — ثبت شود
          </button>
        </div>
      )}
      <div className="shirazeh-pm__list">
        {brands.length === 0 && <div className="shirazeh-pm__empty">برندی ثبت نشده است.</div>}
        {brands.map((b) => (
          <div key={b.id} className={`shirazeh-pm__item ${!b.isActive ? 'shirazeh-pm__item--inactive' : ''}`}>
            <span className="shirazeh-pm__item-name">
              {b.brandName}
              {b.legalName ? <span style={{ opacity: 0.6 }}> — {b.legalName}</span> : null}
            </span>
            {canManage && (
              <div className="shirazeh-pm__item-actions">
                <button
                  type="button"
                  className="shirazeh-pm__icon-btn"
                  disabled={busy}
                  onClick={() => toggleActive(b)}
                  aria-label={b.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                >
                  <Power size={13} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
