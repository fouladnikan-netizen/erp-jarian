import VitrinFiltersPopover from './VitrinFiltersPopover';

function SearchIcon() {
  return (
    <svg className="actions-bar__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default function VitrinToolbar({
  search,
  onSearchChange,
  groups,
  filterGroupId,
  onFilterGroupChange,
  activeGroupId,
  subgroupId,
  onSubgroupChange,
  onAddGroup,
  onAddProduct,
}) {
  return (
    <section className="section-actions vitrin-toolbar" aria-label="عملیات">
      <div className="actions-bar vitrin-toolbar__bar">
        <div className="actions-bar__search vitrin-toolbar__search">
          <input
            type="search"
            placeholder="جستجو در نام کالا، کد یا گروه..."
            aria-label="جستجو"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <SearchIcon />
        </div>

        <VitrinFiltersPopover
          groups={groups}
          filterGroupId={filterGroupId}
          onFilterGroupChange={onFilterGroupChange}
          activeGroupId={activeGroupId}
          subgroupId={subgroupId}
          onSubgroupChange={onSubgroupChange}
        />

        <div className="actions-bar__buttons vitrin-toolbar__buttons">
          <button type="button" className="btn btn--outline-danger" onClick={onAddGroup}>
            ثبت گروه کالا
          </button>
          <button type="button" className="btn btn--primary" onClick={onAddProduct}>
            ثبت محصول جدید
          </button>
        </div>
      </div>
    </section>
  );
}
