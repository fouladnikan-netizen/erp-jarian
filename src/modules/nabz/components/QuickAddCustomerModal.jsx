import { useState } from 'react';
import {
  ASSIGNEE_ROLES,
  CUSTOMER_ACTIVITY_DOMAINS,
  DEFAULT_CUSTOMER_STATUS,
  ENTITY_TYPES,
  IRAN_PROVINCES,
  PERSON_TYPES,
} from '../../kanoon/config';
import { CURRENT_USER } from '../constants';
import { addCustomerRecord } from '../customers';

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

export default function QuickAddCustomerModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    companyName: '',
    nationalId: '',
    province: '',
    activityDomain: CUSTOMER_ACTIVITY_DOMAINS[0] || '',
  });
  const [error, setError] = useState('');

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    if (!form.companyName.trim()) {
      setError('نام شرکت اجباری است.');
      return;
    }
    if (!form.nationalId.trim()) {
      setError('شناسه ملی اجباری است.');
      return;
    }
    if (!form.activityDomain) {
      setError('حوزه فعالیت را انتخاب کنید.');
      return;
    }

    const record = addCustomerRecord({
      entityType: ENTITY_TYPES.CUSTOMER,
      personType: PERSON_TYPES.LEGAL,
      companyName: form.companyName.trim(),
      nationalId: form.nationalId.trim(),
      province: form.province || undefined,
      activityDomain: form.activityDomain,
      behavioralStatus: DEFAULT_CUSTOMER_STATUS,
      assignee: { name: CURRENT_USER, role: ASSIGNEE_ROLES.customer },
      relatedPersons: [],
      interactions: [],
      relatedOrders: [],
      officialSpecs: {},
      legalPersons: {},
      isActive: true,
      createdAt: new Date().toISOString(),
      lastActivityAt: null,
      analytics: { interactionValue: '۰ تومان', openOrders: 0 },
    });

    onAdded(record);
    onClose();
  };

  return (
    <div className="nabz-picker-overlay nabz-picker-overlay--stacked" onClick={onClose} role="presentation">
      <div
        className="nabz-picker-modal nabz-quick-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-customer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="nabz-picker-modal__header">
          <h2 id="quick-add-customer-title" className="nabz-picker-modal__title font-meem">
            افزودن سریع مشتری
          </h2>
          <button type="button" className="nabz-picker-modal__close" onClick={onClose} aria-label="بستن">
            ×
          </button>
        </header>

        <div className="nabz-quick-modal__body">
          <Field label="نام شرکت" required>
            <input
              type="text"
              className="nabz-form__input nabz-create-input font-meem"
              value={form.companyName}
              onChange={(e) => update('companyName', e.target.value)}
              placeholder="نام حقوقی شرکت"
            />
          </Field>
          <Field label="شناسه ملی" required>
            <input
              type="text"
              className="nabz-form__input nabz-create-input font-yekan"
              value={form.nationalId}
              onChange={(e) => update('nationalId', e.target.value)}
              placeholder="۱۰۱۰..."
              dir="ltr"
            />
          </Field>
          <div className="nabz-create-grid nabz-create-grid--modal">
            <Field label="استان">
              <select
                className="nabz-form__input nabz-create-input font-meem"
                value={form.province}
                onChange={(e) => update('province', e.target.value)}
              >
                <option value="">انتخاب استان</option>
                {IRAN_PROVINCES.map((province) => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
            </Field>
            <Field label="حوزه فعالیت" required>
              <select
                className="nabz-form__input nabz-create-input font-meem"
                value={form.activityDomain}
                onChange={(e) => update('activityDomain', e.target.value)}
              >
                {CUSTOMER_ACTIVITY_DOMAINS.map((domain) => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
              </select>
            </Field>
          </div>
          {error ? <p className="nabz-create-error font-meem" role="alert">{error}</p> : null}
        </div>

        <footer className="nabz-quick-modal__footer">
          <button type="button" className="nabz-create-premium__cancel font-meem" onClick={onClose}>
            انصراف
          </button>
          <button type="button" className="nabz-create-premium__submit font-meem" onClick={handleSubmit}>
            ثبت مشتری
          </button>
        </footer>
      </div>
    </div>
  );
}
