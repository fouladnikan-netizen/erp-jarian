import { Edit2, Key, Lock, Unlock } from 'lucide-react';
import { getRoleLabel } from '../config/usersRoles';
import { useUsersStore } from '../store/usersStore';

/**
 * Border-less glass data grid for system users.
 * Actions are explicit icons only — no kebab menus.
 */
export default function UsersGrid() {
  const users = useUsersStore((s) => s.users);
  const openEditModal = useUsersStore((s) => s.openEditModal);
  const toggleUserStatus = useUsersStore((s) => s.toggleUserStatus);
  const forcePasswordChange = useUsersStore((s) => s.forcePasswordChange);

  return (
    <div className="shirazeh-users-grid" role="region" aria-label="فهرست کاربران">
      <div className="shirazeh-users-grid__scroll">
        <table className="shirazeh-users-table">
          <thead>
            <tr>
              <th className="font-meem">نام</th>
              <th className="font-meem">موبایل</th>
              <th className="font-meem">نقش</th>
              <th className="font-meem">آخرین ورود</th>
              <th className="font-meem">وضعیت</th>
              <th className="font-meem">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const active = user.status === 'active';
              return (
                <tr key={user.id}>
                  <td className="shirazeh-users-table__name font-meem">
                    <span>{user.fullName}</span>
                    {user.forcePasswordChange ? (
                      <span className="shirazeh-users-table__hint font-meem">
                        تغییر رمز در ورود بعدی
                      </span>
                    ) : null}
                  </td>
                  <td className="font-yekan" dir="ltr">{user.mobile}</td>
                  <td className="font-meem">{getRoleLabel(user.roleId)}</td>
                  <td className="font-yekan">{user.lastLoginLabel}</td>
                  <td>
                    <span
                      className={`shirazeh-users-status shirazeh-users-status--${active ? 'active' : 'inactive'} font-meem`}
                    >
                      {active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td>
                    <div className="shirazeh-users-actions" role="group" aria-label={`عملیات ${user.fullName}`}>
                      <button
                        type="button"
                        className="shirazeh-users-action"
                        title="ویرایش کاربر"
                        aria-label="ویرایش کاربر"
                        onClick={() => openEditModal(user.id)}
                      >
                        <Edit2 size={16} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        className="shirazeh-users-action"
                        title="اجبار تغییر رمز در ورود بعدی"
                        aria-label="اجبار تغییر رمز در ورود بعدی"
                        onClick={() => forcePasswordChange(user.id)}
                      >
                        <Key size={16} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        className={`shirazeh-users-action${active ? '' : ' shirazeh-users-action--warn'}`}
                        title={active ? 'غیرفعال‌سازی حساب' : 'فعال‌سازی حساب'}
                        aria-label={active ? 'غیرفعال‌سازی حساب' : 'فعال‌سازی حساب'}
                        onClick={() => toggleUserStatus(user.id)}
                      >
                        {active ? (
                          <Lock size={16} strokeWidth={1.75} />
                        ) : (
                          <Unlock size={16} strokeWidth={1.75} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
