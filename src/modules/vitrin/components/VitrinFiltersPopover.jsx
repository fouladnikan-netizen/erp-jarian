import { useEffect, useRef, useState } from 'react';

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

/**
 * Structured Product Master filters (product contract "PRODUCT SEARCH") —
 * Group / Category / Product Type / Brand / lifecycle, never free-text LIKE.
 */
export default function VitrinFiltersPopover({
  groups,
  categories,
  types,
  brands,
  filterGroupId,
  onFilterGroupChange,
  filterCategoryId,
  onFilterCategoryChange,
  filterTypeId,
  onFilterTypeChange,
  filterBrandId,
  onFilterBrandChange,
  includeInactive,
  onIncludeInactiveChange,
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const activeCount = [filterGroupId, filterCategoryId, filterTypeId, filterBrandId].filter(Boolean).length
    + (includeInactive ? 1 : 0);

  const categoryOptions = categories.filter((c) => !filterGroupId || c.groupId === filterGroupId);
  const typeOptions = types.filter((t) => !filterCategoryId || t.categoryId === filterCategoryId);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const clearAll = () => {
    onFilterGroupChange(null);
    onFilterCategoryChange(null);
    onFilterTypeChange(null);
    onFilterBrandChange(null);
    onIncludeInactiveChange(false);
  };

  return (
    <div className="vitrin-filters" ref={popoverRef}>
      <button
        type="button"
        className={`btn btn--outline vitrin-filters__trigger${activeCount ? ' has-active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <FilterIcon />
        فیلترها
        {activeCount > 0 && <span className="vitrin-filters__badge">{activeCount.toLocaleString('fa-IR')}</span>}
      </button>

      {open && (
        <div className="vitrin-filters__popover" role="dialog" aria-label="فیلتر کالاها">
          <div className="vitrin-filters__popover-header">
            <span>فیلتر کالاها</span>
            {activeCount > 0 && (
              <button type="button" className="vitrin-filters__clear" onClick={clearAll}>
                پاک کردن
              </button>
            )}
          </div>
          <label className="vitrin-filters__field">
            <span>گروه کالا</span>
            <select
              value={filterGroupId || ''}
              onChange={(e) => { onFilterGroupChange(e.target.value || null); onFilterCategoryChange(null); onFilterTypeChange(null); }}
            >
              <option value="">همه گروه‌ها</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          <label className="vitrin-filters__field">
            <span>دسته کالا</span>
            <select
              value={filterCategoryId || ''}
              onChange={(e) => { onFilterCategoryChange(e.target.value || null); onFilterTypeChange(null); }}
            >
              <option value="">همه دسته‌ها</option>
              {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="vitrin-filters__field">
            <span>نوع کالا</span>
            <select value={filterTypeId || ''} onChange={(e) => onFilterTypeChange(e.target.value || null)}>
              <option value="">همه انواع</option>
              {typeOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="vitrin-filters__field">
            <span>برند</span>
            <select value={filterBrandId || ''} onChange={(e) => onFilterBrandChange(e.target.value || null)}>
              <option value="">همه برندها</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.brandName}</option>)}
            </select>
          </label>
          <label className="vitrin-filters__field vitrin-filters__field--checkbox">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => onIncludeInactiveChange(e.target.checked)}
            />
            <span>نمایش کالاهای غیرفعال</span>
          </label>
        </div>
      )}
    </div>
  );
}
