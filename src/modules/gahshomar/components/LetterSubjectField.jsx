import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { filterLetterSubjectTemplates } from '../services/letterSubjectTemplates';
import '../gahshomar-page.css';

const PLACEHOLDER_SUBJECTS = new Set(['پیش‌نویس جدید', 'بدون موضوع', '']);

/**
 * Subject selector — choosing a template fills subject + body draft.
 * Focus always reveals the catalog (filtered as the user types).
 */
export default function LetterSubjectField({
  value = '',
  onChange,
  onSelectTemplate,
  disabled = false,
  readOnly = false,
}) {
  const inputId = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const displayValue = PLACEHOLDER_SUBJECTS.has(String(value || '').trim())
    ? ''
    : String(value || '');

  const templates = useMemo(() => {
    const sourceQuery = open ? query : '';
    if (!String(sourceQuery || '').trim()) return filterLetterSubjectTemplates('');
    const filtered = filterLetterSubjectTemplates(sourceQuery);
    // Keep catalog visible even when typed text matches nothing yet.
    return filtered.length > 0 ? filtered : filterLetterSubjectTemplates('');
  }, [open, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const handleSelect = (item) => {
    onSelectTemplate?.(item);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="gahshomar-modal__field font-meem" ref={rootRef}>
      <label htmlFor={inputId}>
        موضوع
        <span className="gahshomar-req" aria-hidden="true">*</span>
      </label>
      <div className={`gahshomar-subject-field${open ? ' is-open' : ''}`}>
        <div className="gahshomar-subject-field__control">
          <input
            id={inputId}
            className="gahshomar-modal__input font-meem"
            value={open ? query : displayValue}
            disabled={disabled}
            readOnly={readOnly}
            autoComplete="off"
            placeholder="موضوع دلخواه یا انتخاب از پیش‌فرض‌ها…"
            onFocus={() => {
              if (readOnly || disabled) return;
              setQuery(displayValue);
              setOpen(true);
            }}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              onChange?.(next);
              setOpen(true);
            }}
          />
          {!readOnly && !disabled ? (
            <button
              type="button"
              className="gahshomar-subject-field__toggle"
              aria-label="نمایش قالب‌های موضوع"
              aria-expanded={open}
              onClick={() => {
                setQuery(displayValue);
                setOpen((current) => !current);
              }}
            >
              <ChevronDown size={16} strokeWidth={1.75} />
            </button>
          ) : null}
        </div>

        {open && !readOnly && !disabled ? (
          <ul className="gahshomar-subject-field__list" role="listbox" aria-label="قالب‌های موضوع">
            {templates.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="gahshomar-subject-field__option font-meem"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(item)}
                >
                  <strong>{item.subject}</strong>
                  <span>
                    {String(item.body || '')
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean)[1]
                      || String(item.body || '').trim()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
