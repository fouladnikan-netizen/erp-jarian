import OrganizationToolbar from './components/OrganizationToolbar';
import OrganizationCanvas from './components/OrganizationCanvas';
import NodeDetailsDrawer from './components/NodeDetailsDrawer';
import { useOrganizationStore } from './store/organizationStore';
import './organization.css';

function RoleReviewDialog() {
  const prompt = useOrganizationStore((s) => s.roleReviewPrompt);
  const dismissRoleReview = useOrganizationStore((s) => s.dismissRoleReview);
  const applySuggestedRole = useOrganizationStore((s) => s.applySuggestedRole);

  if (!prompt) return null;

  return (
    <div className="org-confirm" role="dialog" aria-modal="true" aria-labelledby="org-role-review-title">
      <div className="org-confirm__card">
        <h3 id="org-role-review-title" className="org-confirm__title font-meem">
          ساختار سازمانی تغییر کرد
        </h3>
        <p className="org-confirm__text font-meem">
          «{prompt.userName}» از «{prompt.fromDepartment}» به «{prompt.toDepartment}» منتقل شد.
          آیا نقش سیستم نیز بررسی شود؟
        </p>
        <p className="org-confirm__meta font-yekan">
          نقش فعلی: {prompt.currentRole || '—'}
          {prompt.suggestedRole ? ` · پیشنهاد واحد جدید: ${prompt.suggestedRole}` : ''}
        </p>
        <div className="org-confirm__actions">
          <button type="button" className="org-toolbar__btn font-meem" onClick={dismissRoleReview}>
            فقط ساختار
          </button>
          <button
            type="button"
            className="org-toolbar__btn org-toolbar__btn--primary font-meem"
            onClick={applySuggestedRole}
            disabled={!prompt.suggestedRole}
          >
            اعمال نقش پیشنهادی
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Shirazeh Security → Organization Structure Designer
 * Route: /shirazeh/security/organization
 */
export default function OrganizationStructurePage() {
  return (
    <div className="org-structure" dir="rtl">
      <OrganizationToolbar />
      <div className="org-structure__workspace">
        <OrganizationCanvas />
        <NodeDetailsDrawer />
      </div>
      <RoleReviewDialog />
    </div>
  );
}
