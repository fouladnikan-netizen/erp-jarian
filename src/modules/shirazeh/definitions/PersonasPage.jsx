import { useEffect, useState } from 'react';
import { Pencil, Plus, Power } from 'lucide-react';
import { PersonaRepository } from '../../../api/repositories/PersonaRepository.js';
import { useCan } from '../../../stores/useSessionStore.js';
import { PERMISSIONS } from '../../../auth/permissions.catalog.js';
import CreatePersonaDrawer from './CreatePersonaDrawer.jsx';
import EditPersonaDrawer from './EditPersonaDrawer.jsx';
import '../users/users.css';
import './definitions.css';

function formatRoleLabels(roles) {
  if (!Array.isArray(roles) || !roles.length) return '—';
  return roles.map((role) => role.labelFa || role.code).join('، ');
}

/**
 * Shirazeh → تعاریف → پرسونا.
 * Canonical: /shirazeh/definitions/personas
 * Catalog identity (DDL-42/44). Does not grant permissions.
 */
export default function PersonasPage() {
  const canManage = useCan(PERMISSIONS.USERS_ADMIN);
  const [personas, setPersonas] = useState([]);
  const [unassignedRoles, setUnassignedRoles] = useState([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [error, setError] = useState('');
  const [busyCode, setBusyCode] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const refreshUnassigned = async () => {
    const options = await PersonaRepository.listRoleOptions();
    setUnassignedRoles(
      (options || []).filter((role) => role.isActive !== false && !role.persona),
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [items, options] = await Promise.all([
          PersonaRepository.listPersonas({ includeInactive: true }),
          PersonaRepository.listRoleOptions(),
        ]);
        if (!cancelled) {
          setPersonas(items);
          setUnassignedRoles(
            (options || []).filter((role) => role.isActive !== false && !role.persona),
          );
          setRolesLoaded(true);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'بارگذاری پرسونا ناموفق بود.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const replaceRow = (saved) => {
    if (!saved) return;
    setPersonas((rows) => {
      const exists = rows.some((row) => row.code === saved.code);
      if (!exists) return [saved, ...rows];
      return rows.map((row) => (row.code === saved.code ? saved : row));
    });
    setEditing((current) => (current?.code === saved.code ? saved : current));
    refreshUnassigned().catch(() => {});
  };

  const handleToggleActive = async (item) => {
    setBusyCode(item.code);
    setError('');
    try {
      const saved = item.isActive
        ? await PersonaRepository.deactivatePersona(item.code)
        : await PersonaRepository.activatePersona(item.code);
      replaceRow(saved);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'تغییر وضعیت ناموفق بود.');
    } finally {
      setBusyCode(null);
    }
  };

  const handleCreated = async (payload) => {
    const saved = await PersonaRepository.createPersona(payload);
    replaceRow(saved);
    setCreateOpen(false);
  };

  return (
    <div className="shirazeh-defs" dir="rtl">
      <header className="shirazeh-users__header">
        <div className="shirazeh-users__titles">
          <h2 className="shirazeh-defs__title font-meem">پرسونا</h2>
          <p className="shirazeh-defs__subtitle font-meem">
            هویت کاری نقش‌ها. هر نقش حداکثر به یک هویت وصل می‌شود. پرسونا مجوز RBAC نمی‌دهد.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className="shirazeh-users-btn shirazeh-users-btn--primary shirazeh-users-btn--lg font-meem"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={17} strokeWidth={1.75} aria-hidden="true" />
            ایجاد هویت جدید
          </button>
        ) : null}
      </header>

      {error ? <div className="shirazeh-defs__alert">{error}</div> : null}

      {rolesLoaded && unassignedRoles.length ? (
        <p className="shirazeh-defs__subtitle font-meem">
          نقش‌های بدون هویت: {unassignedRoles.map((role) => role.labelFa || role.code).join('، ')}
        </p>
      ) : null}

      <table className="jarian-table shirazeh-defs__personas-table">
        <thead>
          <tr>
            <th>ردیف</th>
            <th>نام هویت</th>
            <th>حوزه</th>
            <th>نقش‌ها</th>
            <th>وضعیت</th>
            {canManage ? <th>عملیات</th> : null}
          </tr>
        </thead>
        <tbody>
          {personas.map((item, index) => (
            <tr key={item.id || item.code} className={!item.isActive ? 'shirazeh-defs__persona-row--inactive' : undefined}>
              <td>{(index + 1).toLocaleString('fa-IR')}</td>
              <td className="font-meem">{item.name}</td>
              <td className="font-meem">{item.domain || '—'}</td>
              <td className="font-meem">{formatRoleLabels(item.roles)}</td>
              <td>
                <span className={`shirazeh-defs__persona-badge ${item.isActive ? 'shirazeh-defs__persona-badge--active' : 'shirazeh-defs__persona-badge--inactive'}`}>
                  {item.isActive ? 'فعال' : 'غیرفعال'}
                </span>
              </td>
              {canManage ? (
                <td>
                  <div className="shirazeh-defs__persona-actions">
                    <button
                      type="button"
                      className="shirazeh-defs__persona-icon-btn"
                      onClick={() => setEditing(item)}
                      aria-label="ویرایش هویت"
                    >
                      <Pencil size={14} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className="shirazeh-defs__persona-icon-btn"
                      disabled={busyCode === item.code}
                      onClick={() => handleToggleActive(item)}
                      aria-label={item.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                    >
                      <Power size={14} strokeWidth={2} />
                    </button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      <CreatePersonaDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <EditPersonaDrawer
        open={Boolean(editing)}
        persona={editing}
        onClose={() => setEditing(null)}
        onSaved={replaceRow}
      />
    </div>
  );
}
