import { useUsersStore } from '../store/usersStore';
import { USER_ROLES } from '../config/usersRoles';
import { X } from 'lucide-react';

/**
 * Glassmorphism modal — add / edit user.
 * Explicit save only ("ثبت کاربر"); no auto-save.
 */
export default function AddUserModal() {
  const modalOpen = useUsersStore((s) => s.modalOpen);
  const editingUserId = useUsersStore((s) => s.editingUserId);
  const form = useUsersStore((s) => s.form);
  const setFormField = useUsersStore((s) => s.setFormField);
  const closeModal = useUsersStore((s) => s.closeModal);
  const saveUser = useUsersStore((s) => s.saveUser);

  if (!modalOpen) return null;

  const isEdit = Boolean(editingUserId);
  const canSubmit = Boolean(String(form.fullName || '').trim() && String(form.mobile || '').trim());

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    saveUser();
  };

  return (
    <div
      className="shirazeh-users-modal"
      role="presentation"
      onClick={closeModal}
    >
      <div
        className="shirazeh-users-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shirazeh-users-modal-title"
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shirazeh-users-modal__header">
          <h3 id="shirazeh-users-modal-title" className="shirazeh-users-modal__title font-meem">
            {isEdit ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}
          </h3>
          <button
            type="button"
            className="shirazeh-users-modal__close"
            onClick={closeModal}
            aria-label="بستن"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <form className="shirazeh-users-modal__form" onSubmit={handleSubmit}>
          <div className="shirazeh-users-modal__field">
            <label className="shirazeh-users-modal__label font-meem" htmlFor="user-fullName">
              نام کامل
            </label>
            <input
              id="user-fullName"
              className="shirazeh-users-modal__input font-meem"
              type="text"
              dir="rtl"
              autoComplete="off"
              value={form.fullName}
              onChange={(event) => setFormField('fullName', event.target.value)}
            />
          </div>

          <div className="shirazeh-users-modal__field">
            <label className="shirazeh-users-modal__label font-meem" htmlFor="user-mobile">
              شماره موبایل
            </label>
            <input
              id="user-mobile"
              className="shirazeh-users-modal__input font-yekan"
              type="text"
              dir="ltr"
              autoComplete="off"
              value={form.mobile}
              onChange={(event) => setFormField('mobile', event.target.value)}
            />
          </div>

          <div className="shirazeh-users-modal__field">
            <label className="shirazeh-users-modal__label font-meem" htmlFor="user-email">
              ایمیل
            </label>
            <input
              id="user-email"
              className="shirazeh-users-modal__input font-meem"
              type="email"
              dir="ltr"
              autoComplete="off"
              value={form.email}
              onChange={(event) => setFormField('email', event.target.value)}
            />
          </div>

          <div className="shirazeh-users-modal__field">
            <label className="shirazeh-users-modal__label font-meem" htmlFor="user-role">
              نقش
            </label>
            <select
              id="user-role"
              className="shirazeh-users-modal__select font-meem"
              value={form.roleId}
              onChange={(event) => setFormField('roleId', event.target.value)}
            >
              {USER_ROLES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="shirazeh-users-modal__actions">
            <button
              type="button"
              className="shirazeh-users-btn shirazeh-users-btn--ghost font-meem"
              onClick={closeModal}
            >
              انصراف
            </button>
            <button
              type="submit"
              className="shirazeh-users-btn shirazeh-users-btn--primary font-meem"
              disabled={!canSubmit}
            >
              {isEdit ? 'ذخیره تغییرات' : 'ثبت کاربر'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
