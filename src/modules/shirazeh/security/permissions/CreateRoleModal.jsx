import { usePermissionsStore } from '../store/permissionsStore';
import { roleCreateBlockReason } from './roleCode';
import { JarianDrawer } from '../../../../components/ui';
import '../../users/users.css';
import './permissions.css';

/**
 * Create role — left-side drawer (Jarian global overlay).
 * Role code is allocated by the backend (`role_N`); the user only names the role.
 */
export default function CreateRoleModal() {
  const open = usePermissionsStore((s) => s.createModalOpen);
  const form = usePermissionsStore((s) => s.createForm);
  const savingRole = usePermissionsStore((s) => s.savingRole);
  const setCreateFormField = usePermissionsStore((s) => s.setCreateFormField);
  const closeCreateModal = usePermissionsStore((s) => s.closeCreateModal);
  const createRole = usePermissionsStore((s) => s.createRole);

  const canSubmit = Boolean(String(form.labelFa || '').trim()) && !savingRole;
  const blockReason = roleCreateBlockReason(form.labelFa);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    await createRole();
  };

  return (
    <JarianDrawer
      open={open}
      onClose={closeCreateModal}
      title="نقش جدید"
      size="sm"
      className="shirazeh-role-drawer"
      footer={(
        <>
          <button
            type="button"
            className="perm-btn perm-btn--ghost font-meem"
            onClick={closeCreateModal}
          >
            انصراف
          </button>
          <button
            type="submit"
            form="shirazeh-create-role-form"
            className="perm-btn perm-btn--primary font-meem"
            disabled={!canSubmit}
          >
            {savingRole ? 'در حال ایجاد…' : 'ایجاد نقش'}
          </button>
        </>
      )}
    >
      <form
        id="shirazeh-create-role-form"
        className="shirazeh-users-modal__form"
        onSubmit={handleSubmit}
      >
        <div className="shirazeh-users-modal__field">
          <label className="shirazeh-users-modal__label font-meem" htmlFor="role-label">
            نام نقش *
          </label>
          <input
            id="role-label"
            className="shirazeh-users-modal__input font-meem"
            required
            autoFocus
            value={form.labelFa}
            onChange={(event) => setCreateFormField('labelFa', event.target.value)}
          />
        </div>
        <div className="shirazeh-users-modal__field">
          <label className="shirazeh-users-modal__label font-meem" htmlFor="role-description">
            توضیح
          </label>
          <textarea
            id="role-description"
            className="shirazeh-users-modal__input font-meem"
            rows={3}
            value={form.description}
            onChange={(event) => setCreateFormField('description', event.target.value)}
          />
        </div>
        {blockReason ? (
          <p className="shirazeh-users-modal__hint shirazeh-users-modal__hint--warn font-meem" role="status">
            {blockReason}
          </p>
        ) : null}
      </form>
    </JarianDrawer>
  );
}
