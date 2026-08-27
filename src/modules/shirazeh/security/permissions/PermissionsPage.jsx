import PermissionMatrix from './PermissionMatrix';
import { getAuthPermissions } from '../../../auth/authSession';
import { PERMISSIONS } from '../../../../auth/permissions.catalog.js';

/**
 * Route page: /shirazeh/security/permissions
 * Matrix UI is design/admin; live ops grants come from Backend session.
 */
export default function PermissionsPage() {
  const backendPerms = getAuthPermissions();
  return (
    <div>
      <p className="font-meem" style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
        ماتریس زیر برای طراحی نقش‌هاست. مجوز عملیاتی فعلی از Backend خوانده می‌شود
        (
        {backendPerms.length
          ? `${backendPerms.length} permission فعال در نشست`
          : 'نشست بدون permission'}
        ).
        {' '}
        مثال: ایجاد سفارش نیازمند
        {' '}
        <code>{PERMISSIONS.ORDERS_WRITE}</code>
        است.
      </p>
      <PermissionMatrix />
    </div>
  );
}
