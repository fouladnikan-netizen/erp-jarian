import { usePermissionsStore } from '../store/permissionsStore';

/**
 * Floating glass action bar — visible only while pendingChanges is non-empty.
 */
export default function PermissionsActionBar() {
  const pendingChanges = usePermissionsStore((s) => s.pendingChanges);
  const saving = usePermissionsStore((s) => s.saving);
  const discardChanges = usePermissionsStore((s) => s.discardChanges);
  const savePermissions = usePermissionsStore((s) => s.savePermissions);

  const count = Object.keys(pendingChanges).length;
  if (count === 0) return null;

  return (
    <div className="perm-action-bar" role="status" aria-live="polite">
      <p className="perm-action-bar__text font-meem">
        تغییرات دسترسی در انتظار تایید است
        <span className="perm-action-bar__count font-yekan">
          {' '}
          (
          {count.toLocaleString('fa-IR')}
          )
        </span>
      </p>
      <div className="perm-action-bar__actions">
        <button
          type="button"
          className="perm-btn perm-btn--ghost font-meem"
          disabled={saving}
          onClick={discardChanges}
        >
          لغو
        </button>
        <button
          type="button"
          className="perm-btn perm-btn--primary font-meem"
          disabled={saving}
          onClick={() => {
            void savePermissions();
          }}
        >
          {saving ? 'در حال ذخیره…' : 'ذخیره دسترسی‌ها'}
        </button>
      </div>
    </div>
  );
}
