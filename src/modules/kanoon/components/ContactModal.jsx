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
  'شناسه ملی باید دقیقاً ۱۱ رقم باشد.';

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

/**
 * @param {{
 *   mode: string,
 *   entityType: string,
 *   personType: string,
 *   onClose: () => void,
 *   onSubmit: (contact: object) => void,
 *   onCreateFromIdentity?: (input: { nationalId: string, entityType: string, activityDomain?: string }) => Promise<void>|void,
 *   onOpenFullForm: () => void,
 * }} props
 */
export default function ContactModal({
  mode,
  entityType,
  personType,
  onClose,
  onSubmit,
  onCreateFromIdentity,
  onOpenFullForm,
}) {
  const isLegal = personType === PERSON_TYPES.LEGAL;
  const isCustomer = entityType === ENTITY_TYPES.CUSTOMER;
  const isFull = mode === 'full';
  const showFullFormButton = !isLegal && !isFull;
  const useIdentityFlow = isLegal && typeof onCreateFromIdentity === 'function';

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
  const [submitting, setSubmitting] = useState(false);

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

  const validateIdentity = () => {
    setValidationError('');
    setNationalIdError(false);
    const cleaned = String(form.nationalId || '').replace(/\D/g, '');
    if (!cleaned) {
      setNationalIdError(true);
      setValidationError('شناسه ملی را وارد کنید.');
      return null;
    }
    if (cleaned.length !== 11) {
      setNationalIdError(true);
      setValidationError(NATIONAL_ID_MESSAGE);
      return null;
    }
    if (isCustomer && !form.activityDomain) {
      setValidationError('حوزه فعالیت را از لیست انتخاب کنید.');
      return null;
    }
    return cleaned;
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

  const handleIdentitySubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const cleaned = validateIdentity();
    if (!cleaned) return;

    setSubmitting(true);
    setValidationError('');
    try {
      await onCreateFromIdentity({
        nationalId: cleaned,
        entityType: isCustomer ? ENTITY_TYPES.CUSTOMER : ENTITY_TYPES.SUPPLIER,
        activityDomain: form.activityDomain || undefined,
      });
    } catch (error) {
      setValidationError(error?.message || 'استعلام/ثبت شرکت ناموفق بود.');
      setNationalIdError(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(buildContact());
  };

  const title = useIdentityFlow
    ? 'شناسه ملی → استعلام و ثبت شرکت'
    : (isFull ? 'تکمیل کامل اطلاعات' : 'ثبت مخاطب جدید');

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
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن" disabled={submitting}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={useIdentityFlow ? handleIdentitySubmit : handleSubmit}>
          <div className="kanoon-modal__body">
            {useIdentityFlow ? (
              <>
                <p className="kanoon-form__hint font-meem">
                  شناسه ملی ۱۱ رقمی را وارد کنید. اطلاعات رسمی از سرویس استعلام خوانده و شرکت در کانون ثبت می‌شود.
                </p>
                <Field label="شناسه ملی" required>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="font-yekan"
                    value={form.nationalId}
                    disabled={submitting}
                    onChange={(e) => {
                      update('nationalId', e.target.value);
                      setNationalIdError(false);
                      setValidationError('');
                    }}
                    autoFocus
                  />
                </Field>
                {isCustomer && (
                  <Field label="حوزه فعالیت" required>
                    <select
                      value={form.activityDomain}
                      disabled={submitting}
                      onChange={(e) => {
                        update('activityDomain', e.target.value);
                        setValidationError('');
                      }}
                      required
                    >
                      <option value="">انتخاب کنید</option>
                      {CUSTOMER_ACTIVITY_DOMAINS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </Field>
                )}
                {validationError ? (
                  <div className="kanoon-modal__alert">
                    <p>{validationError}</p>
                  </div>
                ) : null}
                {nationalIdError && !validationError ? (
                  <div className="kanoon-modal__alert">
                    <p>{NATIONAL_ID_MESSAGE}</p>
                  </div>
                ) : null}
              </>
            ) : isLegal ? (
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

            {validationError && (
              <p className="kanoon-form__error">{validationError}</p>
            )}

            {isFull && !useIdentityFlow && (
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
              <button type="button" className="btn btn--outline" onClick={onOpenFullForm} disabled={submitting}>
                تکمیل کامل اطلاعات
              </button>
            )}
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>انصراف</button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting
                ? 'در حال استعلام…'
                : (useIdentityFlow ? 'استعلام و ثبت شرکت' : 'ثبت')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
