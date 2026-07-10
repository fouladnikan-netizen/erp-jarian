import { getEffectiveStageId, getManualStageOptions, MOZENE_LOCKED_MESSAGE } from '../orderStageService';

export default function OrderStageSelect({ order, onChange }) {
  const options = getManualStageOptions(order);
  const currentStageId = getEffectiveStageId(order);

  return (
    <label className="nabz-stage-select">
      <span className="nabz-stage-select__label">مرحله سفارش</span>
      <select
        className="nabz-form__input nabz-stage-select__input"
        value={currentStageId}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="تغییر مرحله سفارش"
      >
        {options.map((stage) => (
          <option key={stage.id} value={stage.id} disabled={stage.disabled}>
            {stage.locked ? `${stage.label} (قفل سیستمی)` : stage.label}
          </option>
        ))}
      </select>
      <p className="nabz-stage-select__hint">{MOZENE_LOCKED_MESSAGE}</p>
    </label>
  );
}
