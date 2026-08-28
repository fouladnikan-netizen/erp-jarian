/** Group-level quick filter chips. Taxonomy is administered in Shirazeh — Vitrin only filters by it. */
export default function CategoryChips({ groups, selectedGroupId, onSelectGroup }) {
  return (
    <div className="vitrin-categories">
      <div className="vitrin-categories__row" role="tablist" aria-label="گروه‌های کالا">
        <button
          type="button"
          className={`vitrin-chip${!selectedGroupId ? ' is-active' : ''}`}
          onClick={() => onSelectGroup(null)}
        >
          همه
        </button>
        {groups.filter((g) => g.isActive !== false).map((group) => (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={selectedGroupId === group.id}
            className={`vitrin-chip${selectedGroupId === group.id ? ' is-active' : ''}`}
            onClick={() => onSelectGroup(group.id)}
          >
            {group.name}
          </button>
        ))}
      </div>
    </div>
  );
}
