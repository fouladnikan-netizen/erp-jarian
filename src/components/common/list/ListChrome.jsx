import { useEffect, useRef, useState } from 'react';
import { Columns3, MoreVertical, RotateCcw } from 'lucide-react';
import ColumnManager from './ColumnManager';
import './list-infra.css';

/**
 * Shared list chrome — More (⋮) menu on the list header.
 * Advanced: column management + reset list preferences (widths, filters, …).
 */
export default function ListChrome({
  columns,
  setColumnVisible,
  reorderColumns,
  resetColumns,
  onResetPreferences,
  className = '',
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const openColumns = () => {
    setMenuOpen(false);
    setColumnsOpen(true);
  };

  const resetPrefs = () => {
    setMenuOpen(false);
    onResetPreferences?.();
  };

  return (
    <div
      ref={rootRef}
      className={`jarian-list-chrome${className ? ` ${className}` : ''}`}
      dir="rtl"
    >
      <button
        type="button"
        className={`jarian-list-chrome__more${menuOpen ? ' is-open' : ''}`}
        aria-label="گزینه‌های فهرست"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <MoreVertical size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {menuOpen ? (
        <div className="jarian-list-more-menu kprofile-glass" role="menu" aria-label="منوی فهرست">
          <button
            type="button"
            className="jarian-list-more-menu__item font-meem"
            role="menuitem"
            onClick={openColumns}
          >
            <Columns3 size={16} strokeWidth={1.75} aria-hidden="true" />
            <span className="jarian-list-more-menu__text">
              <span className="jarian-list-more-menu__label">مدیریت ستون‌ها</span>
              <span className="jarian-list-more-menu__hint">نمایش / مخفی · ترتیب ستون‌ها</span>
            </span>
          </button>

          {onResetPreferences ? (
            <button
              type="button"
              className="jarian-list-more-menu__item font-meem"
              role="menuitem"
              onClick={resetPrefs}
            >
              <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
              <span className="jarian-list-more-menu__text">
                <span className="jarian-list-more-menu__label">بازنشانی تنظیمات فهرست</span>
                <span className="jarian-list-more-menu__hint">عرض ستون‌ها · فیلترها · ترتیب و نمایش</span>
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      <ColumnManager
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        columns={columns}
        setColumnVisible={setColumnVisible}
        reorderColumns={reorderColumns}
        resetColumns={resetColumns}
      />
    </div>
  );
}
