import { useCan } from '../../../stores/useSessionStore.js';
import { PERMISSIONS } from '../../../auth/permissions.catalog.js';
import './definitions.css';
import OrganizationIdentityForm from './OrganizationIdentityForm.jsx';

/**
 * Shirazeh → تعاریف → هویت سازمان.
 * Canonical: /shirazeh/definitions
 */
export default function DefinitionsPage() {
  const canManage = useCan(PERMISSIONS.USERS_ADMIN);

  return (
    <div className="shirazeh-defs" dir="rtl">
      <header className="shirazeh-defs__header">
        <h2 className="shirazeh-defs__title font-meem">هویت سازمان</h2>
        <p className="shirazeh-defs__subtitle font-meem">
          مشخصات ثبتی، ارتباطی و بانکی مالک جریان.
        </p>
      </header>

      <OrganizationIdentityForm canManage={canManage} />
    </div>
  );
}
