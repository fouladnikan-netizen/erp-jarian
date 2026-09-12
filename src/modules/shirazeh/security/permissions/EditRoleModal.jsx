import { usePermissionsStore } from '../store/permissionsStore';
import { roleCreateBlockReason } from './roleCode';
import { JarianDrawer } from '../../../../components/ui';
import '../../users/users.css';
import './permissions.css';

/**
 * Edit role name/description — left-side drawer, not inline on the matrix page.
 */
export default function EditRoleModal() {
  const open = usePermissionsStore((s) => s.editModalOpen);
  const form = usePermissionsStore((s) => s.editForm);
  const savingRole = usePermissionsStore((s) => s.savingRole);
  const setEditFormField = usePermissionsStore((s) => s.setEditFormField);
  const closeEditModal = usePermissionsStore((s) => s.closeEditModal);
  const saveRoleProfile = usePermissionsStore((s) => s.saveRoleProfile);
  const error = usePermissionsStore((s) => s.error);
  const errorCode = usePermissionsStore((s) => s.errorCode);

  const canSubmit = Boolean(String(form.labelFa || '').trim()) && !savingRole;
  const blockReason = roleCreateBlockReason(form.labelFa);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    await saveRoleProfile();
  };

  return (
    <JarianDrawer
      open={open}
      onClose={closeEditModal}
      title="ویرایش نقش"
      size="sm"
      className="shirazeh-role-drawer"
      footer={(
        <>
          <button
            type="button"
            className="perm-btn perm-btn--ghost font-meem"
            onClick={closeEditModal}
          >
            انصراف
          </button>
          <button
            type="submit"
            form="shirazeh-edit-role-form"
            className="perm-btn perm-btn--primary font-meem"
            disabled={!canSubmit}
          >
            {savingRole ? 'در حال ذخیره…' : 'ذخیره'}
          </button>
        </>
      )}
    >
      <form
        id="shirazeh-edit-role-form"
        className="shirazeh-users-modal__form"
        onSubmit={handleSubmit}
      >
        <div className="shirazeh-users-modal__field">
          <label className="shirazeh-users-modal__label font-meem" htmlFor="edit-role-label">
            نام نقش *
          </label>
          <input
            id="edit-role-label"
            className="shirazeh-users-modal__input font-meem"
            required
            autoFocus
            value={form.labelFa}
            onChange={(event) => setEditFormField('labelFa', event.target.value)}
          />
        </div>
        <div className="shirazeh-users-modal__field">
          <label className="shirazeh-users-modal__label font-meem" htmlFor="edit-role-description">
            توضیح
          </label>
          <textarea
            id="edit-role-description"
            className="shirazeh-users-modal__input font-meem"
            rows={4}
            value={form.description}
            onChange={(event) => setEditFormField('description', event.target.value)}
          />
        </div>
        {blockReason ? (
          <p className="shirazeh-users-modal__hint shirazeh-users-modal__hint--warn font-meem" role="status">
            {blockReason}
          </p>
        ) : null}
        {errorCode === 'ROLE_NAME_ALREADY_EXISTS' && error ? (
          <p className="shirazeh-users-modal__hint shirazeh-users-modal__hint--warn font-meem" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </JarianDrawer>
  );
}
