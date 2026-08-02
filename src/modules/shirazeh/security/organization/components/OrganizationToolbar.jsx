import { Building2, Save, UserPlus } from 'lucide-react';
import { useOrganizationStore } from '../store/organizationStore';

export default function OrganizationToolbar() {
  const dirty = useOrganizationStore((s) => s.dirty);
  const selectedNodeId = useOrganizationStore((s) => s.selectedNodeId);
  const addDepartment = useOrganizationStore((s) => s.addDepartment);
  const addUser = useOrganizationStore((s) => s.addUser);
  const saveChanges = useOrganizationStore((s) => s.saveChanges);

  return (
    <div className="org-toolbar">
      <div className="org-toolbar__copy">
        <h2 className="org-toolbar__title font-meem">طراح ساختار سازمانی</h2>
        <p className="org-toolbar__subtitle font-meem">
          سلسله‌مراتب واحدها و افراد — جدا از نقش‌های سیستمی (RBAC)
        </p>
      </div>

      <div className="org-toolbar__actions">
        <button
          type="button"
          className="org-toolbar__btn font-meem"
          onClick={() => addDepartment(selectedNodeId)}
        >
          <Building2 size={15} strokeWidth={1.75} aria-hidden="true" />
          ایجاد واحد سازمانی
        </button>
        <button
          type="button"
          className="org-toolbar__btn font-meem"
          onClick={() => addUser(selectedNodeId)}
        >
          <UserPlus size={15} strokeWidth={1.75} aria-hidden="true" />
          افزودن کاربر
        </button>
        <button
          type="button"
          className={`org-toolbar__btn org-toolbar__btn--primary font-meem${dirty ? '' : ' org-toolbar__btn--muted'}`}
          disabled={!dirty}
          onClick={() => {
            void saveChanges();
          }}
        >
          <Save size={15} strokeWidth={1.75} aria-hidden="true" />
          ذخیره تغییرات
        </button>
      </div>
    </div>
  );
}
