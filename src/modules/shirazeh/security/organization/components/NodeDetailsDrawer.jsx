import { useMemo } from 'react';
import { Shield, X } from 'lucide-react';
import { countMembers, findNodeById, findParentId } from '../treeUtils';
import { useOrganizationStore } from '../store/organizationStore';

export default function NodeDetailsDrawer() {
  const drawerOpen = useOrganizationStore((s) => s.drawerOpen);
  const selectedNodeId = useOrganizationStore((s) => s.selectedNodeId);
  const tree = useOrganizationStore((s) => s.tree);
  const closeDrawer = useOrganizationStore((s) => s.closeDrawer);
  const updateNode = useOrganizationStore((s) => s.updateNode);

  const node = useMemo(
    () => (selectedNodeId ? findNodeById(tree, selectedNodeId) : null),
    [tree, selectedNodeId],
  );
  const parent = useMemo(() => {
    if (!selectedNodeId) return null;
    const parentId = findParentId(tree, selectedNodeId);
    return parentId ? findNodeById(tree, parentId) : null;
  }, [tree, selectedNodeId]);

  if (!drawerOpen || !node) return null;

  const isDepartment = node.type === 'department';
  const members = isDepartment ? countMembers(node) : 0;

  return (
    <aside className="org-drawer" aria-label="جزئیات گره سازمانی">
      <header className="org-drawer__header">
        <div>
          <p className="org-drawer__eyebrow font-meem">
            {isDepartment ? 'واحد سازمانی' : 'عضو سازمان'}
          </p>
          <h3 className="org-drawer__title font-meem">{node.name}</h3>
        </div>
        <button
          type="button"
          className="org-drawer__close"
          onClick={closeDrawer}
          aria-label="بستن"
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      </header>

      <div className="org-drawer__body">
        {isDepartment ? (
          <>
            <label className="org-drawer__field font-meem">
              نام واحد
              <input
                className="org-drawer__input font-meem"
                value={node.name}
                onChange={(event) => updateNode(node.id, { name: event.target.value })}
              />
            </label>
            <div className="org-drawer__stat">
              <span className="font-meem">واحد والد</span>
              <strong className="font-meem">{parent?.name || '—'}</strong>
            </div>
            <div className="org-drawer__stat">
              <span className="font-meem">تعداد اعضا</span>
              <strong className="font-yekan">{members.toLocaleString('fa-IR')}</strong>
            </div>
            <label className="org-drawer__field font-meem">
              نقش پیش‌فرض پیشنهادی (RBAC)
              <input
                className="org-drawer__input font-yekan"
                value={node.defaultRole || ''}
                onChange={(event) => updateNode(node.id, { defaultRole: event.target.value })}
              />
            </label>
            <p className="org-drawer__hint font-meem">
              نقش پیش‌فرض فقط پیشنهاد است؛ جابه‌جایی کاربر نقش او را خودکار عوض نمی‌کند.
            </p>
          </>
        ) : (
          <>
            <label className="org-drawer__field font-meem">
              نام کامل
              <input
                className="org-drawer__input font-meem"
                value={node.name}
                onChange={(event) => updateNode(node.id, { name: event.target.value })}
              />
            </label>
            <label className="org-drawer__field font-meem">
              سمت سازمانی (Position)
              <input
                className="org-drawer__input font-meem"
                value={node.position || ''}
                onChange={(event) => updateNode(node.id, { position: event.target.value })}
              />
            </label>
            <label className="org-drawer__field font-meem">
              نقش سیستمی (Role)
              <input
                className="org-drawer__input font-yekan"
                value={node.role || ''}
                onChange={(event) => updateNode(node.id, { role: event.target.value })}
              />
            </label>
            <div className="org-drawer__stat">
              <span className="font-meem">واحد فعلی</span>
              <strong className="font-meem">{parent?.name || '—'}</strong>
            </div>
            <span className="org-drawer__link font-meem">
              <Shield size={14} strokeWidth={1.75} aria-hidden="true" />
              میانبر مجوزها (به‌زودی)
            </span>
          </>
        )}
      </div>
    </aside>
  );
}
