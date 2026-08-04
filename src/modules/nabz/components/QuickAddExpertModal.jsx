import { useState } from 'react';
import { addExpertToCustomer } from '../customers';
import { CONTACT_PERSON_JOB_POSITIONS } from '../../../components/contactPerson/contactPersonRoles';

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
    fullName: '',
    mobile: '',
    jobPosition: 'کارشناس فروش',
  });
  const [error, setError] = useState('');

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    if (!form.fullName.trim()) {
      setError('نام کارشناس اجباری است.');
      return;
    }
    if (!form.mobile.trim()) {
      setError('شماره موبایل اجباری است.');
      return;
    }

    const personId = addExpertToCustomer(customerId, {
      fullName: form.fullName.trim(),
      mobile: form.mobile.trim(),
      jobPosition: form.jobPosition.trim() || 'کارشناس فروش',
    });

    if (!personId) {
      setError('ثبت کارشناس ناموفق بود.');
      return;
    }

    onAdded(personId);
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
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
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
          <Field label="سمت">
            <select
              className="nabz-form__input nabz-create-input font-meem"
              value={form.jobPosition}
              onChange={(e) => update('jobPosition', e.target.value)}
            >
              {CONTACT_PERSON_JOB_POSITIONS.map((role) => (
                <option key={role.id} value={role.label}>
                  {role.label}
                </option>
              ))}
            </select>
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
