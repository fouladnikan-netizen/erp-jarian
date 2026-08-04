import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  buildCatalogCapabilityOptions,
  createCatalogCapabilityTag,
  createCustomCapabilityTag,
  hasExactCapabilityMatch,
  searchCapabilityOptions,
} from '../supplierCapabilities';

/**
 * Flexible supplier capability tag input.
 * Suggestions come from Vitrin catalog projection; custom tags stay on Supplier only.
 */
export default function SupplierCapabilityTagInput({
  value = [],
  onChange,
  label = 'توانمندی‌های تامین',
  placeholder = 'جستجوی گروه، زیرگروه یا کالا…',
}) {
  const listId = useId();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const catalogOptions = useMemo(() => buildCatalogCapabilityOptions(), []);
  const suggestions = useMemo(
    () => searchCapabilityOptions(query, value, catalogOptions),
    [query, value, catalogOptions],
  );

  const trimmed = query.trim();
  const canCreateCustom = Boolean(trimmed)
    && !hasExactCapabilityMatch(trimmed, catalogOptions)
    && !(value || []).some((tag) => String(tag.label).trim().toLowerCase() === trimmed.toLowerCase());

  const menuItems = [
    ...suggestions.map((opt) => ({ kind: 'suggestion', option: opt })),
    ...(canCreateCustom
      ? [{ kind: 'custom', label: trimmed }]
      : []),
  ];

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open, menuItems.length]);

  const commitTag = (tag) => {
    if (!tag) return;
    const exists = (value || []).some(
      (item) => String(item.id) === String(tag.id)
        || String(item.label).trim().toLowerCase() === String(tag.label).trim().toLowerCase(),
    );
    if (exists) {
      setQuery('');
      setOpen(false);
      return;
    }
    onChange([...(value || []), tag]);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeTag = (tagId) => {
    onChange((value || []).filter((tag) => String(tag.id) !== String(tagId)));
  };

  const pickMenuItem = (item) => {
    if (!item) return;
    if (item.kind === 'custom') {
      commitTag(createCustomCapabilityTag(item.label));
      return;
    }
    commitTag(createCatalogCapabilityTag(item.option));
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(menuItems.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (open && menuItems[activeIndex]) {
        pickMenuItem(menuItems[activeIndex]);
        return;
      }
      if (canCreateCustom) {
        commitTag(createCustomCapabilityTag(trimmed));
        return;
      }
      if (suggestions[0]) {
        commitTag(createCatalogCapabilityTag(suggestions[0]));
      }
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'Backspace' && !query && value?.length) {
      removeTag(value[value.length - 1].id);
    }
  };

  return (
    <div className="supplier-cap-tags font-meem" data-testid="supplier-capability-tag-input">
      <span className="kanoon-form__label">{label}</span>

      <div className="supplier-cap-tags__box kprofile-glass">
        <div className="supplier-cap-tags__selected" aria-live="polite">
          {(value || []).map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={`supplier-cap-tags__chip${tag.type === 'custom' ? ' is-custom' : ''}`}
              onClick={() => removeTag(tag.id)}
              aria-label={`حذف ${tag.label}`}
              title="حذف"
            >
              <span>{tag.label}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>

        <input
          ref={inputRef}
          type="text"
          className="supplier-cap-tags__input font-meem"
          value={query}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          role="combobox"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Allow suggestion click before closing.
            window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && menuItems.length > 0 && (
        <ul id={listId} className="supplier-cap-tags__menu" role="listbox">
          {menuItems.map((item, index) => {
            const isActive = index === activeIndex;
            if (item.kind === 'custom') {
              return (
                <li key={`custom-${item.label}`} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    className={`supplier-cap-tags__option is-custom${isActive ? ' is-active' : ''}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => pickMenuItem(item)}
                  >
                    افزودن برچسب سفارشی:
                    {' '}
                    <strong>{item.label}</strong>
                  </button>
                </li>
              );
            }
            return (
              <li key={item.option.id} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={`supplier-cap-tags__option${isActive ? ' is-active' : ''}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pickMenuItem(item)}
                >
                  <span>{item.option.label}</span>
                  <span className="supplier-cap-tags__option-meta">
                    {item.option.kind === 'group' && 'گروه'}
                    {item.option.kind === 'subgroup' && 'زیرگروه'}
                    {item.option.kind === 'product' && 'کالا'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
