import { useEffect, useRef, useState } from 'react';
import { TABLE_COLUMNS, getViewKey } from '../columns';

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

export default function KanoonFiltersPopover({
  entityType,
  personType,
  columnFilters,
  onColumnFiltersChange,
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const viewKey = getViewKey(entityType, personType);
  const columns = TABLE_COLUMNS[viewKey].filter((c) => c.filterable);

  const activeCount = Object.values(columnFilters).filter(Boolean).length;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const updateFilter = (key, value) => {
    onColumnFiltersChange({ ...columnFilters, [key]: value });
  };

  const clearFilters = () => onColumnFiltersChange({});

  return (
    <div className="kanoon-filters" ref={popoverRef}>
      <button
        type="button"
        className={`btn btn--outline kanoon-filters__trigger${activeCount ? ' has-active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <FilterIcon />
        فیلترها
        {activeCount > 0 && (
          <span className="kanoon-filters__badge">{activeCount.toLocaleString('fa-IR')}</span>
        )}
      </button>

      {open && (
        <div className="kanoon-filters__popover" role="dialog" aria-label="فیلتر ستون‌ها">
          <div className="kanoon-filters__popover-header">
            <span>فیلتر ستون‌ها</span>
            {activeCount > 0 && (
              <button type="button" className="kanoon-filters__clear" onClick={clearFilters}>
                پاک کردن
              </button>
            )}
          </div>
          <div className="kanoon-filters__fields">
            {columns.map((col) => (
              <label key={col.key} className="kanoon-filters__field">
                <span>{col.label}</span>
                <input
                  type="text"
                  value={columnFilters[col.key] || ''}
                  onChange={(e) => updateFilter(col.key, e.target.value)}
                  placeholder={`فیلتر ${col.label}...`}
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
