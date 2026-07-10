import { useEffect, useId, useRef, useState } from 'react';
import {
  formatJalaliDate,
  getJalaliMonthLength,
  getJalaliWeekday,
  getTodayJalaliParts,
  parseJalaliDate,
  toPersianDigits,
} from '../dateUtils';

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const WEEKDAY_LABELS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function shiftJalaliMonth(year, month, delta) {
  let nextMonth = month + delta;
  let nextYear = year;
  while (nextMonth > 12) {
    nextMonth -= 12;
    nextYear += 1;
  }
  while (nextMonth < 1) {
    nextMonth += 12;
    nextYear -= 1;
  }
  return { year: nextYear, month: nextMonth };
}

export default function JalaliDatePicker({
  label,
  value,
  onChange,
  placeholder = 'انتخاب تاریخ',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const today = getTodayJalaliParts();
  const selected = parseJalaliDate(value);
  const hasValue = Boolean(value && selected.year && selected.month && selected.day);
  const [viewYear, setViewYear] = useState(selected.year || today.year);
  const [viewMonth, setViewMonth] = useState(selected.month || today.month);

  useEffect(() => {
    if (!open || disabled) return undefined;
    if (hasValue) {
      setViewYear(selected.year);
      setViewMonth(selected.month);
    } else {
      setViewYear(today.year);
      setViewMonth(today.month);
    }
  }, [open, disabled, hasValue, selected.year, selected.month, today.year, today.month]);

  useEffect(() => {
    if (!open || disabled) return undefined;
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
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

  const monthLength = getJalaliMonthLength(viewYear, viewMonth);
  const firstWeekday = getJalaliWeekday(viewYear, viewMonth, 1);
  const startOffset = (firstWeekday + 1) % 7;
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= monthLength; day += 1) cells.push(day);

  const handleSelectDay = (day) => {
    if (disabled) return;
    onChange?.(formatJalaliDate(viewYear, viewMonth, day));
    setOpen(false);
  };

  const goMonth = (delta) => {
    const next = shiftJalaliMonth(viewYear, viewMonth, delta);
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  return (
    <div className={`tadarok-form__field jalali-date-picker${disabled ? ' is-disabled' : ''}`} ref={rootRef}>
      <span>{label}</span>
      <button
        type="button"
        className={`jalali-date-picker__trigger${hasValue ? '' : ' is-placeholder'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
      >
        {hasValue ? value : placeholder}
      </button>

      {open && !disabled && (
        <div className="jalali-date-picker__popover" id={listId} role="dialog" aria-label={label}>
          <header className="jalali-date-picker__head">
            <button type="button" className="jalali-date-picker__nav" onClick={() => goMonth(-1)} aria-label="ماه قبل">‹</button>
            <strong>
              {PERSIAN_MONTHS[viewMonth - 1]}
              {' '}
              {toPersianDigits(viewYear)}
            </strong>
            <button type="button" className="jalali-date-picker__nav" onClick={() => goMonth(1)} aria-label="ماه بعد">›</button>
          </header>

          <div className="jalali-date-picker__weekdays">
            {WEEKDAY_LABELS.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="jalali-date-picker__grid">
            {cells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} className="jalali-date-picker__day is-empty" />;
              const isSelected = hasValue
                && selected.year === viewYear
                && selected.month === viewMonth
                && selected.day === day;
              const isToday = today.year === viewYear && today.month === viewMonth && today.day === day;
              return (
                <button
                  key={day}
                  type="button"
                  className={`jalali-date-picker__day${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}
                  onClick={() => handleSelectDay(day)}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>

          <footer className="jalali-date-picker__footer">
            <button
              type="button"
              className="btn btn--ghost jalali-date-picker__today"
              onClick={() => {
                onChange?.(formatJalaliDate(today.year, today.month, today.day));
                setOpen(false);
              }}
            >
              امروز
            </button>
            {hasValue && (
              <button
                type="button"
                className="btn btn--ghost jalali-date-picker__clear"
                onClick={() => {
                  onChange?.('');
                  setOpen(false);
                }}
              >
                پاک کردن
              </button>
            )}
          </footer>
        </div>
      )}
    </div>
  );
}
