import { Edit2, Key, Lock, Mail, Unlock } from 'lucide-react';
import { formatRoleLabels, formatUserStatus, userStatusTone } from '../config/usersDisplay';
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
  const resendInvitation = useUsersStore((s) => s.resendInvitation);
  const saving = useUsersStore((s) => s.saving);
  const colSpan = canManage ? 5 : 4;

  return (
    <div className="shirazeh-users-grid" role="region" aria-label="فهرست کاربران">
      <div className="shirazeh-users-grid__scroll">
        <table className="shirazeh-users-table">
          <thead>
            <tr>
              <th className="font-meem">کاربر</th>
              <th className="font-meem">واحد سازمانی</th>
              <th className="font-meem">نقش</th>
              <th className="font-meem">وضعیت</th>
              {canManage ? <th className="font-meem">عملیات</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading && !users.length ? (
              <tr>
                <td colSpan={colSpan} className="shirazeh-users-table__empty font-meem">
                  در حال بارگذاری کاربران…
                </td>
              </tr>
            ) : null}
            {loaded && !loading && !users.length ? (
              <tr>
                <td colSpan={colSpan} className="shirazeh-users-table__empty font-meem">
                  کاربری یافت نشد.
                </td>
              </tr>
            ) : null}
            {users.map((user) => {
              const status = user.status || (user.isActive === false ? 'INACTIVE' : 'ACTIVE');
              const tone = userStatusTone(status);
              return (
                <tr key={user.id}>
                  <td className="shirazeh-users-table__name font-meem">
                    <span>{user.fullName || user.displayName}</span>
                    {user.mobile ? (
                      <span className="shirazeh-users-table__mobile font-yekan" dir="ltr">
                        {user.mobile}
                      </span>
                    ) : null}
                  </td>
                  <td className="font-meem">{user.organization?.unitName || '—'}</td>
                  <td className="font-meem">{formatRoleLabels(user.roles)}</td>
                  <td>
                    <span
                      className={`shirazeh-users-status shirazeh-users-status--${tone} font-meem`}
                    >
                      {formatUserStatus(status)}
                    </span>
                  </td>
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
                        {status === 'INVITED' ? (
                          <button
                            type="button"
                            className="shirazeh-users-action"
                            title="ارسال مجدد دعوتنامه"
                            aria-label="ارسال مجدد دعوتنامه"
                            disabled={saving}
                            onClick={() => { void resendInvitation(user.id); }}
                          >
                            <Mail size={16} strokeWidth={1.75} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={`shirazeh-users-action${status !== 'INACTIVE' ? '' : ' shirazeh-users-action--warn'}`}
                          title={status !== 'INACTIVE' ? 'غیرفعال‌سازی حساب' : 'فعال‌سازی حساب'}
                          aria-label={status !== 'INACTIVE' ? 'غیرفعال‌سازی حساب' : 'فعال‌سازی حساب'}
                          disabled={saving}
                          onClick={() => { void toggleUserStatus(user.id); }}
                        >
                          {status !== 'INACTIVE' ? (
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
