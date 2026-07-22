export default function FormSegment({ label, options, value, onChange, ariaLabel }) {
  const activeIndex = Math.max(0, options.indexOf(value));

  return (
    <div className="nabz-create-field">
      <span className="nabz-form__label font-meem">{label}</span>
      <div
        className={`nabz-form-segment${activeIndex === 1 ? ' nabz-form-segment--second' : ''}`}
        role="radiogroup"
        aria-label={ariaLabel || label}
      >
        <span className="nabz-form-segment__pill" aria-hidden="true" />
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            className={`nabz-form-segment__btn font-meem${value === option ? ' is-active' : ''}`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
