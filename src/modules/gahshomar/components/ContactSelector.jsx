import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, UserRound, X } from 'lucide-react';
import { searchOfficialRecordContacts } from '../officialRecordFacade';
import { buildContactParticipant } from '../services/letterContactSearch';
import '../gahshomar-page.css';

/**
 * Recipient/sender picker — Kanoon contacts only (no free text).
 */
export default function ContactSelector({
  value = null,
  onChange,
  disabled = false,
  readOnly = false,
  label = 'گیرنده',
  role = 'RECEIVER',
}) {
  const inputId = useId();
  const rootRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(
    () => (open ? searchOfficialRecordContacts(query) : []),
    [open, query],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const selectedLabel = value?.name
    ? [
      value.name,
      value.companyName,
      value.position,
      value.mobile,
    ].filter(Boolean).join(' · ')
    : '';

  const handleSelect = (option) => {
    const participant = buildContactParticipant(option, role);
    onChange?.(participant);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange?.(null);
    setQuery('');
  };

  return (
    <div className="gahshomar-modal__field font-meem" ref={rootRef}>
      <label htmlFor={inputId}>{label}</label>
      <div className={`gahshomar-contact-selector${readOnly ? ' is-readonly' : ''}`}>
        {value?.partyId && !open ? (
          <div className="gahshomar-contact-selector__chip">
            <UserRound size={15} strokeWidth={1.75} aria-hidden="true" />
            <div className="gahshomar-contact-selector__chip-copy">
              <strong className="font-meem">{value.name || '—'}</strong>
              <span className="font-meem">
                {[value.companyName, value.position].filter(Boolean).join(' · ')}
              </span>
              {value.mobile ? (
                <span className="font-yekan">{value.mobile}</span>
              ) : null}
            </div>
            {!readOnly && !disabled ? (
              <button
                type="button"
                className="gahshomar-contact-selector__clear"
                aria-label="حذف مخاطب"
                onClick={handleClear}
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            ) : null}
            {!readOnly && !disabled ? (
              <button
                type="button"
                className="gahshomar-btn font-meem"
                onClick={() => setOpen(true)}
              >
                تغییر
              </button>
            ) : null}
          </div>
        ) : (
          <div className="gahshomar-contact-selector__input-wrap">
            <Search size={15} strokeWidth={1.75} aria-hidden="true" />
            <input
              id={inputId}
              className="gahshomar-modal__input font-meem"
              value={open ? query : selectedLabel}
              disabled={disabled || readOnly}
              readOnly={readOnly}
              autoComplete="off"
              placeholder="جستجوی مخاطب کانن…"
              onFocus={() => {
                if (!readOnly && !disabled) setOpen(true);
              }}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
            />
          </div>
        )}

        {open && !readOnly && !disabled ? (
          <ul className="gahshomar-contact-selector__list" role="listbox" aria-label="مخاطبین">
            {results.length === 0 ? (
              <li className="gahshomar-contact-selector__empty font-meem">
                مخاطبی یافت نشد.
              </li>
            ) : results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="gahshomar-contact-selector__option"
                  onClick={() => handleSelect(item)}
                >
                  <strong className="font-meem">{item.fullName}</strong>
                  <span className="font-meem">{item.companyName}</span>
                  <span className="font-meem">{item.position}</span>
                  <span className="font-yekan">{item.mobile || '—'}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
