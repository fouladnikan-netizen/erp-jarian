import { useMemo } from 'react';
import { useUsersStore } from '../store/usersStore';
import { JarianDrawer } from '../../../../components/ui';

/**
 * Add / edit user — left-side drawer (Jarian global overlay).
 * Create does not collect password or username (DDL-39).
 */
export default function AddUserModal() {
  const modalOpen = useUsersStore((s) => s.modalOpen);
  const editingUserId = useUsersStore((s) => s.editingUserId);
  const form = useUsersStore((s) => s.form);
  const roles = useUsersStore((s) => s.roles);
  const units = useUsersStore((s) => s.units);
  const positions = useUsersStore((s) => s.positions);
  const saving = useUsersStore((s) => s.saving);
  const setFormField = useUsersStore((s) => s.setFormField);
  const toggleFormRole = useUsersStore((s) => s.toggleFormRole);
  const closeModal = useUsersStore((s) => s.closeModal);
  const saveUser = useUsersStore((s) => s.saveUser);

  const isEdit = Boolean(editingUserId);
  const unitPositions = useMemo(
    () => (positions || []).filter((p) => {
      if (p.unitId !== form.unitId) return false;
      if (p.isActive !== false) return true;
      return p.id === form.positionId;
    }),
    [positions, form.unitId, form.positionId],
  );

  const visibleRoles = useMemo(() => {
    const selected = new Set(form.roleCodes || []);
    return (roles || []).filter((role) => role.isActive !== false || selected.has(role.code));
  }, [roles, form.roleCodes]);

  const canSubmit = Boolean(
    String(form.fullName || '').trim()
    && String(form.mobile || '').trim()
    && Array.isArray(form.roleCodes)
    && form.roleCodes.length > 0,
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit || saving) return;
    await saveUser();
  };

  return (
    <JarianDrawer
      open={modalOpen}
      onClose={closeModal}
      title={isEdit ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}
      size="md"
      className="shirazeh-users-drawer"
      footer={(
        <>
          <button
            type="button"
            className="shirazeh-users-btn shirazeh-users-btn--ghost font-meem"
            onClick={closeModal}
          >
            انصراف
          </button>
          <button
            type="submit"
            form="shirazeh-add-user-form"
            className="shirazeh-users-btn shirazeh-users-btn--primary font-meem"
            disabled={!canSubmit || saving}
          >
            {isEdit ? 'ذخیره تغییرات' : 'ثبت کاربر'}
          </button>
        </>
      )}
    >
      <form
        id="shirazeh-add-user-form"
        className="shirazeh-users-modal__form"
        onSubmit={handleSubmit}
      >
        <div className="shirazeh-users-modal__field">
          <label className="shirazeh-users-modal__label font-meem" htmlFor="user-fullName">
            نام و نام خانوادگی *
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
            شماره موبایل سازمانی *
          </label>
          <input
            id="user-mobile"
            className="shirazeh-users-modal__input font-yekan"
            type="tel"
            dir="ltr"
            autoComplete="off"
            inputMode="numeric"
            placeholder="09xxxxxxxxx"
            value={form.mobile}
            onChange={(event) => setFormField('mobile', event.target.value)}
          />
        </div>

        <div className="shirazeh-users-modal__field">
          <label className="shirazeh-users-modal__label font-meem" htmlFor="user-email">
            ایمیل سازمانی
          </label>
          <input
            id="user-email"
            className="shirazeh-users-modal__input font-yekan"
            type="email"
            dir="ltr"
            autoComplete="off"
            value={form.email}
            onChange={(event) => setFormField('email', event.target.value)}
          />
        </div>

        <div className="shirazeh-users-modal__field">
          <label className="shirazeh-users-modal__label font-meem" htmlFor="user-unit">
            واحد سازمانی
          </label>
          <select
            id="user-unit"
            className="shirazeh-users-modal__select font-meem"
            value={form.unitId}
            onChange={(event) => setFormField('unitId', event.target.value)}
          >
            <option value="">انتخاب واحد</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
        </div>

        <div className="shirazeh-users-modal__field">
          <label className="shirazeh-users-modal__label font-meem" htmlFor="user-position">
            سمت
          </label>
          <select
            id="user-position"
            className="shirazeh-users-modal__select font-meem"
            value={form.positionId}
            disabled={!form.unitId}
            onChange={(event) => setFormField('positionId', event.target.value)}
          >
            <option value="">انتخاب سمت</option>
            {unitPositions.map((position) => (
              <option key={position.id} value={position.id}>{position.title}</option>
            ))}
          </select>
        </div>

        <fieldset className="shirazeh-users-modal__field">
          <legend className="shirazeh-users-modal__label font-meem">نقش‌ها *</legend>
          <div className="shirazeh-users-roles">
            {visibleRoles.map((role) => {
              const checked = form.roleCodes.includes(role.code);
              return (
                <label key={role.code} className="shirazeh-users-role font-meem">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFormRole(role.code)}
                  />
                  <span>
                    {role.labelFa || role.code}
                    {role.isActive === false ? ' (غیرفعال)' : ''}
                  </span>
                </label>
              );
            })}
            {!visibleRoles.length ? (
              <span className="shirazeh-users-roles__empty font-meem">نقشی بارگذاری نشده است.</span>
            ) : null}
          </div>
        </fieldset>

        {isEdit ? (
          <div className="shirazeh-users-modal__field">
            <label className="shirazeh-users-modal__label font-meem" htmlFor="user-status">
              وضعیت
            </label>
            <select
              id="user-status"
              className="shirazeh-users-modal__select font-meem"
              value={form.status}
              onChange={(event) => setFormField('status', event.target.value)}
            >
              <option value="INVITED">دعوت‌شده</option>
              <option value="ACTIVE">فعال</option>
              <option value="INACTIVE">غیرفعال</option>
            </select>
          </div>
        ) : (
          <p className="shirazeh-users-modal__hint font-meem">
            کاربر بدون رمز عبور ثبت می‌شود و تا تکمیل دعوت در وضعیت دعوت‌شده می‌ماند.
          </p>
        )}
      </form>
    </JarianDrawer>
  );
}
