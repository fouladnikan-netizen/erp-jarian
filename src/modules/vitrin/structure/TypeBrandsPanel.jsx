import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function TypeBrandsPanel({
  type,
  brands,
  canManage,
  onSave,
  busy,
}) {
  const linkedIds = type?.allowedBrandIds || [];
  const [addId, setAddId] = useState('');

  useEffect(() => {
    setAddId('');
  }, [type?.id]);

  if (!type) return null;

  const linked = linkedIds
    .map((id) => brands.find((brand) => brand.id === id))
    .filter(Boolean);
  const available = brands.filter((brand) => brand.isActive !== false && !linkedIds.includes(brand.id));

  const persist = (allowedBrandIds) => onSave({ allowedBrandIds });

  const handleAdd = (event) => {
    event.preventDefault();
    if (!addId) return;
    void persist([...linkedIds, addId]);
    setAddId('');
  };

  return (
    <div className="vitrin-structure__bind-list">
      {linked.length === 0 && (
        <p className="vitrin-structure__skip">
          برند برای این نوع اختیاری است. خالی یعنی محدودیتی نیست و موقع ساخت کالا همهٔ برندها قابل انتخاب‌اند.
        </p>
      )}
      {linked.map((brand) => (
        <div key={brand.id} className="shirazeh-pm__item">
          <span className="shirazeh-pm__item-name">
            {brand.brandName}
          </span>
          {canManage && (
            <button
              type="button"
              className="shirazeh-pm__icon-btn shirazeh-pm__icon-btn--danger"
              disabled={busy}
              onClick={() => { void persist(linkedIds.filter((id) => id !== brand.id)); }}
              aria-label={`حذف اتصال ${brand.brandName}`}
              title="حذف اتصال"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}
      {canManage && available.length > 0 && (
        <form className="shirazeh-pm__create" onSubmit={handleAdd}>
          <select
            className="shirazeh-pm__select"
            value={addId}
            onChange={(event) => setAddId(event.target.value)}
            aria-label="افزودن برند"
          >
            <option value="">— انتخاب از بانک برندها —</option>
            {available.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.brandName}</option>
            ))}
          </select>
          <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy || !addId}>
            <Plus size={14} /> افزودن برند
          </button>
        </form>
      )}
    </div>
  );
}
