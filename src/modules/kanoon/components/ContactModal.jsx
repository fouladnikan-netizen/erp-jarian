import { useState } from 'react';
import {
  ASSIGNEE_ROLES,
  CUSTOMER_ACTIVITY_DOMAINS,
  DEFAULT_CUSTOMER_STATUS,
  ENTITY_TYPES,
  IRAN_PROVINCES,
  PERSON_TYPES,
  SUPPLIER_TYPES,
} from '../config';
import { validateSupplierLegalFields } from '../supplierCapabilities';
import SupplierCapabilityTagInput from './SupplierCapabilityTagInput';

const NATIONAL_ID_MESSAGE =
  'به منظور پیشگیری از ثبت شرکت تکراری، شناسه ملی اجباری است. اگر تمایل دارید به وب سایت لینکا جهت استخراج شناسه ملی هدایت شوید';

function openLinkaSearch(companyName) {
  const query = encodeURIComponent(`${companyName} لینکا`);
  window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
}

function Field({ label, required, children }) {
  return (
    <label className="kanoon-form__field">
      <span className="kanoon-form__label">
        {label}
        {required && <span className="kanoon-form__required">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function ContactModal({
  mode,
  entityType,
  personType,
  onClose,
  onSubmit,
  onOpenFullForm,
}) {
  const isLegal = personType === PERSON_TYPES.LEGAL;
  const isCustomer = entityType === ENTITY_TYPES.CUSTOMER;
  const isFull = mode === 'full';
  const showFullFormButton = !isLegal && !isFull;

  const [form, setForm] = useState({
    companyName: '',
    nationalId: '',
    personName: '',
    mobile: '',
    activityDomain: '',
    province: '',
    fullAddress: '',
    ownerName: '',
    landline: '',
    supplierType: SUPPLIER_TYPES[0],
    capabilityTags: [],
  });
  const [nationalIdError, setNationalIdError] = useState(false);
  const [validationError, setValidationError] = useState('');

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const buildContact = () => {
    const assigneeRole = isCustomer ? ASSIGNEE_ROLES.customer : ASSIGNEE_ROLES.supplier;
    const base = {
      entityType,
      personType,
      behavioralStatus: isCustomer ? DEFAULT_CUSTOMER_STATUS : 'trial',
      assignee: { name: 'کاربر جاری', role: assigneeRole },
      interactions: [],
      relatedOrders: [],
      relatedPersons: [],
      officialSpecs: isLegal ? {} : null,
      legalPersons: isLegal ? {} : null,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastActivityAt: null,
      analytics: isCustomer
        ? { interactionValue: '۰ تومان', openOrders: 0 }
        : { supplyVolume: '۰ تومان', openInquiries: 0 },
    };

    if (isCustomer && isLegal) {
      return {
        ...base,
        companyName: form.companyName.trim(),
        nationalId: form.nationalId.trim(),
        activityDomain: form.activityDomain,
        province: form.province || undefined,
        fullAddress: isFull ? form.fullAddress.trim() : undefined,
      };
    }

    if (isCustomer && !isLegal) {
      return {
        ...base,
        personName: form.personName.trim(),
        mobile: form.mobile.trim(),
        activityDomain: form.activityDomain,
        province: isFull ? form.province : undefined,
      };
    }

    if (!isCustomer && isLegal) {
      return {
        ...base,
        companyName: form.companyName.trim(),
        nationalId: form.nationalId.trim(),
        ownerName: form.ownerName.trim(),
        landline: form.landline.trim(),
        capabilityTags: [...form.capabilityTags],
        productGroups: [],
        supplierType: isFull ? form.supplierType : SUPPLIER_TYPES[0],
        mobile: isFull ? form.mobile.trim() : undefined,
        fullAddress: isFull ? form.fullAddress.trim() : undefined,
      };
    }

    return {
      ...base,
      personName: form.personName.trim(),
      mobile: form.mobile.trim(),
      landline: form.landline.trim() || undefined,
      capabilityTags: [...form.capabilityTags],
      productGroups: [],
      supplierType: isFull ? form.supplierType : SUPPLIER_TYPES[0],
    };
  };

  const validate = () => {
    setValidationError('');
    setNationalIdError(false);

    if (!isCustomer && isLegal) {
      const result = validateSupplierLegalFields(form);
      if (!result.ok) {
        if (result.nationalIdMissing) setNationalIdError(true);
        setValidationError(result.message || 'اطلاعات تامین‌کننده ناقص است.');
        return false;
      }
      return true;
    }

    if (isLegal) {
      if (!form.companyName.trim()) {
        setValidationError('نام شرکت اجباری است.');
        return false;
      }
      if (!form.nationalId.trim()) {
        setNationalIdError(true);
        return false;
      }
      if (isCustomer && !form.activityDomain) {
        setValidationError('حوزه فعالیت اجباری است.');
        return false;
      }
      return true;
    }

    if (!form.personName.trim() || !form.mobile.trim()) {
      setValidationError('نام شخص و شماره موبایل اجباری است.');
      return false;
    }
    if (isCustomer && !form.activityDomain) {
      setValidationError('حوزه فعالیت اجباری است.');
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(buildContact());
  };

  const title = isFull ? 'تکمیل کامل اطلاعات' : 'ثبت مخاطب جدید';

  return (
    <div className="kanoon-modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`kanoon-modal${isFull ? ' kanoon-modal--full' : ' kanoon-modal--minimal'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="kanoon-modal__header">
          <h2 id="contact-modal-title" className="kanoon-modal__title">{title}</h2>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="kanoon-modal__body">
            {isLegal ? (
              <>
                <Field label="نام شرکت" required>
                  <input type="text" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} required />
                </Field>
                <Field label="شناسه ملی" required>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="font-yekan"
                    value={form.nationalId}
                    onChange={(e) => {
                      update('nationalId', e.target.value);
                      setNationalIdError(false);
                    }}
                  />
                </Field>
                {nationalIdError && (
                  <div className="kanoon-modal__alert">
                    <p>{NATIONAL_ID_MESSAGE}</p>
                    <button type="button" className="btn btn--accent" onClick={() => openLinkaSearch(form.companyName)}>
                      ادامه
                    </button>
                  </div>
                )}
                {isCustomer && (
                  <Field label="حوزه فعالیت" required>
                    <select value={form.activityDomain} onChange={(e) => update('activityDomain', e.target.value)} required>
                      <option value="">انتخاب کنید</option>
                      {CUSTOMER_ACTIVITY_DOMAINS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </Field>
                )}
                {!isCustomer && (
                  <>
                    <Field label="نام مدیر/مالک" required>
                      <input
                        type="text"
                        value={form.ownerName}
                        onChange={(e) => update('ownerName', e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="تلفن ثابت شرکت" required>
                      <input
                        type="tel"
                        className="font-yekan"
                        value={form.landline}
                        onChange={(e) => update('landline', e.target.value)}
                        required
                      />
                    </Field>
                    <SupplierCapabilityTagInput
                      value={form.capabilityTags}
                      onChange={(tags) => update('capabilityTags', tags)}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                <Field label="نام شخص" required>
                  <input type="text" value={form.personName} onChange={(e) => update('personName', e.target.value)} required />
                </Field>
                <Field label="شماره موبایل" required>
                  <input
                    type="tel"
                    inputMode="tel"
                    className="font-yekan"
                    value={form.mobile}
                    onChange={(e) => update('mobile', e.target.value)}
                    required
                  />
                </Field>
                {isCustomer && (
                  <Field label="حوزه فعالیت" required>
                    <select value={form.activityDomain} onChange={(e) => update('activityDomain', e.target.value)} required>
                      <option value="">انتخاب کنید</option>
                      {CUSTOMER_ACTIVITY_DOMAINS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </Field>
                )}
                {!isCustomer && (
                  <>
                    <Field label="تلفن ثابت">
                      <input
                        type="tel"
                        className="font-yekan"
                        value={form.landline}
                        onChange={(e) => update('landline', e.target.value)}
                      />
                    </Field>
                    <SupplierCapabilityTagInput
                      value={form.capabilityTags}
                      onChange={(tags) => update('capabilityTags', tags)}
                    />
                  </>
                )}
              </>
            )}

            {validationError && <p className="kanoon-form__error">{validationError}</p>}

            {isFull && (
              <div className="kanoon-modal__full-fields">
                {isLegal && (
                  <Field label="آدرس کامل">
                    <textarea
                      rows={3}
                      value={form.fullAddress}
                      onChange={(e) => update('fullAddress', e.target.value)}
                      placeholder="آدرس کامل شرکت..."
                    />
                  </Field>
                )}
                {isCustomer && (
                  <Field label="استان">
                    <select value={form.province} onChange={(e) => update('province', e.target.value)}>
                      <option value="">انتخاب کنید</option>
                      {IRAN_PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                )}
                {!isCustomer && (
                  <>
                    {isLegal && (
                      <Field label="شماره موبایل">
                        <input
                          type="tel"
                          className="font-yekan"
                          value={form.mobile}
                          onChange={(e) => update('mobile', e.target.value)}
                        />
                      </Field>
                    )}
                    <Field label="نوع تامین‌کننده">
                      <select value={form.supplierType} onChange={(e) => update('supplierType', e.target.value)}>
                        {SUPPLIER_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}
              </div>
            )}
          </div>

          <footer className="kanoon-modal__footer">
            {showFullFormButton && (
              <button type="button" className="btn btn--outline" onClick={onOpenFullForm}>
                تکمیل کامل اطلاعات
              </button>
            )}
            <button type="button" className="btn btn--ghost" onClick={onClose}>انصراف</button>
            <button type="submit" className="btn btn--primary">ثبت</button>
          </footer>
        </form>
      </div>
    </div>
  );
}
