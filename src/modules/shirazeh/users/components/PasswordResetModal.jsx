import { useUsersStore } from '../store/usersStore';
import { X } from 'lucide-react';

/**
 * Explicit admin password reset — not mixed into profile edit.
 */
export default function PasswordResetModal() {
  const passwordModalUserId = useUsersStore((s) => s.passwordModalUserId);
  const passwordForm = useUsersStore((s) => s.passwordForm);
  const users = useUsersStore((s) => s.users);
  const saving = useUsersStore((s) => s.saving);
  const setPasswordFormField = useUsersStore((s) => s.setPasswordFormField);
  const closePasswordModal = useUsersStore((s) => s.closePasswordModal);
  const resetPassword = useUsersStore((s) => s.resetPassword);

  if (!passwordModalUserId) return null;

  const user = users.find((u) => u.id === passwordModalUserId);
  const canSubmit = String(passwordForm.password || '').length >= 8;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit || saving) return;
    await resetPassword();
  };

  return (
    <div
      className="shirazeh-users-modal"
      role="presentation"
      onClick={closePasswordModal}
    >
      <div
        className="shirazeh-users-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shirazeh-users-password-title"
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shirazeh-users-modal__header">
          <h3 id="shirazeh-users-password-title" className="shirazeh-users-modal__title font-meem">
            بازنشانی رمز عبور
            {user?.displayName ? ` — ${user.displayName}` : ''}
          </h3>
          <button
            type="button"
            className="shirazeh-users-modal__close"
            onClick={closePasswordModal}
            aria-label="بستن"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <form className="shirazeh-users-modal__form" onSubmit={handleSubmit}>
          <div className="shirazeh-users-modal__field">
            <label className="shirazeh-users-modal__label font-meem" htmlFor="user-reset-password">
              رمز عبور جدید
            </label>
            <input
              id="user-reset-password"
              className="shirazeh-users-modal__input font-yekan"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={passwordForm.password}
              onChange={(event) => setPasswordFormField('password', event.target.value)}
            />
          </div>

          <div className="shirazeh-users-modal__actions">
            <button
              type="button"
              className="shirazeh-users-btn shirazeh-users-btn--ghost font-meem"
              onClick={closePasswordModal}
            >
              انصراف
            </button>
            <button
              type="submit"
              className="shirazeh-users-btn shirazeh-users-btn--primary font-meem"
              disabled={!canSubmit || saving}
            >
              ثبت رمز جدید
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
