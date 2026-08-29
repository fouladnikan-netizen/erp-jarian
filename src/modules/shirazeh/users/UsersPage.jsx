import { useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { useUsersStore } from './store/usersStore';
import { useCan } from '../../../stores/useSessionStore.js';
import { PERMISSIONS } from '../../../auth/permissions.catalog.js';
import { countActiveUsers } from './config/usersDisplay';
import { toPersianDigits } from '../../../utils/numberUtils';
import UsersGrid from './components/UsersGrid';
import AddUserModal from './components/AddUserModal';
import PasswordResetModal from './components/PasswordResetModal';
import './users.css';

/**
 * Shirazeh → Users section (Outlet child for /shirazeh/users).
 * Canonical backend users table — no local/mock user records.
 */
export default function UsersPage() {
  const canManage = useCan(PERMISSIONS.USERS_ADMIN);
  const openAddModal = useUsersStore((s) => s.openAddModal);
  const loadUsers = useUsersStore((s) => s.loadUsers);
  const loadRoles = useUsersStore((s) => s.loadRoles);
  const users = useUsersStore((s) => s.users);
  const loading = useUsersStore((s) => s.loading);
  const error = useUsersStore((s) => s.error);
  const errorCode = useUsersStore((s) => s.errorCode);
  const clearError = useUsersStore((s) => s.clearError);

  useEffect(() => {
    void loadUsers().catch(() => {});
    void loadRoles().catch(() => {});
  }, [loadUsers, loadRoles]);

  const activeCount = countActiveUsers(users);

  return (
    <div className="shirazeh-users" dir="rtl">
      <header className="shirazeh-users__header">
        <div className="shirazeh-users__titles">
          <h2 className="shirazeh-users__title font-meem">کاربران سیستم</h2>
          <p className="shirazeh-users__subtitle font-meem">
            مدیریت حساب‌ها، نقش‌ها و وضعیت دسترسی کاربران
            {!loading ? (
              <span className="shirazeh-users__kpi font-yekan">
                {' '}
                — {toPersianDigits(activeCount)} کاربر فعال
              </span>
            ) : null}
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className="shirazeh-users-btn shirazeh-users-btn--primary shirazeh-users-btn--lg font-meem"
            onClick={() => openAddModal()}
          >
            <UserPlus size={17} strokeWidth={1.75} aria-hidden="true" />
            افزودن کاربر جدید
          </button>
        ) : null}
      </header>

      {error ? (
        <div className="shirazeh-users-banner shirazeh-users-banner--error font-meem" role="alert">
          <span>{error}</span>
          {errorCode === 'LAST_ACTIVE_ADMIN_REQUIRED' ? (
            <span className="shirazeh-users-banner__code">LAST_ACTIVE_ADMIN_REQUIRED</span>
          ) : null}
          <button
            type="button"
            className="shirazeh-users-banner__dismiss"
            onClick={() => clearError()}
          >
            بستن
          </button>
        </div>
      ) : null}

      {!canManage ? (
        <p className="shirazeh-users-readonly font-meem">
          برای ایجاد یا ویرایش کاربران به مجوز مدیریت کاربران نیاز است.
        </p>
      ) : null}

      <UsersGrid canManage={canManage} />
      <AddUserModal />
      <PasswordResetModal />
    </div>
  );
}
