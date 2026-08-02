import { Eye, EyeOff, Save } from 'lucide-react';
import { useState } from 'react';
import { useIntegrationUIStore } from '../store/integrationUIStore';

/**
 * Dynamic credential form from registry fields.
 * Secret inputs stay masked in the UI; values live only in temporary draft state.
 */
export default function ConnectionForm({ integration }) {
  const draft = useIntegrationUIStore((s) => s.draftForms[integration.id] || {});
  const setDraftField = useIntegrationUIStore((s) => s.setDraftField);
  const saveCredentials = useIntegrationUIStore((s) => s.saveCredentials);
  const savingId = useIntegrationUIStore((s) => s.savingId);
  const [revealed, setRevealed] = useState({});

  const saving = savingId === integration.id;

  const toggleReveal = (key) => {
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    void saveCredentials(integration.id);
  };

  return (
    <form className="shirazeh-conn-form" onSubmit={handleSave}>
      {integration.fields.map((field) => {
        const value = draft[field.key] ?? '';
        const isSecret = field.type === 'secret';
        const isMaskedFlag = Boolean(draft[`${field.key}__masked`]);
        const showPlain = isSecret ? Boolean(revealed[field.key]) : true;

        return (
          <div key={field.key} className="shirazeh-conn-form__field">
            <label className="shirazeh-conn-form__label font-meem" htmlFor={`${integration.id}-${field.key}`}>
              {field.label}
            </label>
            <div className="shirazeh-conn-form__control">
              <input
                id={`${integration.id}-${field.key}`}
                className={`shirazeh-conn-form__input ${isSecret ? 'font-yekan' : 'font-meem'}`}
                type={isSecret && !showPlain ? 'password' : 'text'}
                dir="rtl"
                autoComplete="off"
                value={value}
                placeholder={isSecret ? '••••••••' : ''}
                onChange={(event) => {
                  setDraftField(integration.id, field.key, event.target.value);
                  if (isMaskedFlag) {
                    setDraftField(integration.id, `${field.key}__masked`, false);
                  }
                }}
                onClick={(event) => event.stopPropagation()}
              />
              {isSecret ? (
                <button
                  type="button"
                  className="shirazeh-conn-form__reveal"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleReveal(field.key);
                  }}
                  aria-label={showPlain ? 'مخفی کردن مقدار' : 'نمایش مقدار'}
                >
                  {showPlain ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                </button>
              ) : null}
            </div>
            {isSecret && isMaskedFlag && value ? (
              <p className="shirazeh-conn-form__hint font-yekan">
                مقدار ذخیره‌شده به‌صورت ماسک: {value}
              </p>
            ) : null}
          </div>
        );
      })}

      <div className="shirazeh-conn-form__actions">
        <button
          type="submit"
          className="shirazeh-btn shirazeh-btn--ghost font-meem"
          disabled={saving}
          onClick={(event) => event.stopPropagation()}
        >
          <Save size={15} strokeWidth={1.75} aria-hidden="true" />
          {saving ? 'در حال ذخیره…' : 'ذخیره اعتبارنامه'}
        </button>
      </div>
    </form>
  );
}
