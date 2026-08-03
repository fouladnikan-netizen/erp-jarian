import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CONTACT_PERSON_ROLES } from '../config/contactPersonRoles';
import { useKanoonStore } from '../store/kanoonStore';

function emptyForm() {
  return {
    fullName: '',
    role: 'مدیر خرید',
    mobile: '',
    directPhone: '',
    email: '',
    isPrimary: false,
  };
}

/**
 * Glass modal — add / edit associated contact person.
 * Explicit save only.
 */
export default function ContactPersonModal({
  open,
  companyId,
  personId = null,
  onClose,
}) {
  const contacts = useKanoonStore((s) => s.contacts);
  const addContactPerson = useKanoonStore((s) => s.addContactPerson);
  const updateContactPerson = useKanoonStore((s) => s.updateContactPerson);

  const company = contacts.find((c) => String(c.id) === String(companyId));
  const editing = personId
    ? (company?.relatedPersons || []).find((p) => String(p.id) === String(personId))
    : null;

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;
    const liveCompany = useKanoonStore.getState().contacts.find(
      (c) => String(c.id) === String(companyId),
    );
    const livePerson = personId
      ? (liveCompany?.relatedPersons || []).find((p) => String(p.id) === String(personId))
      : null;

    if (livePerson) {
      setForm({
        fullName: livePerson.fullName || livePerson.name || '',
        role: livePerson.role || 'مدیر خرید',
        mobile: livePerson.mobile || '',
        directPhone: livePerson.directPhone || '',
        email: livePerson.email || '',
        isPrimary: Boolean(livePerson.isPrimary),
      });
      return;
    }
    setForm(emptyForm());
  }, [open, companyId, personId]);

  if (!open) return null;

  const isEdit = Boolean(editing);
  const canSubmit = Boolean(String(form.fullName || '').trim() && String(form.mobile || '').trim());

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit || !companyId) return;

    const payload = {
      fullName: String(form.fullName).trim(),
      role: form.role,
      mobile: String(form.mobile).trim(),
      directPhone: String(form.directPhone).trim(),
      email: String(form.email).trim(),
      isPrimary: Boolean(form.isPrimary),
    };

    if (isEdit) {
      updateContactPerson(companyId, personId, payload);
    } else {
      addContactPerson(companyId, payload);
    }
    onClose?.();
  };

  return (
    <div className="kanoon-cp-modal" role="presentation" onClick={onClose} dir="rtl">
      <div
        className="kanoon-cp-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kanoon-cp-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="kanoon-cp-modal__header">
          <h3 id="kanoon-cp-modal-title" className="kanoon-cp-modal__title font-meem">
            {isEdit ? 'ویرایش رابط' : 'افزودن رابط جدید'}
          </h3>
          <button
            type="button"
            className="kanoon-cp-modal__close"
            onClick={onClose}
            aria-label="بستن"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <form className="kanoon-cp-modal__form" onSubmit={handleSubmit}>
          <div className="kanoon-cp-modal__field">
            <label className="kanoon-cp-modal__label font-meem" htmlFor="cp-fullName">
              نام و نام خانوادگی
            </label>
            <input
              id="cp-fullName"
              className="kanoon-cp-modal__input font-meem"
              type="text"
              dir="rtl"
              autoComplete="off"
              value={form.fullName}
              onChange={(event) => setField('fullName', event.target.value)}
            />
          </div>

          <div className="kanoon-cp-modal__field">
            <label className="kanoon-cp-modal__label font-meem" htmlFor="cp-role">
              سمت سازمانی
            </label>
            <select
              id="cp-role"
              className="kanoon-cp-modal__select font-meem"
              value={form.role}
              onChange={(event) => setField('role', event.target.value)}
            >
              {CONTACT_PERSON_ROLES.map((role) => (
                <option key={role.id} value={role.label}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="kanoon-cp-modal__row">
            <div className="kanoon-cp-modal__field">
              <label className="kanoon-cp-modal__label font-meem" htmlFor="cp-mobile">
                شماره همراه
              </label>
              <input
                id="cp-mobile"
                className="kanoon-cp-modal__input font-yekan"
                type="text"
                dir="ltr"
                autoComplete="off"
                value={form.mobile}
                onChange={(event) => setField('mobile', event.target.value)}
              />
            </div>

            <div className="kanoon-cp-modal__field">
              <label className="kanoon-cp-modal__label font-meem" htmlFor="cp-directPhone">
                تلفن مستقیم / داخلی
              </label>
              <input
                id="cp-directPhone"
                className="kanoon-cp-modal__input font-yekan"
                type="text"
                dir="ltr"
                autoComplete="off"
                value={form.directPhone}
                onChange={(event) => setField('directPhone', event.target.value)}
              />
            </div>
          </div>

          <div className="kanoon-cp-modal__field">
            <label className="kanoon-cp-modal__label font-meem" htmlFor="cp-email">
              ایمیل
              <span className="kanoon-cp-modal__optional font-meem">اختیاری</span>
            </label>
            <input
              id="cp-email"
              className="kanoon-cp-modal__input font-meem"
              type="email"
              dir="ltr"
              autoComplete="off"
              value={form.email}
              onChange={(event) => setField('email', event.target.value)}
            />
          </div>

          <div className="kanoon-cp-modal__toggle-row">
            <span className="kanoon-cp-modal__label font-meem" id="cp-primary-label">
              رابط اصلی شرکت
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={form.isPrimary}
              aria-labelledby="cp-primary-label"
              className={`kanoon-cp-toggle${form.isPrimary ? ' kanoon-cp-toggle--on' : ''}`}
              onClick={() => setField('isPrimary', !form.isPrimary)}
            >
              <span className="kanoon-cp-toggle__knob" aria-hidden="true" />
            </button>
          </div>

          <div className="kanoon-cp-modal__actions">
            <button
              type="button"
              className="kanoon-cp-btn kanoon-cp-btn--ghost font-meem"
              onClick={onClose}
            >
              انصراف
            </button>
            <button
              type="submit"
              className="kanoon-cp-btn kanoon-cp-btn--primary font-meem"
              disabled={!canSubmit}
            >
              ذخیره اطلاعات رابط
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
