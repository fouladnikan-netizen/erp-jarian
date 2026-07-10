export default function CategoryChips({
  groups,
  selectedGroupId,
  onSelectGroup,
  onAddSubgroup,
}) {
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

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
        {groups.map((group) => (
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
        {selectedGroup && (
          <button
            type="button"
            className="btn btn--outline vitrin-categories__add-sub"
            onClick={() => onAddSubgroup(selectedGroup.id)}
          >
            + ثبت زیرگروه
          </button>
        )}
      </div>
    </div>
  );
}
