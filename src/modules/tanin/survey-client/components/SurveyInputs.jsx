import { Star } from 'lucide-react';
import { toPersianDigits } from '../../nabz/dateUtils';

export function RatingInput({
  value,
  onChange,
  min = 1,
  max = 5,
  disabled = false,
}) {
  const scores = [];
  for (let i = min; i <= max; i += 1) scores.push(i);

  return (
    <div className="tanin-rating" role="radiogroup" aria-label="امتیازدهی">
      {scores.map((score) => {
        const selected = Number(value) === score;
        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`tanin-rating__btn${selected ? ' is-selected' : ''}`}
            disabled={disabled}
            onClick={() => onChange(score)}
          >
            <Star
              size={18}
              strokeWidth={1.75}
              fill={selected ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
            <span className="font-yekan">{toPersianDigits(score)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function BooleanInput({ value, onChange, disabled = false }) {
  return (
    <div className="tanin-boolean" role="group" aria-label="پاسخ بله یا خیر">
      <button
        type="button"
        className={`tanin-boolean__btn${value === true ? ' is-selected' : ''}`}
        disabled={disabled}
        onClick={() => onChange(true)}
      >
        <span className="font-meem">بله</span>
      </button>
      <button
        type="button"
        className={`tanin-boolean__btn${value === false ? ' is-selected' : ''}`}
        disabled={disabled}
        onClick={() => onChange(false)}
      >
        <span className="font-meem">خیر</span>
      </button>
    </div>
  );
}

export function TextInput({
  value = '',
  onChange,
  disabled = false,
  placeholder = 'پاسخ خود را بنویسید…',
}) {
  return (
    <textarea
      className="tanin-text font-meem"
      rows={4}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
