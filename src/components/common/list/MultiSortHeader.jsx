import { SORT_DIR } from '../../../hooks/list/useMultiSort';
import './list-infra.css';

/**
 * Shared multi-sort column label with priority badge.
 * Compose with ColumnFilterHeader via `trailing` slot.
 */
export default function MultiSortHeader({
  label,
  columnKey,
  sorts = [],
  onToggleSort,
  sortable = true,
  trailing = null,
  className = '',
}) {
  const index = sorts.findIndex((entry) => entry.key === columnKey);
  const active = index >= 0;
  const dir = active ? sorts[index].dir : null;
  const priority = active ? index + 1 : null;

  const arrow = dir === SORT_DIR.ASC ? '↑' : dir === SORT_DIR.DESC ? '↓' : '';

  if (!sortable) {
    return (
      <div className={`jarian-multi-sort${className ? ` ${className}` : ''}`}>
        <span className="jarian-multi-sort__label font-meem">{label}</span>
        {trailing}
      </div>
    );
  }

  return (
    <div className={`jarian-multi-sort${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className={`jarian-multi-sort__btn font-meem${active ? ' is-active' : ''}`}
        onClick={(event) => onToggleSort?.(columnKey, event)}
        title="مرتب‌سازی — Ctrl/⌘ برای چندستونه"
        aria-label={`مرتب‌سازی ${label}`}
      >
        <span className="jarian-multi-sort__label">{label}</span>
        {active ? (
          <span className="jarian-multi-sort__meta font-yekan" aria-hidden="true">
            <span className="jarian-multi-sort__arrow">{arrow}</span>
            <span className="jarian-multi-sort__priority">({priority})</span>
          </span>
        ) : (
          <span className="jarian-multi-sort__idle" aria-hidden="true">↕</span>
        )}
      </button>
      {trailing}
    </div>
  );
}
