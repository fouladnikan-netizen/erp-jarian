import { useEffect, useMemo, useRef, useState } from 'react';

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

  return (
    <div className={`nabz-combobox${disabled ? ' is-disabled' : ''}`} ref={wrapRef}>
      <input
        type="search"
        className="nabz-form__input nabz-create-input font-meem"
        placeholder={placeholder}
        value={query}
        onChange={handleInput}
        onFocus={() => !disabled && setOpen(true)}
        aria-label={ariaLabel}
        autoComplete="off"
        disabled={disabled}
      />
      {open && !disabled && filtered.length > 0 && (
        <ul className="nabz-combobox__list" role="listbox">
          {filtered.map((option) => {
            const key = getOptionKey(option);
            return (
              <li key={key}>
                <button
                  type="button"
                  className={`nabz-combobox__option${value === key ? ' is-selected' : ''}`}
                  onClick={() => pick(option)}
                >
                  <span className="nabz-combobox__name font-meem">{getOptionLabel(option)}</span>
                  {getOptionMeta?.(option) ? (
                    <span className="nabz-combobox__meta font-meem">{getOptionMeta(option)}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && !disabled && query.trim() && filtered.length === 0 && (
        <div className="nabz-combobox__empty font-meem">{emptyMessage}</div>
      )}
    </div>
  );
}
