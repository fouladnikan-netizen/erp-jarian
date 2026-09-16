import { Building2, Save, UserPlus } from 'lucide-react';
import { findNodeById, resolveDepartmentParentId } from '../treeUtils';
import { useOrganizationStore } from '../store/organizationStore';

export default function OrganizationToolbar() {
  const dirty = useOrganizationStore((s) => s.dirty);
  const saving = useOrganizationStore((s) => s.saving);
  const loading = useOrganizationStore((s) => s.loading);
  const error = useOrganizationStore((s) => s.error);
  const tree = useOrganizationStore((s) => s.tree);
  const selectedNodeId = useOrganizationStore((s) => s.selectedNodeId);
  const addDepartment = useOrganizationStore((s) => s.addDepartment);
  const openAssignPicker = useOrganizationStore((s) => s.openAssignPicker);
  const saveChanges = useOrganizationStore((s) => s.saveChanges);

  const parentId = resolveDepartmentParentId(tree, selectedNodeId);
  const parentName = findNodeById(tree, parentId)?.name || 'سازمان';

  return (
    <div className="org-toolbar">
      <div className="org-toolbar__copy">
        <h2 className="org-toolbar__title font-meem">طراح ساختار سازمانی</h2>
        <p className="org-toolbar__subtitle font-meem">
          سلسله‌مراتب واحدها و افراد واقعی — جدا از نقش‌های سیستمی (RBAC)
        </p>
        <p className="org-toolbar__hint font-meem">
          واحد جدید زیر «{parentName}» ساخته می‌شود. ابتدا واحد والد را روی درخت انتخاب کنید.
        </p>
        {error ? <p className="org-toolbar__error font-meem">{error}</p> : null}
      </div>

      <div className="org-toolbar__actions">
        <button
          type="button"
          className="org-toolbar__btn font-meem"
          title={`ایجاد زیرمجموعه «${parentName}»`}
          onClick={() => addDepartment(parentId)}
          disabled={loading || saving}
        >
          <Building2 size={15} strokeWidth={1.75} aria-hidden="true" />
          ایجاد واحد سازمانی
        </button>
        <button
          type="button"
          className="org-toolbar__btn font-meem"
          onClick={() => openAssignPicker(selectedNodeId)}
          disabled={loading || saving}
        >
          <UserPlus size={15} strokeWidth={1.75} aria-hidden="true" />
          افزودن کاربر
        </button>
        <button
          type="button"
          className={`org-toolbar__btn org-toolbar__btn--primary font-meem${dirty ? '' : ' org-toolbar__btn--muted'}`}
          disabled={!dirty || saving || loading}
          onClick={() => {
            void saveChanges().catch(() => {});
          }}
        >
          <Save size={15} strokeWidth={1.75} aria-hidden="true" />
          {saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
        </button>
      </div>
    </div>
  );
}
