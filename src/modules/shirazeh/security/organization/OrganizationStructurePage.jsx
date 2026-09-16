import { useEffect } from 'react';
import OrganizationToolbar from './components/OrganizationToolbar';
import OrganizationCanvas from './components/OrganizationCanvas';
import NodeDetailsDrawer from './components/NodeDetailsDrawer';
import AssignUserDialog from './components/AssignUserDialog';
import { useOrganizationStore } from './store/organizationStore';
import './organization.css';

function MoveNoticeDialog() {
  const notice = useOrganizationStore((s) => s.moveNotice);
  const dismissMoveNotice = useOrganizationStore((s) => s.dismissMoveNotice);

  if (!notice) return null;

  return (
    <div className="org-confirm" role="dialog" aria-modal="true" aria-labelledby="org-move-title">
      <div className="org-confirm__card">
        <h3 id="org-move-title" className="org-confirm__title font-meem">
          ساختار سازمانی تغییر کرد
        </h3>
        <p className="org-confirm__text font-meem">
          «{notice.userName}» از «{notice.fromDepartment}» به «{notice.toDepartment}» منتقل شد.
          نقش سیستمی تغییر نمی‌کند.
        </p>
        <div className="org-confirm__actions">
          <button type="button" className="org-toolbar__btn org-toolbar__btn--primary font-meem" onClick={dismissMoveNotice}>
            متوجه شدم
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Shirazeh → تعاریف → ساختار سازمانی
 * Canonical: /shirazeh/definitions/organization
 */
export default function OrganizationStructurePage() {
  const loadTree = useOrganizationStore((s) => s.loadTree);

  useEffect(() => {
    void loadTree().catch(() => {});
  }, [loadTree]);

  return (
    <div className="org-structure" dir="rtl">
      <OrganizationToolbar />
      <div className="org-structure__workspace">
        <OrganizationCanvas />
        <NodeDetailsDrawer />
      </div>
      <AssignUserDialog />
      <MoveNoticeDialog />
    </div>
  );
}
