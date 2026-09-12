import { useEffect } from 'react';
import RoleManager from './RoleManager';
import { usePermissionsStore } from '../store/permissionsStore';
import { useCan } from '../../../../stores/useSessionStore.js';
import { PERMISSIONS } from '../../../../auth/permissions.catalog.js';
import { getAuthPermissions } from '../../../auth/authSession';
import '../../users/users.css';

/**
 * Shirazeh → تعاریف → نقش‌ها و دسترسی‌ها
 * Canonical: /shirazeh/definitions/roles-permissions
 * Matrix reads/writes PostgreSQL role_permissions.
 */
export default function PermissionsPage() {
  const canManage = useCan(PERMISSIONS.USERS_ADMIN);
  const loadCatalog = usePermissionsStore((s) => s.loadCatalog);
  const loading = usePermissionsStore((s) => s.loading);
  const error = usePermissionsStore((s) => s.error);
  const errorCode = usePermissionsStore((s) => s.errorCode);
  const clearError = usePermissionsStore((s) => s.clearError);
  const backendPerms = getAuthPermissions();

  useEffect(() => {
    if (!canManage) return;
    void loadCatalog().catch(() => {});
  }, [canManage, loadCatalog]);

  return (
    <div>
      <header className="shirazeh-users__header">
        <div className="shirazeh-users__titles">
          <h2 className="shirazeh-users__title font-meem">نقش‌ها و دسترسی‌ها</h2>
          <p className="shirazeh-users__subtitle font-meem">
            دسترسی نقش‌ها از سامانه خوانده می‌شود و پس از ذخیره در همان نقش اعمال می‌گردد
            (
            {backendPerms.length
              ? `${backendPerms.length} دسترسی فعال در نشست فعلی`
              : 'نشست بدون دسترسی'}
            ).
          </p>
        </div>
      </header>

      {!canManage ? (
        <p className="shirazeh-users-readonly font-meem">
          برای مشاهده و ویرایش ماتریس دسترسی به مجوز مدیریت کاربران نیاز است.
        </p>
      ) : null}

      {error ? (
        <div className="shirazeh-users-banner shirazeh-users-banner--error font-meem" role="alert">
          <span>{error}</span>
          {errorCode ? (
            <span className="shirazeh-users-banner__code">{errorCode}</span>
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

      {canManage && loading ? (
        <p className="font-meem" style={{ color: 'var(--text-muted)' }}>در حال بارگذاری نقش‌ها…</p>
      ) : null}

      {canManage && !loading ? <RoleManager /> : null}
    </div>
  );
}
