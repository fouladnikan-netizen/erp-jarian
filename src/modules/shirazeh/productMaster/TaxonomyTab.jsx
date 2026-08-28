import { useEffect, useMemo, useState } from 'react';
import { Plus, Power } from 'lucide-react';
import { useProductTaxonomyStore } from '../../../stores/useProductTaxonomyStore';

/**
 * Group -> Category -> Product Type master-detail navigation (Shirazeh,
 * DDL-24, DDL-24b). Codes (GG/CC/TT) are backend-allocated atomic counters —
 * never editable here.
 */
export default function TaxonomyTab({ canManage, onSelectType }) {
  const groups = useProductTaxonomyStore((s) => s.groups);
  const categories = useProductTaxonomyStore((s) => s.categories);
  const types = useProductTaxonomyStore((s) => s.types);
  const fetchAll = useProductTaxonomyStore((s) => s.fetchAll);
  const createGroup = useProductTaxonomyStore((s) => s.createGroup);
  const updateGroup = useProductTaxonomyStore((s) => s.updateGroup);
  const createCategory = useProductTaxonomyStore((s) => s.createCategory);
  const updateCategory = useProductTaxonomyStore((s) => s.updateCategory);
  const createType = useProductTaxonomyStore((s) => s.createType);
  const updateType = useProductTaxonomyStore((s) => s.updateType);

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.groupId === selectedGroupId),
    [categories, selectedGroupId],
  );
  const visibleTypes = useMemo(
    () => types.filter((t) => t.categoryId === selectedCategoryId),
    [types, selectedCategoryId],
  );

  useEffect(() => {
    if (selectedTypeId) onSelectType?.(selectedTypeId);
  }, [selectedTypeId, onSelectType]);

  async function handleCreateGroup(e) {
    e.preventDefault();
    setFormError('');
    if (!newGroupName.trim()) return;
    setBusy(true);
    try {
      await createGroup({ name: newGroupName.trim() });
      setNewGroupName('');
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'ثبت گروه ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCategory(e) {
    e.preventDefault();
    setFormError('');
    if (!newCategoryName.trim() || !selectedGroupId) return;
    setBusy(true);
    try {
      await createCategory({ groupId: selectedGroupId, name: newCategoryName.trim() });
      setNewCategoryName('');
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'ثبت دسته ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateType(e) {
    e.preventDefault();
    setFormError('');
    if (!newTypeName.trim() || !selectedCategoryId) return;
    setBusy(true);
    try {
      await createType({ categoryId: selectedCategoryId, name: newTypeName.trim() });
      setNewTypeName('');
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'ثبت نوع کالا ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  const toggleActive = async (kind, item) => {
    setBusy(true);
    try {
      if (kind === 'group') await updateGroup(item.id, { isActive: !item.isActive });
      if (kind === 'category') await updateCategory(item.id, { isActive: !item.isActive });
      if (kind === 'type') await updateType(item.id, { isActive: !item.isActive });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shirazeh-pm__body">
      {formError && <div className="shirazeh-pm__alert" style={{ width: '100%' }}>{formError}</div>}

      <div className="shirazeh-pm__col">
        <h3 className="shirazeh-pm__col-title">گروه‌های کالا</h3>
        {canManage && (
          <form className="shirazeh-pm__create" onSubmit={handleCreateGroup}>
            <input
              className="shirazeh-pm__input"
              placeholder="نام گروه (مثلاً: آهن‌آلات)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy}>
              <Plus size={14} /> افزودن
            </button>
          </form>
        )}
        <div className="shirazeh-pm__list">
          {groups.length === 0 && <div className="shirazeh-pm__empty">گروهی ثبت نشده است.</div>}
          {groups.map((g) => (
            <div
              key={g.id}
              className={`shirazeh-pm__item ${selectedGroupId === g.id ? 'shirazeh-pm__item--selected' : ''} ${!g.isActive ? 'shirazeh-pm__item--inactive' : ''}`}
              onClick={() => { setSelectedGroupId(g.id); setSelectedCategoryId(null); setSelectedTypeId(null); }}
            >
              <span className="shirazeh-pm__code">{g.code}</span>
              <span className="shirazeh-pm__item-name">{g.name}</span>
              {canManage && (
                <div className="shirazeh-pm__item-actions">
                  <button
                    type="button"
                    className="shirazeh-pm__icon-btn"
                    disabled={busy}
                    onClick={(e) => { e.stopPropagation(); toggleActive('group', g); }}
                    aria-label={g.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                  >
                    <Power size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="shirazeh-pm__col">
        <h3 className="shirazeh-pm__col-title">دسته‌های کالا {selectedGroupId ? '' : '(ابتدا گروه را انتخاب کنید)'}</h3>
        {canManage && selectedGroupId && (
          <form className="shirazeh-pm__create" onSubmit={handleCreateCategory}>
            <input
              className="shirazeh-pm__input"
              placeholder="نام دسته (مثلاً: ورق گرم)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy}>
              <Plus size={14} /> افزودن
            </button>
          </form>
        )}
        <div className="shirazeh-pm__list">
          {selectedGroupId && visibleCategories.length === 0 && <div className="shirazeh-pm__empty">دسته‌ای ثبت نشده است.</div>}
          {visibleCategories.map((c) => (
            <div
              key={c.id}
              className={`shirazeh-pm__item ${selectedCategoryId === c.id ? 'shirazeh-pm__item--selected' : ''} ${!c.isActive ? 'shirazeh-pm__item--inactive' : ''}`}
              onClick={() => { setSelectedCategoryId(c.id); setSelectedTypeId(null); }}
            >
              <span className="shirazeh-pm__code">{c.code}</span>
              <span className="shirazeh-pm__item-name">{c.name}</span>
              {canManage && (
                <div className="shirazeh-pm__item-actions">
                  <button
                    type="button"
                    className="shirazeh-pm__icon-btn"
                    disabled={busy}
                    onClick={(e) => { e.stopPropagation(); toggleActive('category', c); }}
                    aria-label={c.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                  >
                    <Power size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="shirazeh-pm__col">
        <h3 className="shirazeh-pm__col-title">انواع کالا {selectedCategoryId ? '' : '(ابتدا دسته را انتخاب کنید)'}</h3>
        {canManage && selectedCategoryId && (
          <form className="shirazeh-pm__create" onSubmit={handleCreateType}>
            <input
              className="shirazeh-pm__input"
              placeholder="نام نوع کالا (مثلاً: ورق سیاه)"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
            />
            <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy}>
              <Plus size={14} /> افزودن
            </button>
          </form>
        )}
        <div className="shirazeh-pm__list">
          {selectedCategoryId && visibleTypes.length === 0 && <div className="shirazeh-pm__empty">نوع کالایی ثبت نشده است.</div>}
          {visibleTypes.map((t) => (
            <div
              key={t.id}
              className={`shirazeh-pm__item ${selectedTypeId === t.id ? 'shirazeh-pm__item--selected' : ''} ${!t.isActive ? 'shirazeh-pm__item--inactive' : ''}`}
              onClick={() => setSelectedTypeId(t.id)}
            >
              <span className="shirazeh-pm__code">{t.code}</span>
              <span className="shirazeh-pm__item-name">{t.name}</span>
              {canManage && (
                <div className="shirazeh-pm__item-actions">
                  <button
                    type="button"
                    className="shirazeh-pm__icon-btn"
                    disabled={busy}
                    onClick={(e) => { e.stopPropagation(); toggleActive('type', t); }}
                    aria-label={t.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                  >
                    <Power size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {selectedTypeId && (
          <p className="shirazeh-pm__subtitle">
            برای تعریف شمای ویژگی این نوع کالا، به تب «ویژگی‌ها و شما» بروید.
          </p>
        )}
      </div>
    </div>
  );
}
