import { ENTITY_TYPES, PERSON_TYPES } from '../config';
import KanoonFiltersPopover from './KanoonFiltersPopover';

function SearchIcon() {
  return (
    <svg className="actions-bar__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default function KanoonToolbar({
  entityTab,
  personType,
  search,
  columnFilters,
  onEntityTabChange,
  onPersonTypeChange,
  onSearchChange,
  onColumnFiltersChange,
  onCreateClick,
}) {
  return (
    <section className="section-actions kanoon-toolbar" aria-label="عملیات">
      <div className="kanoon-toolbar__tabs">
        <div className="kanoon-tabs" role="tablist" aria-label="نوع مخاطب">
          <button
            type="button"
            role="tab"
            aria-selected={entityTab === ENTITY_TYPES.CUSTOMER}
            className={`kanoon-tabs__btn${entityTab === ENTITY_TYPES.CUSTOMER ? ' is-active' : ''}`}
            onClick={() => onEntityTabChange(ENTITY_TYPES.CUSTOMER)}
          >
            مشتریان
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={entityTab === ENTITY_TYPES.SUPPLIER}
            className={`kanoon-tabs__btn${entityTab === ENTITY_TYPES.SUPPLIER ? ' is-active' : ''}`}
            onClick={() => onEntityTabChange(ENTITY_TYPES.SUPPLIER)}
          >
            تامین‌کنندگان
          </button>
        </div>
      </div>

      <div className="actions-bar kanoon-toolbar__actions">
        <div className="actions-bar__search">
          <input
            type="search"
            placeholder="جستجو در مخاطبین..."
            aria-label="جستجو"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <SearchIcon />
        </div>

        <KanoonFiltersPopover
          entityType={entityTab}
          personType={personType}
          columnFilters={columnFilters}
          onColumnFiltersChange={onColumnFiltersChange}
        />

        <div className="kanoon-toggle" role="group" aria-label="نوع شخصیت">
          <button
            type="button"
            className={`kanoon-toggle__btn${personType === PERSON_TYPES.LEGAL ? ' is-active' : ''}`}
            onClick={() => onPersonTypeChange(PERSON_TYPES.LEGAL)}
          >
            حقوقی
          </button>
          <button
            type="button"
            className={`kanoon-toggle__btn${personType === PERSON_TYPES.NATURAL ? ' is-active' : ''}`}
            onClick={() => onPersonTypeChange(PERSON_TYPES.NATURAL)}
          >
            حقیقی
          </button>
        </div>

        <div className="actions-bar__buttons">
          <button type="button" className="btn btn--primary" onClick={onCreateClick}>
            ثبت مخاطب جدید
          </button>
        </div>
      </div>
    </section>
  );
}
