import { useState } from 'react';

function SearchIcon() {
  return (
    <svg className="actions-bar__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default function ActionsBar({ data }) {
  const [activeFilter, setActiveFilter] = useState(data.filters[0]);

  return (
    <section className="section-actions" aria-label="عملیات">
      <div className="section-label">نوار عملیات</div>
      <div className="actions-bar">
        <div className="actions-bar__search">
          <input type="search" placeholder={data.searchPlaceholder} aria-label="جستجو" />
          <SearchIcon />
        </div>
        <div className="actions-bar__filters">
          {data.filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`chip${activeFilter === filter ? ' is-active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="actions-bar__buttons">
          {(data.secondaryActions || []).map((action) => (
            <button key={action} type="button" className="btn btn--outline">
              {action}
            </button>
          ))}
          <button type="button" className="btn btn--primary">
            {data.primaryAction}
          </button>
        </div>
      </div>
    </section>
  );
}
