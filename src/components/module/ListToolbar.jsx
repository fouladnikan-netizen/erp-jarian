import { Search } from 'lucide-react';

/**
 * Block 2 of ListPageLayout — unified toolbar:
 * Row A: search (RTL right) + optional inline filters + primary create (RTL left)
 * Row B (optional): chips / category strip directly under search
 */
export default function ListToolbar({
  searchPlaceholder = 'جستجو...',
  searchValue = '',
  onSearchChange,
  primaryLabel = 'ثبت رکورد جدید',
  onPrimaryClick,
  primaryDisabled = false,
  secondary = null,
  filters = null,
  belowSearch = null,
  className = '',
  searchAriaLabel = 'جستجو',
}) {
  return (
    <section
      className={`section-actions list-toolbar ${className}`.trim()}
      aria-label="نوار عملیات و فیلتر"
    >
      <div className="list-toolbar__row">
        <div className="actions-bar__search list-toolbar__search">
          <input
            type="search"
            className="font-meem"
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
          />
          <Search className="actions-bar__search-icon" size={18} strokeWidth={2} aria-hidden="true" />
        </div>

        {filters != null ? (
          <div className="list-toolbar__filters">
            {filters}
          </div>
        ) : null}

        <div className="list-toolbar__buttons">
          {secondary}
          <button
            type="button"
            className="btn btn--primary font-meem"
            disabled={primaryDisabled}
            onClick={onPrimaryClick}
          >
            {primaryLabel}
          </button>
        </div>
      </div>

      {belowSearch != null ? (
        <div className="list-toolbar__below-search">
          {belowSearch}
        </div>
      ) : null}
    </section>
  );
}
