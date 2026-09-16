import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { JarianDrawer } from '../../../components/ui';
import { PersonaRepository } from '../../../api/repositories/PersonaRepository.js';
import '../users/users.css';

/**
 * Edit working identity — name, domain, connected Roles.
 * Code is immutable. Detach only removes the catalog link.
 */
export default function EditPersonaDrawer({ open, persona, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [roles, setRoles] = useState([]);
  const [attachCode, setAttachCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !persona) return undefined;
    setName(persona.name || '');
    setDomain(persona.domain || '');
    setAttachCode('');
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
  }, [open, persona]);

  const attachedCodes = useMemo(
    () => new Set((persona?.roles || []).map((role) => role.code)),
    [persona],
  );

  const attachable = useMemo(
    () => (roles || []).filter((role) => role.isActive !== false && !attachedCodes.has(role.code)),
    [roles, attachedCodes],
  );

  const handleSave = async (event) => {
    event.preventDefault();
    if (!persona || saving) return;
    const nextName = name.trim();
    if (!nextName) {
      setError('نام هویت الزامی است.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await PersonaRepository.updatePersona(persona.code, {
        name: nextName,
        domain: domain.trim(),
      });
      onSaved?.(saved);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'ذخیره ناموفق بود.');
    } finally {
      setSaving(false);
    }
  };

  const handleAttach = async () => {
    if (!persona || !attachCode || saving) return;
    setSaving(true);
    setError('');
    try {
      const saved = await PersonaRepository.attachRole(persona.code, attachCode);
      setAttachCode('');
      onSaved?.(saved);
      const options = await PersonaRepository.listRoleOptions();
      setRoles(options || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'اتصال نقش ناموفق بود.');
    } finally {
      setSaving(false);
    }
  };

  const handleDetach = async (roleCode) => {
    if (!persona || saving) return;
    setSaving(true);
    setError('');
    try {
      const saved = await PersonaRepository.detachRole(persona.code, roleCode);
      onSaved?.(saved);
      const options = await PersonaRepository.listRoleOptions();
      setRoles(options || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'جدا کردن نقش ناموفق بود.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <JarianDrawer
      open={open}
      onClose={onClose}
      title="ویرایش هویت"
      size="sm"
      className="shirazeh-users-drawer"
      footer={(
        <>
          <button
            type="button"
            className="shirazeh-users-btn shirazeh-users-btn--ghost font-meem"
            onClick={onClose}
          >
            بستن
          </button>
          <button
            type="submit"
            form="shirazeh-edit-persona-form"
            className="shirazeh-users-btn shirazeh-users-btn--primary font-meem"
            disabled={saving || !name.trim()}
          >
            {saving ? 'در حال ذخیره…' : 'ذخیره نام'}
          </button>
        </>
      )}
    >
      {persona ? (
        <form
          id="shirazeh-edit-persona-form"
          className="shirazeh-users-modal__form"
          onSubmit={handleSave}
        >
          <div className="shirazeh-users-modal__field">
            <label className="shirazeh-users-modal__label font-meem">کد فنی</label>
            <input
              className="shirazeh-users-modal__input font-yekan"
              value={persona.code}
              dir="ltr"
              readOnly
              disabled
            />
          </div>
          <div className="shirazeh-users-modal__field">
            <label className="shirazeh-users-modal__label font-meem" htmlFor="edit-persona-name">
              نام هویت *
            </label>
            <input
              id="edit-persona-name"
              className="shirazeh-users-modal__input font-meem"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="shirazeh-users-modal__field">
            <label className="shirazeh-users-modal__label font-meem" htmlFor="edit-persona-domain">
              حوزه
            </label>
            <input
              id="edit-persona-domain"
              className="shirazeh-users-modal__input font-meem"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
            />
          </div>

          <div className="shirazeh-users-modal__field">
            <span className="shirazeh-users-modal__label font-meem">نقش‌های متصل</span>
            {(persona.roles || []).length ? (
              <ul className="shirazeh-defs__persona-role-list">
                {(persona.roles || []).map((role) => (
                  <li key={role.code} className="shirazeh-defs__persona-role-item font-meem">
                    <span>{role.labelFa || role.code}</span>
                    <button
                      type="button"
                      className="shirazeh-defs__persona-icon-btn"
                      onClick={() => handleDetach(role.code)}
                      disabled={saving}
                      aria-label={`جدا کردن ${role.labelFa || role.code}`}
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="shirazeh-users-modal__hint font-meem">هنوز نقشی به این هویت وصل نشده است.</p>
            )}
          </div>

          <div className="shirazeh-users-modal__field">
            <label className="shirazeh-users-modal__label font-meem" htmlFor="edit-persona-attach">
              اتصال نقش فعال
            </label>
            <div className="shirazeh-defs__persona-attach">
              <select
                id="edit-persona-attach"
                className="shirazeh-users-modal__input font-meem"
                value={attachCode}
                onChange={(event) => setAttachCode(event.target.value)}
              >
                <option value="">انتخاب نقش فعال</option>
                {attachable.map((role) => {
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
              <button
                type="button"
                className="shirazeh-users-btn shirazeh-users-btn--ghost font-meem"
                onClick={handleAttach}
                disabled={!attachCode || saving}
              >
                اتصال
              </button>
            </div>
          </div>

          {error ? (
            <p className="shirazeh-users-banner shirazeh-users-banner--error font-meem" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </JarianDrawer>
  );
}
