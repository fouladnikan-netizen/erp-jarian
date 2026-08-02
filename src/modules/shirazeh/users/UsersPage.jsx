import { UserPlus } from 'lucide-react';
import { useUsersStore } from './store/usersStore';
import UsersGrid from './components/UsersGrid';
import AddUserModal from './components/AddUserModal';
import './users.css';

/**
 * Shirazeh → Users section (Outlet child for /shirazeh/users).
 */
export default function UsersPage() {
  const openAddModal = useUsersStore((s) => s.openAddModal);

  return (
    <div className="shirazeh-users" dir="rtl">
      <header className="shirazeh-users__header">
        <div className="shirazeh-users__titles">
          <h2 className="shirazeh-users__title font-meem">کاربران سیستم</h2>
          <p className="shirazeh-users__subtitle font-meem">
            مدیریت حساب‌ها، نقش‌ها و وضعیت دسترسی کاربران
          </p>
        </div>
        <button
          type="button"
          className="shirazeh-users-btn shirazeh-users-btn--primary shirazeh-users-btn--lg font-meem"
          onClick={() => openAddModal()}
        >
          <UserPlus size={17} strokeWidth={1.75} aria-hidden="true" />
          افزودن کاربر جدید
        </button>
      </header>

      <UsersGrid />
      <AddUserModal />
    </div>
  );
}
