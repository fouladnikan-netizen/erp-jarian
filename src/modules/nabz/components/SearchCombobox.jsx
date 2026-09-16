import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';

/**
 * Live Search / Autocomplete — Google-like UX, Jarian Design System tokens.
 * Consumers: CustomerCombobox, ExpertCombobox, Gahshomar ContactSelector.
 */
export default function SearchCombobox({
  value,
  onChange,
  options,
  getOptionKey,
  getOptionLabel,
  getOptionMeta,
  placeholder,
  ariaLabel,
  disabled = false,
  emptyMessage = 'موردی یافت نشد.',
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selected = useMemo(
    () => options.find((option) => getOptionKey(option) === value) || null,
    [options, value, getOptionKey],
  );

  useEffect(() => {
    if (selected && !query) {
      setQuery(getOptionLabel(selected));
    }
  }, [selected, query, getOptionLabel]);

  useEffect(() => {
    if (!value) setQuery('');
  }, [value]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && query === getOptionLabel(selected))) {
      return options.slice(0, 12);
    }
    return options.filter((option) => {
      const haystack = [getOptionLabel(option), getOptionMeta?.(option)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    }).slice(0, 12);
  }, [options, query, selected, getOptionLabel, getOptionMeta]);

  const pick = (option) => {
    onChange(getOptionKey(option));
    setQuery(getOptionLabel(option));
    setOpen(false);
  };

  const handleInput = (e) => {
    setQuery(e.target.value);
    setOpen(true);
    if (!e.target.value.trim()) onChange(null);
  };

  const showList = open && !disabled && filtered.length > 0;
  const showEmpty = open && !disabled && query.trim() && filtered.length === 0;

  return (
    <div
      className={`nabz-combobox${disabled ? ' is-disabled' : ''}${open && !disabled ? ' is-open' : ''}`}
      ref={wrapRef}
    >
      <div className="nabz-combobox__field">
        <input
          type="search"
          className="nabz-combobox__input font-meem"
          placeholder={placeholder}
          value={query}
          onChange={handleInput}
          onFocus={() => !disabled && setOpen(true)}
          aria-label={ariaLabel}
          aria-expanded={open && !disabled}
          aria-autocomplete="list"
          role="combobox"
          autoComplete="off"
          disabled={disabled}
        />
      </div>

      {showList && (
        <ul className="nabz-combobox__list" role="listbox">
          {filtered.map((option) => {
            const key = getOptionKey(option);
            const isSelected = value === key;
            return (
              <li key={key} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`nabz-combobox__option${isSelected ? ' is-selected' : ''}`}
                  onClick={() => pick(option)}
                >
                  <Search
                    className="nabz-combobox__option-icon"
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="nabz-combobox__option-body">
                    <span className="nabz-combobox__name font-meem">{getOptionLabel(option)}</span>
                    {getOptionMeta?.(option) ? (
                      <span className="nabz-combobox__meta font-meem">{getOptionMeta(option)}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showEmpty && (
        <div className="nabz-combobox__empty font-meem" role="status">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
