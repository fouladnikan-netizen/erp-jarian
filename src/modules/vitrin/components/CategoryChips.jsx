/**
 * Progressive taxonomy chips (Group → Category → Type).
 * Nested rows appear only after a parent is selected so the toolbar
 * stays a single compact strip.
 */
export default function CategoryChips({
  groups,
  categories,
  types,
  selectedGroupId,
  selectedCategoryId,
  selectedTypeId,
  onSelectGroup,
  onSelectCategory,
  onSelectType,
}) {
  const activeGroups = groups.filter((g) => g.isActive !== false);
  const categoryOptions = selectedGroupId
    ? categories.filter((c) => c.groupId === selectedGroupId && c.isActive !== false)
    : [];
  const typeOptions = selectedCategoryId
    ? types.filter((t) => t.categoryId === selectedCategoryId && t.isActive !== false)
    : [];

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
        {activeGroups.map((group) => (
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

      {selectedGroupId && categoryOptions.length > 0 ? (
        <div className="vitrin-categories__row vitrin-categories__row--nested" role="tablist" aria-label="دسته‌های کالا">
          <span className="vitrin-categories__label">دسته</span>
          {categoryOptions.map((category) => (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={selectedCategoryId === category.id}
              className={`vitrin-chip vitrin-chip--sub${selectedCategoryId === category.id ? ' is-active' : ''}`}
              onClick={() => onSelectCategory(selectedCategoryId === category.id ? null : category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      ) : null}

      {selectedCategoryId && typeOptions.length > 0 ? (
        <div className="vitrin-categories__row vitrin-categories__row--nested" role="tablist" aria-label="انواع کالا">
          <span className="vitrin-categories__label">نوع</span>
          {typeOptions.map((type) => (
            <button
              key={type.id}
              type="button"
              role="tab"
              aria-selected={selectedTypeId === type.id}
              className={`vitrin-chip vitrin-chip--std${selectedTypeId === type.id ? ' is-active' : ''}`}
              onClick={() => onSelectType(selectedTypeId === type.id ? null : type.id)}
            >
              {type.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
