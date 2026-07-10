import { ORDER_TABS, ORDER_TAB_META, VIEW_MODES } from '../config';

function SearchIcon() {
  return (
    <svg className="actions-bar__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

const TAB_ORDER = [ORDER_TABS.CURRENT, ORDER_TABS.SUCCESS, ORDER_TABS.FAILED];

export default function NabzToolbar({
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onCreateClick,
}) {
  const showViewToggle = activeTab !== ORDER_TABS.FAILED;

  return (
    <section className="section-actions nabz-toolbar" aria-label="عملیات">
      <div className="nabz-toolbar__tabs">
        <div className="nabz-tabs" role="tablist" aria-label="وضعیت سفارشات">
          {TAB_ORDER.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`nabz-tabs__btn${activeTab === tab ? ' is-active' : ''}`}
              onClick={() => onTabChange(tab)}
            >
              {ORDER_TAB_META[tab].label}
            </button>
          ))}
        </div>
      </div>

      <div className="actions-bar nabz-toolbar__bar">
        <div className="actions-bar__search nabz-toolbar__search">
          <input
            type="search"
            placeholder="جستجو در سفارشات..."
            aria-label="جستجو"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <SearchIcon />
        </div>

        {showViewToggle && (
          <div className="nabz-toggle" role="group" aria-label="نمای نمایش">
            <button
              type="button"
              className={`nabz-toggle__btn${viewMode === VIEW_MODES.LIST ? ' is-active' : ''}`}
              onClick={() => onViewModeChange(VIEW_MODES.LIST)}
            >
              نمای فهرست
            </button>
            <button
              type="button"
              className={`nabz-toggle__btn${viewMode === VIEW_MODES.KANBAN ? ' is-active' : ''}`}
              onClick={() => onViewModeChange(VIEW_MODES.KANBAN)}
            >
              نمای کانبان
            </button>
          </div>
        )}

        <div className="actions-bar__buttons">
          <button type="button" className="btn btn--primary" onClick={onCreateClick}>
            ثبت سفارش جدید
          </button>
        </div>
      </div>
    </section>
  );
}
