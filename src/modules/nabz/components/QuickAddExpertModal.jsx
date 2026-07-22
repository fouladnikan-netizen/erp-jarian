import { useState } from 'react';
import { addExpertToCustomer, expertKey } from '../customers';

function Field({ label, required, children }) {
  return (
    <label className="nabz-form__field nabz-create-premium__field">
      <span className="nabz-form__label font-meem">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}

export default function QuickAddExpertModal({ customerId, onClose, onAdded }) {
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    role: 'کارشناس',
  });
  const [error, setError] = useState('');

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError('نام کارشناس اجباری است.');
      return;
    }
    if (!form.mobile.trim()) {
      setError('شماره موبایل اجباری است.');
      return;
    }

    const person = {
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      role: form.role.trim() || 'کارشناس',
      notes: '',
    };

    addExpertToCustomer(customerId, person);
    onAdded(expertKey(person));
    onClose();
  };

  return (
    <div className="nabz-picker-overlay nabz-picker-overlay--stacked" onClick={onClose} role="presentation">
      <div
        className="nabz-picker-modal nabz-quick-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-expert-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="nabz-picker-modal__header">
          <h2 id="quick-add-expert-title" className="nabz-picker-modal__title font-meem">
            افزودن کارشناس
          </h2>
          <button type="button" className="nabz-picker-modal__close" onClick={onClose} aria-label="بستن">
            ×
          </button>
        </header>

        <div className="nabz-quick-modal__body">
          <Field label="نام کارشناس" required>
            <input
              type="text"
              className="nabz-form__input nabz-create-input font-meem"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="نام و نام خانوادگی"
            />
          </Field>
          <Field label="موبایل" required>
            <input
              type="tel"
              className="nabz-form__input nabz-create-input font-yekan"
              value={form.mobile}
              onChange={(e) => update('mobile', e.target.value)}
              placeholder="09..."
              dir="ltr"
            />
          </Field>
          <Field label="نقش">
            <input
              type="text"
              className="nabz-form__input nabz-create-input font-meem"
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
              placeholder="کارشناس"
            />
          </Field>
          {error ? <p className="nabz-create-error font-meem" role="alert">{error}</p> : null}
        </div>

        <footer className="nabz-quick-modal__footer">
          <button type="button" className="nabz-create-premium__cancel font-meem" onClick={onClose}>
            انصراف
          </button>
          <button type="button" className="nabz-create-premium__submit font-meem" onClick={handleSubmit}>
            ثبت کارشناس
          </button>
        </footer>
      </div>
    </div>
  );
}
