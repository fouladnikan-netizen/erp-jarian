import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Power, Trash2, X } from 'lucide-react';
import { useBrandsStore } from '../../../stores/useBrandsStore';
import { useJarianNotice } from '../../../context/JarianNoticeContext';
import { suggestLatinName } from '../../../domain/productMaster/suggestLatinName';
import { filterByQuery } from '../../../domain/productMaster/structureSearch';
import ProductMasterAlert, { productMasterErrorMessage } from './ProductMasterAlert';
import useSuggestedLatin from './useSuggestedLatin';

/**
 * Brand Registry (Shirazeh, DDL-24d). Not part of Product SKU identity.
 * Duplicate detection (exact block, probable warn) is backend-authoritative
 * — this UI only surfaces the warning and lets the user explicitly confirm.
 */
export default function BrandsTab({ canManage, filterQuery = '' }) {
  const brands = useBrandsStore((s) => s.brands);
  const fetchAll = useBrandsStore((s) => s.fetchAll);
  const createBrand = useBrandsStore((s) => s.createBrand);
  const updateBrand = useBrandsStore((s) => s.updateBrand);
  const deleteBrand = useBrandsStore((s) => s.deleteBrand);
  const { confirm } = useJarianNotice();

  const [brandName, setBrandName] = useState('');
  const [legalName, setLegalName] = useState('');
  const nameLatin = useSuggestedLatin(brandName, suggestLatinName);
  const [busy, setBusy] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [probableWarning, setProbableWarning] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [editLegalName, setEditLegalName] = useState('');
  const [editNameLatin, setEditNameLatin] = useState('');

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const visibleBrands = filterByQuery(
    brands,
    filterQuery,
    (item) => [item.brandName, item.legalName, item.nameLatin],
  );

  async function submitCreate(confirmDuplicate = false) {
    setBusy(true);
    setAlertMessage('');
    try {
      await createBrand({
        brandName: brandName.trim(),
        legalName: legalName.trim() || undefined,
        nameLatin: nameLatin.value.trim() || undefined,
        confirmDuplicate,
      });
      setBrandName('');
      setLegalName('');
      nameLatin.reset();
      setProbableWarning(null);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.error === 'BRAND_PROBABLE_DUPLICATE') {
        setProbableWarning(data.details?.probable || []);
      } else {
        setAlertMessage(productMasterErrorMessage(err, 'ثبت برند ناموفق بود.'));
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
    setAlertMessage('');
    try {
      await updateBrand(brand.id, { isActive: !brand.isActive });
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'تغییر وضعیت برند ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (brand) => {
    setAlertMessage('');
    setEditingId(brand.id);
    setEditBrandName(brand.brandName || '');
    setEditLegalName(brand.legalName || '');
    setEditNameLatin(brand.nameLatin || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBrandName('');
    setEditLegalName('');
    setEditNameLatin('');
  };

  const handleDelete = async (brand) => {
    const ok = await confirm({
      title: 'حذف',
      entity: brand.brandName,
      message: 'این برند حذف شود؟',
      hint: 'اگر در کالا یا نوع کالا استفاده شده باشد، حذف انجام نمی‌شود.',
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setAlertMessage('');
    try {
      await deleteBrand(brand.id);
      if (editingId === brand.id) cancelEdit();
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'حذف برند ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (brand) => {
    const nextName = editBrandName.trim();
    if (!nextName) {
      setAlertMessage('نام برند را وارد کنید.');
      return;
    }
    setBusy(true);
    setAlertMessage('');
    try {
      await updateBrand(brand.id, {
        brandName: nextName,
        legalName: editLegalName.trim() || null,
        nameLatin: editNameLatin.trim() || null,
      });
      cancelEdit();
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'ویرایش برند ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shirazeh-pm__body">
      <ProductMasterAlert message={alertMessage} onClose={() => setAlertMessage('')} />
      <div className="shirazeh-pm__col">
      <h3 className="shirazeh-pm__col-title">برندها</h3>
      {canManage && (
        <form className="shirazeh-pm__create" onSubmit={handleCreate}>
          <input className="shirazeh-pm__input" placeholder="نام برند (مثلاً: فولاد مبارکه)" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          <input className="shirazeh-pm__input" placeholder="نام حقوقی (اختیاری)" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          <input className="shirazeh-pm__input" dir="ltr" placeholder="نام لاتین (پیشنهاد)" value={nameLatin.value} onChange={(e) => nameLatin.onChange(e.target.value)} />
          <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy}>
            <Plus size={14} /> افزودن
          </button>
        </form>
      )}
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
        {visibleBrands.length === 0 && <div className="shirazeh-pm__empty">برندی ثبت نشده است.</div>}
        {visibleBrands.map((b) => {
          const isEditing = editingId === b.id;
          return (
          <div key={b.id} className={`shirazeh-pm__item ${!b.isActive ? 'shirazeh-pm__item--inactive' : ''}`}>
            {isEditing ? (
              <div className="shirazeh-pm__item-edit">
                <input className="shirazeh-pm__input" value={editBrandName} onChange={(e) => setEditBrandName(e.target.value)} aria-label="نام برند" />
                <input className="shirazeh-pm__input" value={editLegalName} onChange={(e) => setEditLegalName(e.target.value)} placeholder="نام حقوقی" aria-label="نام حقوقی" />
                <input className="shirazeh-pm__input" dir="ltr" value={editNameLatin} onChange={(e) => setEditNameLatin(e.target.value)} placeholder="نام لاتین" aria-label="نام لاتین" />
                <button type="button" className="shirazeh-pm__icon-btn" disabled={busy} onClick={() => { void saveEdit(b); }} aria-label="ذخیره" title="ذخیره">
                  <Check size={13} />
                </button>
                <button type="button" className="shirazeh-pm__icon-btn" disabled={busy} onClick={cancelEdit} aria-label="انصراف" title="انصراف">
                  <X size={13} />
                </button>
              </div>
            ) : (
            <span className="shirazeh-pm__item-name">
              {b.brandName}
              {b.legalName ? <span style={{ opacity: 0.6 }}> — {b.legalName}</span> : null}
            </span>
            )}
            {canManage && !isEditing && (
              <div className="shirazeh-pm__item-actions">
                <button
                  type="button"
                  className="shirazeh-pm__icon-btn"
                  disabled={busy}
                  onClick={() => startEdit(b)}
                  aria-label="ویرایش برند"
                  title="ویرایش"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  className="shirazeh-pm__icon-btn"
                  disabled={busy}
                  onClick={() => toggleActive(b)}
                  aria-label={b.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                  title={b.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                >
                  <Power size={13} />
                </button>
                <button
                  type="button"
                  className="shirazeh-pm__icon-btn shirazeh-pm__icon-btn--danger"
                  disabled={busy}
                  onClick={() => { void handleDelete(b); }}
                  aria-label="حذف برند"
                  title="حذف"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
