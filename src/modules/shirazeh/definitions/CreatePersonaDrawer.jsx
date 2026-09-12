import { useEffect, useMemo, useState } from 'react';
import { JarianDrawer } from '../../../components/ui';
import { PersonaRepository } from '../../../api/repositories/PersonaRepository.js';
import '../users/users.css';

/**
 * Create working identity — left drawer.
 * Code is allocated by the backend (`persona_N`); the user names it and picks a Role.
 */
export default function CreatePersonaDrawer({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [roles, setRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    setName('');
    setRoleCode('');
    setError('');
    let cancelled = false;
    PersonaRepository.listRoleOptions()
      .then((items) => {
        if (!cancelled) setRoles(items || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'بارگذاری نقش‌ها ناموفق بود.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const activeRoles = useMemo(
    () => (roles || []).filter((role) => role.isActive !== false),
    [roles],
  );

  const canSubmit = Boolean(name.trim() && roleCode && !saving);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      await onCreated({ name: name.trim(), roleCode });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'ایجاد هویت ناموفق بود.');
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  return (
    <JarianDrawer
      open={open}
      onClose={onClose}
      title="ایجاد هویت جدید"
      size="sm"
      className="shirazeh-users-drawer"
      footer={(
        <>
          <button
            type="button"
            className="shirazeh-users-btn shirazeh-users-btn--ghost font-meem"
            onClick={onClose}
          >
            انصراف
          </button>
          <button
            type="submit"
            form="shirazeh-create-persona-form"
            className="shirazeh-users-btn shirazeh-users-btn--primary font-meem"
            disabled={!canSubmit}
          >
            {saving ? 'در حال ایجاد…' : 'ثبت هویت'}
          </button>
        </>
      )}
    >
      <form
        id="shirazeh-create-persona-form"
        className="shirazeh-users-modal__form"
        onSubmit={handleSubmit}
      >
        <p className="shirazeh-users-modal__hint font-meem">
          کد هویت پس از ثبت توسط سیستم ساخته می‌شود. هر نقش فقط به یک هویت وصل می‌شود.
        </p>
        <div className="shirazeh-users-modal__field">
          <label className="shirazeh-users-modal__label font-meem" htmlFor="persona-name">
            نام هویت *
          </label>
          <input
            id="persona-name"
            className="shirazeh-users-modal__input font-meem"
            required
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="shirazeh-users-modal__field">
          <label className="shirazeh-users-modal__label font-meem" htmlFor="persona-role">
            نقش *
          </label>
          <select
            id="persona-role"
            className="shirazeh-users-modal__input font-meem"
            required
            value={roleCode}
            onChange={(event) => setRoleCode(event.target.value)}
          >
            <option value="">انتخاب نقش</option>
            {activeRoles.map((role) => {
              const taken = Boolean(role.persona);
              return (
                <option key={role.code} value={role.code} disabled={taken}>
                  {taken
                    ? `${role.labelFa || role.code} — دارای هویت: ${role.persona.name}`
                    : (role.labelFa || role.code)}
                </option>
              );
            })}
          </select>
        </div>
        {activeRoles.length > 0 && activeRoles.every((role) => role.persona) ? (
          <p className="shirazeh-users-modal__hint font-meem">
            نقشی بدون هویت باقی نمانده است.
          </p>
        ) : null}
        {error ? (
          <p className="shirazeh-users-banner shirazeh-users-banner--error font-meem" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </JarianDrawer>
  );
}
