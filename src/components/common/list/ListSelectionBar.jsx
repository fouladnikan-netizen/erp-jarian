import { formatListSelectionLabel } from './formatListSelectionLabel';
import './list-infra.css';

/**
 * Selection toolbar — visible only when at least one row is selected.
 * Place between list header and table body (not inside permanent header count).
 */
export default function ListSelectionBar({
  selectedCount = 0,
  totalCount = 0,
  onClear,
  children = null,
  className = '',
}) {
  const selected = Number(selectedCount) || 0;
  if (selected <= 0) return null;

  const label = formatListSelectionLabel(selected, totalCount);

  return (
    <div
      className={`jarian-list-selection-bar${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
      dir="rtl"
    >
      <span className="jarian-list-selection-bar__label font-meem">{label}</span>
      <div className="jarian-list-selection-bar__actions">
        {children}
        {onClear ? (
          <button
            type="button"
            className="jarian-list-selection-bar__clear font-meem"
            onClick={onClear}
          >
            لغو انتخاب
          </button>
        ) : null}
      </div>
    </div>
  );
}
