import { Plus } from 'lucide-react';
import { usePermissionsStore } from '../store/permissionsStore';
import { toPersianDigits } from '../../../../utils/numberUtils';

export default function RoleList() {
  const roles = usePermissionsStore((s) => s.roles);
  const selectedRoleCode = usePermissionsStore((s) => s.selectedRoleCode);
  const selectRole = usePermissionsStore((s) => s.selectRole);
  const openCreateModal = usePermissionsStore((s) => s.openCreateModal);

  return (
    <aside className="role-mgmt__list" aria-label="فهرست نقش‌ها">
      <div className="role-mgmt__list-head">
        <h3 className="role-mgmt__list-title font-meem">نقش‌ها</h3>
        <button
          type="button"
          className="perm-btn perm-btn--primary font-meem"
          onClick={openCreateModal}
        >
          <Plus size={15} strokeWidth={2} aria-hidden="true" />
          نقش جدید
        </button>
      </div>
      <ul className="role-mgmt__items">
        {roles.map((role) => {
          const active = role.isActive !== false;
          const selected = role.code === selectedRoleCode;
          return (
            <li key={role.code}>
              <button
                type="button"
                className={`role-mgmt__item${selected ? ' role-mgmt__item--selected' : ''}`}
                onClick={() => selectRole(role.code)}
              >
                <span className="role-mgmt__item-name font-meem">{role.labelFa || role.code}</span>
                <span className="role-mgmt__item-meta font-yekan">
                  <span
                    className={`shirazeh-users-status ${active ? 'shirazeh-users-status--active' : 'shirazeh-users-status--inactive'}`}
                  >
                    {active ? 'فعال' : 'غیرفعال'}
                  </span>
                  <span>
                    {toPersianDigits(role.activeUserCount || 0)}
                    {' '}
                    کاربر
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
