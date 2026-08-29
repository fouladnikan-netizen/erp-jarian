import { useUsersStore } from '../store/usersStore';
import { X } from 'lucide-react';

/**
 * Glassmorphism modal — add / edit user.
 * Explicit save only; password is create-only (reset is a separate modal).
 */
export default function AddUserModal() {
  const modalOpen = useUsersStore((s) => s.modalOpen);
  const editingUserId = useUsersStore((s) => s.editingUserId);
  const form = useUsersStore((s) => s.form);
  const roles = useUsersStore((s) => s.roles);
  const saving = useUsersStore((s) => s.saving);
  const setFormField = useUsersStore((s) => s.setFormField);
  const toggleFormRole = useUsersStore((s) => s.toggleFormRole);
  const closeModal = useUsersStore((s) => s.closeModal);
  const saveUser = useUsersStore((s) => s.saveUser);

  if (!modalOpen) return null;

  const isEdit = Boolean(editingUserId);
  const canSubmit = Boolean(
    String(form.displayName || '').trim()
    && (isEdit || String(form.username || '').trim())
    && (isEdit || String(form.password || '').length >= 8)
    && Array.isArray(form.roleCodes)
    && form.roleCodes.length > 0,
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit || saving) return;
    await saveUser();
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
            <label className="shirazeh-users-modal__label font-meem" htmlFor="user-displayName">
              نام نمایشی
            </label>
            <input
              id="user-displayName"
              className="shirazeh-users-modal__input font-meem"
              type="text"
              dir="rtl"
              autoComplete="off"
              value={form.displayName}
              onChange={(event) => setFormField('displayName', event.target.value)}
            />
          </div>

          <div className="shirazeh-users-modal__field">
            <label className="shirazeh-users-modal__label font-meem" htmlFor="user-username">
              نام کاربری
            </label>
            <input
              id="user-username"
              className="shirazeh-users-modal__input font-yekan"
              type="text"
              dir="ltr"
              autoComplete="off"
              disabled={isEdit}
              value={form.username}
              onChange={(event) => setFormField('username', event.target.value)}
            />
          </div>

          {!isEdit ? (
            <div className="shirazeh-users-modal__field">
              <label className="shirazeh-users-modal__label font-meem" htmlFor="user-password">
                رمز عبور
              </label>
              <input
                id="user-password"
                className="shirazeh-users-modal__input font-yekan"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setFormField('password', event.target.value)}
              />
            </div>
          ) : null}

          <fieldset className="shirazeh-users-modal__field">
            <legend className="shirazeh-users-modal__label font-meem">نقش‌ها</legend>
            <div className="shirazeh-users-roles">
              {roles.map((role) => {
                const checked = form.roleCodes.includes(role.code);
                return (
                  <label key={role.code} className="shirazeh-users-role font-meem">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFormRole(role.code)}
                    />
                    <span>{role.labelFa || role.code}</span>
                  </label>
                );
              })}
              {!roles.length ? (
                <span className="shirazeh-users-roles__empty font-meem">نقشی بارگذاری نشده است.</span>
              ) : null}
            </div>
          </fieldset>

          {isEdit ? (
            <div className="shirazeh-users-modal__field">
              <label className="shirazeh-users-role font-meem">
                <input
                  type="checkbox"
                  checked={form.isActive !== false}
                  onChange={(event) => setFormField('isActive', event.target.checked)}
                />
                <span>حساب فعال است</span>
              </label>
            </div>
          ) : null}

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
              disabled={!canSubmit || saving}
            >
              {isEdit ? 'ذخیره تغییرات' : 'ثبت کاربر'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
