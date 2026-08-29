import { Edit2, Key, Lock, Unlock } from 'lucide-react';
import { formatRoleLabels, formatUserCreatedAt, formatUserStatus } from '../config/usersDisplay';
import { useUsersStore } from '../store/usersStore';

/**
 * Border-less glass data grid for system users.
 * Actions are explicit icons only — no kebab menus.
 */
export default function UsersGrid({ canManage = false }) {
  const users = useUsersStore((s) => s.users);
  const loading = useUsersStore((s) => s.loading);
  const loaded = useUsersStore((s) => s.loaded);
  const openEditModal = useUsersStore((s) => s.openEditModal);
  const toggleUserStatus = useUsersStore((s) => s.toggleUserStatus);
  const openPasswordModal = useUsersStore((s) => s.openPasswordModal);
  const saving = useUsersStore((s) => s.saving);

  return (
    <div className="shirazeh-users-grid" role="region" aria-label="فهرست کاربران">
      <div className="shirazeh-users-grid__scroll">
        <table className="shirazeh-users-table">
          <thead>
            <tr>
              <th className="font-meem">نام نمایشی</th>
              <th className="font-meem">نام کاربری</th>
              <th className="font-meem">نقش‌ها</th>
              <th className="font-meem">وضعیت</th>
              <th className="font-meem">ایجاد شده</th>
              {canManage ? <th className="font-meem">عملیات</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading && !users.length ? (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="shirazeh-users-table__empty font-meem">
                  در حال بارگذاری کاربران…
                </td>
              </tr>
            ) : null}
            {loaded && !loading && !users.length ? (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="shirazeh-users-table__empty font-meem">
                  کاربری یافت نشد.
                </td>
              </tr>
            ) : null}
            {users.map((user) => {
              const active = user.isActive !== false;
              return (
                <tr key={user.id}>
                  <td className="shirazeh-users-table__name font-meem">
                    <span>{user.displayName}</span>
                  </td>
                  <td className="font-yekan" dir="ltr">{user.username}</td>
                  <td className="font-meem">{formatRoleLabels(user.roles)}</td>
                  <td>
                    <span
                      className={`shirazeh-users-status shirazeh-users-status--${active ? 'active' : 'inactive'} font-meem`}
                    >
                      {formatUserStatus(active)}
                    </span>
                  </td>
                  <td className="font-yekan">{formatUserCreatedAt(user.createdAt)}</td>
                  {canManage ? (
                    <td>
                      <div className="shirazeh-users-actions" role="group" aria-label={`عملیات ${user.displayName}`}>
                        <button
                          type="button"
                          className="shirazeh-users-action"
                          title="ویرایش کاربر"
                          aria-label="ویرایش کاربر"
                          disabled={saving}
                          onClick={() => openEditModal(user.id)}
                        >
                          <Edit2 size={16} strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          className="shirazeh-users-action"
                          title="بازنشانی رمز عبور"
                          aria-label="بازنشانی رمز عبور"
                          disabled={saving}
                          onClick={() => openPasswordModal(user.id)}
                        >
                          <Key size={16} strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          className={`shirazeh-users-action${active ? '' : ' shirazeh-users-action--warn'}`}
                          title={active ? 'غیرفعال‌سازی حساب' : 'فعال‌سازی حساب'}
                          aria-label={active ? 'غیرفعال‌سازی حساب' : 'فعال‌سازی حساب'}
                          disabled={saving}
                          onClick={() => { void toggleUserStatus(user.id); }}
                        >
                          {active ? (
                            <Lock size={16} strokeWidth={1.75} />
                          ) : (
                            <Unlock size={16} strokeWidth={1.75} />
                          )}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
