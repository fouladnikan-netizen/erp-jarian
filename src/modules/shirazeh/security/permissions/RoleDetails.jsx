import { useState } from 'react';
import { usePermissionsStore } from '../store/permissionsStore';
import { toPersianDigits } from '../../../../utils/numberUtils';
import { countRoleAssignees } from './countRoleAssignees';
import RoleAssignees from './RoleAssignees';

export default function RoleDetails() {
  const role = usePermissionsStore((s) => s.roles.find((item) => item.code === s.selectedRoleCode));
  const roleDraft = usePermissionsStore((s) => s.roleDraft);
  const saveRole = usePermissionsStore((s) => s.saveRole);
  const savingRole = usePermissionsStore((s) => s.savingRole);
  const openEditModal = usePermissionsStore((s) => s.openEditModal);
  const usageWarning = usePermissionsStore((s) => s.usageWarning);
  const roleUsers = usePermissionsStore((s) => s.roleUsers);
  const roleUsersLoading = usePermissionsStore((s) => s.roleUsersLoading);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  if (!role) {
    return (
      <section className="role-mgmt__details">
        <p className="font-meem" style={{ color: 'var(--text-muted)' }}>نقشی انتخاب نشده است.</p>
      </section>
    );
  }

  const assigneeCounts = countRoleAssignees(roleUsers);
  const activeCount = roleUsersLoading ? (role.activeUserCount || 0) : assigneeCounts.active;
  const inUseMessage = activeCount > 0
    ? `این نقش به ${toPersianDigits(activeCount)} کاربر فعال اختصاص دارد.`
    : '';

  const handleToggleActive = async () => {
    if (roleDraft.isActive) {
      if (activeCount > 0 && !confirmDeactivate) {
        setConfirmDeactivate(true);
        return;
      }
      await saveRole({ isActive: false });
      setConfirmDeactivate(false);
      return;
    }
    await saveRole({ isActive: true });
    setConfirmDeactivate(false);
  };

  return (
    <section className="role-mgmt__details">
      <header className="role-mgmt__details-head">
        <div>
          <h3 className="role-mgmt__details-title font-meem">مشخصات نقش</h3>
          <p className="role-mgmt__code font-meem">
            کد سیستمی:
            {' '}
            <span className="font-yekan" dir="ltr">{role.code}</span>
          </p>
        </div>
        <button
          type="button"
          className="perm-btn perm-btn--ghost font-meem"
          onClick={openEditModal}
        >
          ویرایش نقش
        </button>
      </header>

      <RoleAssignees users={roleUsers} loading={roleUsersLoading} />

      {usageWarning?.message && assigneeCounts.total === 0 ? (
        <p className="role-mgmt__usage font-meem" role="status">
          {`این نقش به ${toPersianDigits(usageWarning.activeUserCount)} کاربر فعال اختصاص دارد.`}
        </p>
      ) : null}

      <div className="role-mgmt__field font-meem">
        <span>نام نقش</span>
        <p className="role-mgmt__readonly font-meem">{role.labelFa || role.code}</p>
      </div>

      <div className="role-mgmt__field font-meem">
        <span>توضیح</span>
        <p className={`role-mgmt__readonly role-mgmt__readonly--multiline font-meem${role.description ? '' : ' role-mgmt__readonly--empty'}`}>
          {role.description || 'بدون توضیح'}
        </p>
      </div>

      <div className="role-mgmt__status-row">
        <span className="font-meem">وضعیت</span>
        <button
          type="button"
          className={`perm-toggle ${roleDraft.isActive ? 'perm-toggle--on' : 'perm-toggle--off'}`}
          role="switch"
          aria-checked={roleDraft.isActive}
          aria-label="فعال بودن نقش"
          disabled={savingRole}
          onClick={() => {
            void handleToggleActive();
          }}
        >
          <span className="perm-toggle__knob" aria-hidden="true" />
        </button>
        <span className="font-meem">{roleDraft.isActive ? 'فعال' : 'غیرفعال'}</span>
      </div>

      {confirmDeactivate ? (
        <div className="role-mgmt__confirm font-meem" role="alertdialog">
          <p>
            {inUseMessage || 'این نقش غیرفعال شود؟'}
            {' '}
            کاربران فعلی نقش را از دست نمی‌دهند.
          </p>
          <div className="role-mgmt__confirm-actions">
            <button
              type="button"
              className="perm-btn perm-btn--ghost font-meem"
              onClick={() => setConfirmDeactivate(false)}
            >
              انصراف
            </button>
            <button
              type="button"
              className="perm-btn perm-btn--primary font-meem"
              disabled={savingRole}
              onClick={() => {
                void handleToggleActive();
              }}
            >
              غیرفعال‌سازی
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
