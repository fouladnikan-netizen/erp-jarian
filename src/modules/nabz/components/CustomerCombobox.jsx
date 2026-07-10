import { useEffect, useMemo, useRef, useState } from 'react';
import { getDisplayName } from '../../kanoon/columns';
import { searchCustomers, getCustomerById } from '../customers';

export default function CustomerCombobox({ value, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selected = getCustomerById(value);
  const results = useMemo(() => searchCustomers(query), [query]);

  useEffect(() => {
    if (selected && !query) {
      setQuery(getDisplayName(selected));
    }
  }, [selected, query]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (contact) => {
    onChange(contact.id);
    setQuery(getDisplayName(contact));
    setOpen(false);
  };

  const handleInput = (e) => {
    setQuery(e.target.value);
    setOpen(true);
    if (!e.target.value.trim()) onChange(null);
  };

  return (
    <div className="nabz-combobox" ref={wrapRef}>
      <input
        type="search"
        className="nabz-form__input"
        placeholder="جستجو در مخاطبین کانون..."
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        aria-label="مشتری"
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="nabz-combobox__list" role="listbox">
          {results.map((contact) => (
            <li key={contact.id}>
              <button
                type="button"
                className={`nabz-combobox__option${value === contact.id ? ' is-selected' : ''}`}
                onClick={() => pick(contact)}
              >
                <span className="nabz-combobox__name">{getDisplayName(contact)}</span>
                <span className="nabz-combobox__meta">
                  {[contact.province, contact.activityDomain].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && results.length === 0 && (
        <div className="nabz-combobox__empty">مشتری‌ای یافت نشد.</div>
      )}
    </div>
  );
}
