import { useEffect, useId, useRef, useState } from 'react';

function ChevronIcon({ expanded }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`gateway-select__chevron${expanded ? ' is-expanded' : ''}`}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function GatewaySelect({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = 'انتخاب کنید...',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open || disabled) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, disabled]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const handleSelect = (nextValue) => {
    if (disabled) return;
    onChange?.(nextValue);
    setOpen(false);
  };

  return (
    <div className={`gateway-select${disabled ? ' is-disabled' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="gateway-select__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
      >
        <span className="gateway-select__value">
          {selected?.label || placeholder}
        </span>
        <ChevronIcon expanded={open} />
      </button>

      {open && !disabled && (
        <ul className="gateway-select__menu" id={listId} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`gateway-select__option${isSelected ? ' is-selected' : ''}`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
