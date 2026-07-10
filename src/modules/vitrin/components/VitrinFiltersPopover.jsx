import { useEffect, useRef, useState } from 'react';

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

export default function VitrinFiltersPopover({
  groups,
  filterGroupId,
  onFilterGroupChange,
  activeGroupId,
  subgroupId,
  onSubgroupChange,
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const activeCount = (filterGroupId ? 1 : 0) + (subgroupId ? 1 : 0);
  const activeGroup = groups.find((g) => g.id === activeGroupId);

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

  const clearAll = () => {
    onFilterGroupChange(null);
    onSubgroupChange(null);
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
        {activeCount > 0 && (
          <span className="vitrin-filters__badge">{activeCount.toLocaleString('fa-IR')}</span>
        )}
      </button>

      {open && (
        <div className="vitrin-filters__popover" role="dialog" aria-label="فیلتر محصولات">
          <div className="vitrin-filters__popover-header">
            <span>فیلتر محصولات</span>
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
              onChange={(e) => onFilterGroupChange(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">همه گروه‌ها</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>
          {activeGroup && (
            <label className="vitrin-filters__field">
              <span>زیرگروه کالا</span>
              <select
                value={subgroupId || ''}
                onChange={(e) => onSubgroupChange(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">همه زیرگروه‌ها</option>
                {activeGroup.subgroups.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
