import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Radio,
} from 'lucide-react';
import {
  PERMISSION_SCOPES,
  PERMISSIONS_REGISTRY,
  SECURITY_ROLES,
} from '../config/permissionsRegistry';
import { usePermissionsStore } from '../store/permissionsStore';
import PermissionsActionBar from './PermissionsActionBar';
import './permissions.css';

const MODULE_ICONS = {
  Activity,
  Radio,
};

/** Stable fallback — never allocate a new object inside a Zustand selector. */
const DEFAULT_GRANT = Object.freeze({ enabled: false, scope: 'OWN' });

function GlassToggle({ checked, onChange, id, critical = false }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      className={[
        'perm-toggle',
        checked ? 'perm-toggle--on' : 'perm-toggle--off',
        critical ? 'perm-toggle--critical' : '',
      ].filter(Boolean).join(' ')}
      onClick={onChange}
    >
      <span className="perm-toggle__knob" aria-hidden="true" />
    </button>
  );
}

function ActionRow({ action }) {
  const grant = usePermissionsStore((s) => {
    if (Object.prototype.hasOwnProperty.call(s.pendingChanges, action.id)) {
      return s.pendingChanges[action.id];
    }
    return s.rolePermissions[s.selectedRoleId]?.[action.id] ?? DEFAULT_GRANT;
  });
  const togglePermission = usePermissionsStore((s) => s.togglePermission);
  const setScope = usePermissionsStore((s) => s.setScope);
  const isPending = usePermissionsStore((s) =>
    Object.prototype.hasOwnProperty.call(s.pendingChanges, action.id));

  const isFinancial = action.type === 'financial' || action.isCritical;

  return (
    <div
      className={[
        'perm-action-row',
        isFinancial ? 'perm-action-row--financial' : '',
        isPending ? 'perm-action-row--pending' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="perm-action-row__label-wrap">
        {isFinancial ? (
          <AlertTriangle
            className="perm-action-row__warn"
            size={14}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        ) : null}
        <div>
          <p
            className={[
              'perm-action-row__label font-meem',
              isFinancial ? 'perm-action-row__label--financial' : '',
            ].filter(Boolean).join(' ')}
          >
            {action.label}
          </p>
          <p className="perm-action-row__type font-yekan">
            {action.type}
            {action.id ? ` · ${action.id}` : ''}
          </p>
        </div>
      </div>

      <div className="perm-action-row__controls">
        {action.hasScope ? (
          <select
            className="perm-scope font-meem"
            value={grant.scope || 'OWN'}
            disabled={!grant.enabled}
            aria-label={`دامنه ${action.label}`}
            onChange={(event) => setScope(action.id, event.target.value)}
          >
            {PERMISSION_SCOPES.map((scope) => (
              <option key={scope.id} value={scope.id}>
                {scope.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="perm-scope perm-scope--spacer" aria-hidden="true" />
        )}

        <GlassToggle
          id={`perm-toggle-${action.id}`}
          checked={Boolean(grant.enabled)}
          critical={isFinancial}
          onChange={() => togglePermission(action.id)}
        />
      </div>
    </div>
  );
}

function ModuleCard({ module }) {
  const expandedModuleId = usePermissionsStore((s) => s.expandedModuleId);
  const toggleModule = usePermissionsStore((s) => s.toggleModule);
  const expanded = expandedModuleId === module.moduleId;
  const Icon = MODULE_ICONS[module.icon] || Activity;
  const resourceCount = module.resources.length;
  const actionCount = module.resources.reduce(
    (sum, resource) => sum + resource.actions.length,
    0,
  );

  return (
    <div className={`perm-module${expanded ? ' perm-module--expanded' : ''}`}>
      <button
        type="button"
        className="perm-module__hit"
        aria-expanded={expanded}
        onClick={() => toggleModule(module.moduleId)}
      >
        <span className="perm-module__icon" aria-hidden="true">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <span className="perm-module__copy">
          <span className="perm-module__name font-meem">{module.moduleName}</span>
          <span className="perm-module__meta font-yekan">
            {resourceCount.toLocaleString('fa-IR')}
            {' '}
            منبع ·
            {' '}
            {actionCount.toLocaleString('fa-IR')}
            {' '}
            دسترسی
          </span>
        </span>
        <ChevronDown
          className={`perm-module__chevron${expanded ? ' perm-module__chevron--open' : ''}`}
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </button>

      <div
        className={`perm-module__panel${expanded ? ' perm-module__panel--open' : ''}`}
        aria-hidden={!expanded}
      >
        <div className="perm-module__panel-inner">
          {module.resources.map((resource) => (
            <section key={resource.resourceId} className="perm-resource">
              <h4 className="perm-resource__title font-meem">{resource.resourceName}</h4>
              <div className="perm-resource__actions">
                {resource.actions.map((action) => (
                  <ActionRow key={action.id} action={action} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Progressive-disclosure Permission Matrix with explicit save.
 */
export default function PermissionMatrix() {
  const selectedRoleId = usePermissionsStore((s) => s.selectedRoleId);
  const selectRole = usePermissionsStore((s) => s.selectRole);

  return (
    <div className="perm-matrix" dir="rtl">
      <header className="perm-matrix__header">
        <div>
          <h2 className="perm-matrix__title font-meem">ماتریس دسترسی‌ها</h2>
          <p className="perm-matrix__subtitle font-meem">
            تفکیک دسترسی داده، اقدام و مالی — ذخیره فقط با تأیید صریح
          </p>
        </div>

        <label className="perm-role-select font-meem">
          نقش
          <select
            className="perm-role-select__control font-meem"
            value={selectedRoleId}
            onChange={(event) => selectRole(event.target.value)}
          >
            {SECURITY_ROLES.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="perm-matrix__modules">
        {PERMISSIONS_REGISTRY.map((module) => (
          <ModuleCard key={module.moduleId} module={module} />
        ))}
      </div>

      <PermissionsActionBar />
    </div>
  );
}
