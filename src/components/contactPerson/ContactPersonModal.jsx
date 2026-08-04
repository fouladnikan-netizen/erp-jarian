import { useEffect, useRef, useState } from 'react';
import { Check, Info, Trash2, X } from 'lucide-react';
import { useContactsStore } from '../../stores/useContactsStore';
import { isValidMobile } from '../../domain/contactPerson';
import {
  CONTACT_PERSON_GENDERS,
  CONTACT_PERSON_JOB_POSITIONS,
} from './contactPersonRoles';

const MOBILE_LOOKUP_DEBOUNCE_MS = 320;

function emptyForm() {
  return {
    fullName: '',
    mobile: '',
    gender: '',
    jobPosition: 'مدیر خرید',
    email: '',
    isPrimary: false,
  };
}

/**
 * Shared Add/Edit ContactPerson modal — detail view with guarded delete.
 * Duplicate mobile detection is informational only (ADR-08); never blocks save.
 */
export default function ContactPersonModal({
  open,
  companyId,
  personId = null,
  onClose,
  onSaved,
  elevated = false,
}) {
  const addContactPerson = useContactsStore((s) => s.addContactPerson);
  const updateContactPerson = useContactsStore((s) => s.updateContactPerson);
  const deleteContactPerson = useContactsStore((s) => s.deleteContactPerson);
  const lookupMobile = useContactsStore((s) => s.lookupMobile);

  // TODO: connect to RBAC — only managers/admins may delete ContactPersons
  const hasAdminPermission = true;

  const [form, setForm] = useState(emptyForm);
  const [mobileMatches, setMobileMatches] = useState([]);
  const lookupTimer = useRef(null);
  const isEdit = Boolean(personId);

  useEffect(() => {
    if (!open) return;
    if (personId) {
      const live = useContactsStore.getState().getContactPerson(companyId, personId);
      if (live) {
        setForm({
          fullName: live.fullName || '',
          mobile: live.mobile || '',
          gender: live.gender || '',
          jobPosition: live.jobPosition || 'مدیر خرید',
          email: live.email || '',
          isPrimary: Boolean(live.isPrimary),
        });
        setMobileMatches([]);
        return;
      }
    }
    setForm(emptyForm());
    setMobileMatches([]);
  }, [open, companyId, personId]);

  useEffect(() => () => clearTimeout(lookupTimer.current), []);

  if (!open) return null;

  const canSubmit = Boolean(String(form.fullName || '').trim() && String(form.mobile || '').trim());

  const runMobileLookup = (rawMobile) => {
    if (!isValidMobile(rawMobile)) {
      setMobileMatches([]);
      return;
    }
    const matches = lookupMobile(rawMobile, {
      excludeContactPersonId: personId || undefined,
    });
    setMobileMatches(matches);
  };

  const scheduleMobileLookup = (rawMobile) => {
    clearTimeout(lookupTimer.current);
    lookupTimer.current = setTimeout(() => {
      runMobileLookup(rawMobile);
    }, MOBILE_LOOKUP_DEBOUNCE_MS);
  };

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'mobile') {
      scheduleMobileLookup(value);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit || !companyId) return;

    const payload = {
      fullName: String(form.fullName).trim(),
      mobile: String(form.mobile).trim(),
      gender: form.gender || '',
      jobPosition: form.jobPosition || '',
      email: String(form.email).trim(),
      isPrimary: Boolean(form.isPrimary),
    };

    if (isEdit) {
      updateContactPerson(companyId, personId, payload);
    } else {
      addContactPerson(companyId, payload);
    }
    onSaved?.(payload);
    onClose?.();
  };

  const handleDelete = () => {
    if (!isEdit || !companyId || !personId || !hasAdminPermission) return;
    const label = String(form.fullName || '').trim() || 'این رابط';
    const ok = window.confirm(`حذف «${label}» قطعی است؟`);
    if (!ok) return;
    deleteContactPerson(companyId, personId);
    onClose?.();
  };

  return (
    <div
      className={`contact-person-modal${elevated ? ' contact-person-modal--elevated' : ''}`}
      role="presentation"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="contact-person-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-person-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="contact-person-modal__header">
          <h3 id="contact-person-modal-title" className="contact-person-modal__title font-meem">
            {isEdit ? 'ویرایش رابط' : 'افزودن رابط جدید'}
          </h3>
          <button
            type="button"
            className="contact-person-modal__close"
            onClick={onClose}
            aria-label="بستن"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <form className="contact-person-modal__form" onSubmit={handleSubmit}>
          <div className="contact-person-modal__field">
            <label className="contact-person-modal__label font-meem" htmlFor="cp-fullName">
              نام و نام خانوادگی
            </label>
            <input
              id="cp-fullName"
              className="contact-person-modal__input font-meem"
              type="text"
              dir="rtl"
              autoComplete="off"
              value={form.fullName}
              onChange={(event) => setField('fullName', event.target.value)}
            />
          </div>

          <div className="contact-person-modal__field">
            <label className="contact-person-modal__label font-meem" htmlFor="cp-mobile">
              شماره همراه
            </label>
            <input
              id="cp-mobile"
              className="contact-person-modal__input font-yekan"
              type="text"
              dir="ltr"
              autoComplete="off"
              value={form.mobile}
              onChange={(event) => setField('mobile', event.target.value)}
              onBlur={(event) => {
                clearTimeout(lookupTimer.current);
                runMobileLookup(event.target.value);
              }}
            />
          </div>

          {mobileMatches.length > 0 ? (
            <aside
              className="contact-person-dup"
              role="status"
              aria-live="polite"
            >
              <header className="contact-person-dup__head">
                <span className="contact-person-dup__icon" aria-hidden="true">
                  <Info size={16} strokeWidth={1.75} />
                </span>
                <div className="contact-person-dup__copy">
                  <h4 className="contact-person-dup__title font-meem">
                    این شماره موبایل در سیستم وجود دارد.
                  </h4>
                  <p className="contact-person-dup__body font-meem">
                    این شماره موبایل در سیستم وجود دارد (در این شرکت یا شرکت‌های دیگر).
                    در صورت نیاز می‌توانید ثبت را ادامه دهید، اما در آینده امکان اتصال پروفایل‌ها فراهم خواهد شد.
                  </p>
                </div>
              </header>

              <div className="contact-person-dup__list-label font-meem">ثبت شده در:</div>
              <ul className="contact-person-dup__list">
                {mobileMatches.map((match) => (
                  <li
                    key={`${match.companyId}-${match.personId}`}
                    className="contact-person-dup__item"
                  >
                    <span className="contact-person-dup__check" aria-hidden="true">
                      <Check size={14} strokeWidth={2.25} />
                    </span>
                    <div className="contact-person-dup__item-body">
                      <span className="contact-person-dup__company font-meem">
                        {[match.companyName, match.personName, match.role].filter(Boolean).join(' — ')}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}

          <div className="contact-person-modal__row">
            <div className="contact-person-modal__field">
              <label className="contact-person-modal__label font-meem" htmlFor="cp-gender">
                جنسیت
                <span className="contact-person-modal__optional font-meem">اختیاری</span>
              </label>
              <select
                id="cp-gender"
                className="contact-person-modal__select font-meem"
                value={form.gender}
                onChange={(event) => setField('gender', event.target.value)}
              >
                {CONTACT_PERSON_GENDERS.map((g) => (
                  <option key={g.id || 'empty'} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="contact-person-modal__field">
              <label className="contact-person-modal__label font-meem" htmlFor="cp-job">
                سمت سازمانی
                <span className="contact-person-modal__optional font-meem">اختیاری</span>
              </label>
              <select
                id="cp-job"
                className="contact-person-modal__select font-meem"
                value={form.jobPosition}
                onChange={(event) => setField('jobPosition', event.target.value)}
              >
                {CONTACT_PERSON_JOB_POSITIONS.map((role) => (
                  <option key={role.id} value={role.label}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="contact-person-modal__field">
            <label className="contact-person-modal__label font-meem" htmlFor="cp-email">
              ایمیل
              <span className="contact-person-modal__optional font-meem">اختیاری</span>
            </label>
            <input
              id="cp-email"
              className="contact-person-modal__input font-meem"
              type="email"
              dir="ltr"
              autoComplete="off"
              value={form.email}
              onChange={(event) => setField('email', event.target.value)}
            />
          </div>

          <div className="contact-person-modal__toggle-row">
            <span className="contact-person-modal__label font-meem" id="cp-primary-label">
              رابط اصلی شرکت
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={form.isPrimary}
              aria-labelledby="cp-primary-label"
              className={`contact-person-toggle${form.isPrimary ? ' contact-person-toggle--on' : ''}`}
              onClick={() => setField('isPrimary', !form.isPrimary)}
            >
              <span className="contact-person-toggle__knob" aria-hidden="true" />
            </button>
          </div>

          <div className="contact-person-modal__actions">
            {isEdit && hasAdminPermission ? (
              <button
                type="button"
                className="contact-person-btn contact-person-btn--danger font-meem"
                onClick={handleDelete}
              >
                <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                حذف مخاطب
              </button>
            ) : (
              <span className="contact-person-modal__actions-spacer" aria-hidden="true" />
            )}
            <div className="contact-person-modal__actions-primary">
              <button
                type="button"
                className="contact-person-btn contact-person-btn--ghost font-meem"
                onClick={onClose}
              >
                انصراف
              </button>
              <button
                type="submit"
                className="contact-person-btn contact-person-btn--primary font-meem"
                disabled={!canSubmit}
              >
                ذخیره
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
