import { Check, Clock, Info } from 'lucide-react';
import {
  getTriggerPickerOption,
  isTriggerPickerSelectionComplete,
  listTriggerPickerCategories,
} from '../triggerPicker.registry';

const ICON = { size: 16, strokeWidth: 1.75 };

/**
 * Registry-driven trigger picker — business language only.
 * @param {{
 *   value: import('../triggerPicker.registry').TriggerPickerSelection|null,
 *   onChange: (next: import('../triggerPicker.registry').TriggerPickerSelection|null) => void,
 * }} props
 */
export default function TriggerPicker({ value, onChange }) {
  const categories = listTriggerPickerCategories();
  const selectedOption = value?.optionId ? getTriggerPickerOption(value.optionId) : null;

  const patchSelection = (partial) => {
    onChange({ ...(value || {}), ...partial });
  };

  const selectOption = (option) => {
    if (!option.enabled) return;
    const next = {
      optionId: option.id,
      delayId: option.delaySupport?.default || 'immediate',
      customDelayHours: null,
      customDelayDays: null,
      config: {},
    };
    if (option.configSchema?.length) {
      option.configSchema.forEach((field) => {
        if (field.type === 'radio' && field.options?.[0]) {
          next.config[field.id] = field.options[0].value;
        }
      });
    }
    onChange(next);
  };

  const showIncompleteHint = value?.optionId && !isTriggerPickerSelectionComplete(value);

  return (
    <div className="mowj-trigger-picker" aria-label="انتخاب شرط آغاز">
      {!value?.optionId ? (
        <p className="mowj-trigger-picker__empty font-meem" role="status">
          <Info size={15} strokeWidth={1.75} aria-hidden="true" />
          هنوز شرط آغاز انتخاب نشده است.
        </p>
      ) : null}

      {categories.map((category) => (
        <section key={category.id} className="mowj-trigger-category glass-panel">
          <header className="mowj-trigger-category__head">
            <div>
              <h4 className="mowj-trigger-category__title font-meem">{category.title}</h4>
              {category.moduleLabel ? (
                <span className="mowj-trigger-category__module font-meem">{category.moduleLabel}</span>
              ) : null}
            </div>
          </header>

          <ul className="mowj-trigger-options">
            {category.options.map((option) => {
              const selected = value?.optionId === option.id;
              const disabled = !option.enabled;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    className={`mowj-trigger-option${selected ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`}
                    onClick={() => selectOption(option)}
                    disabled={disabled}
                    aria-pressed={selected}
                  >
                    <span className="mowj-trigger-option__radio" aria-hidden="true">
                      {selected ? <Check size={12} strokeWidth={2.5} /> : null}
                    </span>
                    <span className="mowj-trigger-option__body">
                      <span className="mowj-trigger-option__title font-meem">{option.title}</span>
                      <span className="mowj-trigger-option__desc font-meem">{option.description}</span>
                      {disabled ? (
                        <span className="mowj-trigger-option__badge font-meem">به‌زودی</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {selectedOption?.delaySupport ? (
        <section className="mowj-trigger-config glass-panel" aria-label="تاخیر اجرا">
          <header className="mowj-trigger-config__head">
            <Clock {...ICON} aria-hidden="true" />
            <div>
              <h4 className="font-meem">تاخیر</h4>
              <p className="font-meem">زمان اجرای کمپین پس از وقوع شرط</p>
            </div>
          </header>
          <div className="mowj-trigger-delay-grid">
            {selectedOption.delaySupport.options.map((delay) => {
              const active = (value?.delayId || selectedOption.delaySupport.default) === delay.id;
              return (
                <button
                  key={delay.id}
                  type="button"
                  className={`mowj-trigger-delay${active ? ' is-active' : ''}`}
                  onClick={() => patchSelection({
                    delayId: delay.id,
                    customDelayHours: delay.custom ? value?.customDelayHours ?? null : null,
                    customDelayDays: delay.custom ? value?.customDelayDays ?? null : null,
                  })}
                  aria-pressed={active}
                >
                  <span className="mowj-trigger-option__radio" aria-hidden="true">
                    {active ? <Check size={11} strokeWidth={2.5} /> : null}
                  </span>
                  <span className="font-meem">{delay.label}</span>
                </button>
              );
            })}
          </div>
          {(value?.delayId === 'custom') ? (
            <div className="mowj-trigger-custom-delay">
              <label className="mowj-field font-meem">
                ساعت
                <input
                  type="number"
                  min="1"
                  className="mowj-input mowj-input--numeric font-yekan"
                  value={value.customDelayHours ?? ''}
                  onChange={(e) => patchSelection({
                    customDelayHours: e.target.value ? Number(e.target.value) : null,
                    customDelayDays: null,
                  })}
                  placeholder="مثلاً ۲۴"
                />
              </label>
              <span className="mowj-trigger-custom-delay__or font-meem">یا</span>
              <label className="mowj-field font-meem">
                روز
                <input
                  type="number"
                  min="1"
                  className="mowj-input mowj-input--numeric font-yekan"
                  value={value.customDelayDays ?? ''}
                  onChange={(e) => patchSelection({
                    customDelayDays: e.target.value ? Number(e.target.value) : null,
                    customDelayHours: null,
                  })}
                  placeholder="مثلاً ۱۴"
                />
              </label>
            </div>
          ) : null}
        </section>
      ) : null}

      {selectedOption?.configSchema?.length ? (
        <section className="mowj-trigger-config glass-panel" aria-label="تنظیمات شرط">
          <header className="mowj-trigger-config__head">
            <Info {...ICON} aria-hidden="true" />
            <div>
              <h4 className="font-meem">تنظیمات</h4>
              <p className="font-meem">{selectedOption.title}</p>
            </div>
          </header>
          {selectedOption.configSchema.map((field) => {
            if (field.type === 'radio') {
              return (
                <fieldset key={field.id} className="mowj-trigger-fieldset">
                  <legend className="font-meem">{field.label}</legend>
                  <div className="mowj-trigger-delay-grid">
                    {(field.options || []).map((opt) => {
                      const active = value?.config?.[field.id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={`mowj-trigger-delay${active ? ' is-active' : ''}`}
                          onClick={() => patchSelection({
                            config: { ...(value?.config || {}), [field.id]: opt.value },
                          })}
                          aria-pressed={active}
                        >
                          <span className="mowj-trigger-option__radio" aria-hidden="true">
                            {active ? <Check size={11} strokeWidth={2.5} /> : null}
                          </span>
                          <span className="font-meem">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              );
            }
            return (
              <label key={field.id} className="mowj-field font-meem">
                {field.label}
                <select
                  className="mowj-select font-meem"
                  value={value?.config?.[field.id] || ''}
                  onChange={(e) => patchSelection({
                    config: { ...(value?.config || {}), [field.id]: e.target.value },
                  })}
                >
                  <option value="">{field.placeholder || 'انتخاب…'}</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            );
          })}
        </section>
      ) : null}

      {showIncompleteHint ? (
        <p className="mowj-form-error font-meem" role="alert">
          تنظیمات شرط آغاز را کامل کنید.
        </p>
      ) : null}
    </div>
  );
}
