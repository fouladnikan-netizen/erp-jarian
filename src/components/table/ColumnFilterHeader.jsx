import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ListFilter, Search } from 'lucide-react';
import './column-filter.css';

export function isColumnFilterActive(selected) {
  return Array.isArray(selected) && selected.length > 0;
}

/**
 * Excel-style column filter (Nabz reference UX) — shared across module lists.
 */
export default function ColumnFilterHeader({
  label,
  columnKey,
  options = [],
  selected = null,
  onApply,
  openKey,
  setOpenKey,
  numeric = false,
}) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const isOpen = openKey === columnKey;
  const hasFilter = isColumnFilterActive(selected);

  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState([]);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 240 });

  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => String(option).toLowerCase().includes(q));
  }, [options, query]);

  const allVisibleSelected = visibleOptions.length > 0
    && visibleOptions.every((option) => draft.includes(option));
  const someVisibleSelected = visibleOptions.some((option) => draft.includes(option));

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = 248;
    const padding = 8;
    let left = rect.right - width;
    left = Math.max(padding, Math.min(left, window.innerWidth - width - padding));
    let top = rect.bottom + 6;
    const estimatedHeight = 320;
    if (top + estimatedHeight > window.innerHeight - padding) {
      top = Math.max(padding, rect.top - estimatedHeight - 6);
    }
    setCoords({ top, left, width });
  };

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    setQuery('');
    setDraft(isColumnFilterActive(selected) ? [...selected] : [...options]);
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onDoc = (event) => {
      const target = event.target;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpenKey(null);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpenKey(null);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, setOpenKey]);

  const toggleOption = (option) => {
    setDraft((prev) => (
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    ));
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setDraft((prev) => prev.filter((item) => !visibleOptions.includes(item)));
      return;
    }
    setDraft((prev) => Array.from(new Set([...prev, ...visibleOptions])));
  };

  const handleApply = () => {
    const next = draft.length === 0 || draft.length === options.length
      ? null
      : draft;
    onApply(next);
    setOpenKey(null);
  };

  const handleClear = () => {
    onApply(null);
    setOpenKey(null);
  };

  return (
    <div className="jarian-col-filter">
      <span className="jarian-col-filter__label font-meem">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className={`jarian-col-filter__trigger${hasFilter ? ' is-active' : ''}${isOpen ? ' is-open' : ''}`}
        aria-label={`فیلتر ${label}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.stopPropagation();
          setOpenKey(isOpen ? null : columnKey);
        }}
      >
        <ListFilter size={12} strokeWidth={2.4} aria-hidden="true" />
      </button>

      {isOpen && createPortal(
        <div
          ref={panelRef}
          className="jarian-excel-filter"
          role="dialog"
          aria-label={`فیلتر ستون ${label}`}
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="jarian-excel-filter__search">
            <Search size={14} strokeWidth={2} aria-hidden="true" />
            <input
              type="search"
              className="jarian-excel-filter__search-input font-meem"
              placeholder="جستجو..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
            />
          </div>

          <label className="jarian-excel-filter__master font-meem">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
              }}
              onChange={toggleAllVisible}
            />
            <span>انتخاب همه</span>
          </label>

          <div className="jarian-excel-filter__list">
            {visibleOptions.length === 0 ? (
              <p className="jarian-excel-filter__empty font-meem">موردی یافت نشد</p>
            ) : (
              visibleOptions.map((option) => (
                <label key={String(option)} className="jarian-excel-filter__option font-meem">
                  <input
                    type="checkbox"
                    checked={draft.includes(option)}
                    onChange={() => toggleOption(option)}
                  />
                  <span className={numeric ? 'font-yekan' : 'font-meem'}>{option}</span>
                </label>
              ))
            )}
          </div>

          <div className="jarian-excel-filter__footer">
            <button type="button" className="jarian-excel-filter__clear font-meem" onClick={handleClear}>
              پاک کردن
            </button>
            <button type="button" className="jarian-excel-filter__apply font-meem" onClick={handleApply}>
              اعمال
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
