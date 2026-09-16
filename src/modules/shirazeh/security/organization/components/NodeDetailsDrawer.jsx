import { useMemo } from 'react';
import { X } from 'lucide-react';
import {
  ORG_POSITION_SUGGESTIONS,
  ROOT_UNIT_ID,
  collectDepartmentOptions,
  countMembers,
  findNodeById,
  findParentId,
} from '../treeUtils';
import { useOrganizationStore } from '../store/organizationStore';

export default function NodeDetailsDrawer() {
  const drawerOpen = useOrganizationStore((s) => s.drawerOpen);
  const selectedNodeId = useOrganizationStore((s) => s.selectedNodeId);
  const tree = useOrganizationStore((s) => s.tree);
  const closeDrawer = useOrganizationStore((s) => s.closeDrawer);
  const updateNode = useOrganizationStore((s) => s.updateNode);
  const relocateNode = useOrganizationStore((s) => s.relocateNode);

  const node = useMemo(
    () => (selectedNodeId ? findNodeById(tree, selectedNodeId) : null),
    [tree, selectedNodeId],
  );
  const parentId = useMemo(
    () => (selectedNodeId ? findParentId(tree, selectedNodeId) : null),
    [tree, selectedNodeId],
  );
  const parent = useMemo(
    () => (parentId ? findNodeById(tree, parentId) : null),
    [tree, parentId],
  );
  const parentOptions = useMemo(
    () => collectDepartmentOptions(tree, { excludeSubtreeId: selectedNodeId }),
    [tree, selectedNodeId],
  );

  if (!drawerOpen || !node) return null;

  const isDepartment = node.type === 'department';
  const members = isDepartment ? countMembers(node) : 0;
  const isRoot = node.id === ROOT_UNIT_ID;

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
                disabled={isRoot}
                onChange={(event) => updateNode(node.id, { name: event.target.value })}
              />
            </label>
            {isRoot ? (
              <div className="org-drawer__stat">
                <span className="font-meem">واحد والد</span>
                <strong className="font-meem">ریشه سازمان</strong>
              </div>
            ) : (
              <label className="org-drawer__field font-meem">
                واحد والد
                <select
                  className="org-drawer__input font-meem"
                  value={parentId || ROOT_UNIT_ID}
                  onChange={(event) => relocateNode(node.id, event.target.value)}
                >
                  {parentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {`${'\u2003'.repeat(option.depth)}${option.name}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="org-drawer__stat">
              <span className="font-meem">تعداد اعضا</span>
              <strong className="font-yekan">{members.toLocaleString('fa-IR')}</strong>
            </div>
            <p className="org-drawer__hint font-meem">
              برای ساخت زیرمجموعه، همین واحد را انتخاب کنید و «ایجاد واحد سازمانی» را بزنید،
              یا از دکمه واحد روی کارت استفاده کنید. سمت سازمانی با نقش سیستمی یکی نیست.
            </p>
          </>
        ) : (
          <>
            <div className="org-drawer__stat">
              <span className="font-meem">نام</span>
              <strong className="font-meem">{node.name}</strong>
            </div>
            <div className="org-drawer__stat">
              <span className="font-meem">موبایل سازمانی</span>
              <strong className="font-yekan" dir="ltr">{node.mobile || '—'}</strong>
            </div>
            <label className="org-drawer__field font-meem">
              سمت سازمانی (Position)
              <input
                className="org-drawer__input font-meem"
                list="org-position-suggestions-drawer"
                value={node.position || ''}
                onChange={(event) => updateNode(node.id, { position: event.target.value })}
              />
            </label>
            <datalist id="org-position-suggestions-drawer">
              {ORG_POSITION_SUGGESTIONS.map((title) => (
                <option key={title} value={title} />
              ))}
            </datalist>
            <label className="org-drawer__check font-meem">
              <input
                type="checkbox"
                checked={node.isManager === true}
                onChange={(event) => updateNode(node.id, { isManager: event.target.checked })}
              />
              مدیر این واحد
            </label>
            <div className="org-drawer__stat">
              <span className="font-meem">واحد فعلی</span>
              <strong className="font-meem">{parent?.name || '—'}</strong>
            </div>
            <p className="org-drawer__hint font-meem">
              حذف گره فقط انتساب سازمانی را برمی‌دارد؛ حساب کاربری در فهرست کاربران باقی می‌ماند.
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
